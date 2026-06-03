"""
Appointment Agent - Manages appointment requests with the District Collector.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

STORAGE_FILE = Path(__file__).parent.parent / "storage" / "appointments.json"

SUMMARY_PROMPT = PromptTemplate(
    input_variables=["purpose"],
    template="""You are an assistant for the District Collector's office.
Summarize this appointment request purpose in ONE concise sentence (max 20 words):

Purpose: {purpose}

Summary:"""
)

URGENCY_PROMPT = PromptTemplate(
    input_variables=["purpose"],
    template="""You are an appointment scheduler for the District Collector.
Based on this appointment request, respond with ONLY one word: URGENT or NORMAL

URGENT: Life-threatening, critical safety, large-scale public issue, time-sensitive legal matter
NORMAL: General grievance, information seeking, project meeting, routine matter

Purpose: {purpose}

Urgency (one word only):"""
)

TIME_SLOTS = [
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"
]


def _load_data():
    if STORAGE_FILE.exists():
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"appointments": []}


def _save_data(data):
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _generate_apt_id():
    return f"APT-{random.randint(1000, 9999)}"


def _suggest_date(is_urgent: bool) -> str:
    """Suggest an appointment date (skip weekends and Monday public day)."""
    base = datetime.now()
    days_ahead = 1 if is_urgent else 3
    candidate = base + timedelta(days=days_ahead)
    # Skip Monday (reserved for public hearing) and weekends
    while candidate.weekday() in [0, 5, 6]:
        candidate += timedelta(days=1)
    return candidate.strftime("%A, %d %B %Y")


class AppointmentAgent:
    def __init__(self, llm=None):
        self.llm = llm
        self.summary_chain = LLMChain(llm=llm, prompt=SUMMARY_PROMPT) if llm else None
        self.urgency_chain = LLMChain(llm=llm, prompt=URGENCY_PROMPT) if llm else None

    def _get_urgency(self, purpose: str) -> str:
        if self.urgency_chain:
            try:
                result = self.urgency_chain.run(purpose=purpose).strip().upper()
                if result in ["URGENT", "NORMAL"]:
                    return result
            except Exception:
                pass
        p = purpose.lower()
        if any(w in p for w in ["urgent", "emergency", "critical", "immediate", "death", "threat"]):
            return "URGENT"
        return "NORMAL"

    def _summarize(self, purpose: str) -> str:
        if self.summary_chain:
            try:
                return self.summary_chain.run(purpose=purpose).strip()
            except Exception:
                pass
        return purpose[:100] + "..." if len(purpose) > 100 else purpose

    def request_appointment(self, name: str, phone: str, address: str,
                            purpose: str, preferred_date: str = None) -> dict:
        """Create a new appointment request."""
        urgency = self._get_urgency(purpose)
        summary = self._summarize(purpose)
        apt_id = _generate_apt_id()
        suggested_date = preferred_date if preferred_date else _suggest_date(urgency == "URGENT")
        suggested_time = random.choice(TIME_SLOTS)

        appointment = {
            "appointment_id": apt_id,
            "name": name,
            "phone": phone,
            "address": address,
            "purpose": purpose,
            "summary": summary,
            "urgency": urgency,
            "preferred_date": preferred_date,
            "suggested_date": suggested_date,
            "suggested_time": suggested_time,
            "status": "Pending Review",
            "collector_note": None,
            "confirmed_date": None,
            "confirmed_time": None,
            "submitted_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        data = _load_data()
        data["appointments"].append(appointment)
        _save_data(data)

        return {
            "success": True,
            "appointment_id": apt_id,
            "urgency": urgency,
            "suggested_date": suggested_date,
            "suggested_time": suggested_time,
            "message": f"Appointment request {apt_id} submitted. "
                       f"Urgency: {urgency}. "
                       f"Suggested slot: {suggested_date} at {suggested_time}. "
                       f"You will be confirmed within {'24 hours' if urgency == 'URGENT' else '2-3 working days'}."
        }

    def get_all_appointments(self) -> list:
        """Get all appointments (for collector dashboard)."""
        data = _load_data()
        return sorted(data["appointments"], key=lambda x: x["submitted_at"], reverse=True)

    def respond_to_appointment(self, apt_id: str, status: str,
                                confirmed_date: str, confirmed_time: str,
                                note: str) -> dict:
        """Collector responds to an appointment request."""
        data = _load_data()
        for apt in data["appointments"]:
            if apt["appointment_id"] == apt_id:
                apt["status"] = status
                apt["collector_note"] = note
                apt["confirmed_date"] = confirmed_date
                apt["confirmed_time"] = confirmed_time
                apt["updated_at"] = datetime.now().isoformat()
                _save_data(data)
                return {"success": True, "message": "Appointment updated successfully"}
        return {"success": False, "message": "Appointment not found"}
