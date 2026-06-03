"""
Complaint Agent - LangChain-powered agent for complaint processing.
Handles categorization, priority assignment, storage, and status tracking.
"""

import json
import uuid
import random
from datetime import datetime
from pathlib import Path
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

STORAGE_FILE = Path(__file__).parent.parent / "storage" / "complaints.json"

CATEGORIES = [
    "Infrastructure", "Road & Transport", "Water Supply", "Electricity",
    "Land & Revenue", "PDS / Ration", "Corruption", "Social Welfare",
    "Health", "Education", "Environment", "Public Safety", "Other"
]

CATEGORY_PROMPT = PromptTemplate(
    input_variables=["description"],
    template="""You are a government complaint categorization assistant.
Analyze the following complaint and respond with ONLY one category from this list:
Infrastructure, Road & Transport, Water Supply, Electricity, Land & Revenue, 
PDS / Ration, Corruption, Social Welfare, Health, Education, Environment, Public Safety, Other

Complaint: {description}

Category (one word or short phrase only):"""
)

PRIORITY_PROMPT = PromptTemplate(
    input_variables=["description", "category"],
    template="""You are a government complaint priority analyzer.
Based on this complaint, respond with ONLY one word: CRITICAL, HIGH, MEDIUM, or LOW

Rules:
- CRITICAL: Life threatening, corruption, major safety hazard
- HIGH: Affects many people, urgent public need
- MEDIUM: Important but not immediately dangerous
- LOW: Minor inconvenience or suggestion

Category: {category}
Complaint: {description}

Priority (one word only):"""
)


def _load_data():
    if STORAGE_FILE.exists():
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"complaints": []}


def _save_data(data):
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _generate_ticket_id():
    return f"CMP-{random.randint(1000, 9999)}"


class ComplaintAgent:
    def __init__(self, llm=None):
        self.llm = llm
        self.category_chain = LLMChain(llm=llm, prompt=CATEGORY_PROMPT) if llm else None
        self.priority_chain = LLMChain(llm=llm, prompt=PRIORITY_PROMPT) if llm else None

    def _categorize(self, description: str) -> str:
        if self.category_chain:
            try:
                result = self.category_chain.run(description=description).strip()
                for cat in CATEGORIES:
                    if cat.lower() in result.lower():
                        return cat
            except Exception:
                pass
        # Fallback: keyword-based categorization
        desc_lower = description.lower()
        if any(w in desc_lower for w in ["road", "pothole", "bridge", "transport"]):
            return "Road & Transport"
        elif any(w in desc_lower for w in ["water", "drinking", "bore", "well"]):
            return "Water Supply"
        elif any(w in desc_lower for w in ["electricity", "light", "power", "current"]):
            return "Electricity"
        elif any(w in desc_lower for w in ["land", "patta", "encroach", "property"]):
            return "Land & Revenue"
        elif any(w in desc_lower for w in ["ration", "pds", "rice", "kerosene"]):
            return "PDS / Ration"
        elif any(w in desc_lower for w in ["bribe", "corrupt", "illegal", "money"]):
            return "Corruption"
        elif any(w in desc_lower for w in ["hospital", "medicine", "doctor", "health"]):
            return "Health"
        elif any(w in desc_lower for w in ["school", "teacher", "education", "college"]):
            return "Education"
        elif any(w in desc_lower for w in ["pollution", "waste", "environment"]):
            return "Environment"
        return "Other"

    def _assign_priority(self, description: str, category: str) -> str:
        if self.priority_chain:
            try:
                result = self.priority_chain.run(
                    description=description, category=category
                ).strip().upper()
                if result in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                    return result
            except Exception:
                pass
        # Fallback: rule-based priority
        if category == "Corruption":
            return "CRITICAL"
        elif category in ["Water Supply", "Health", "Public Safety"]:
            return "HIGH"
        elif category in ["Road & Transport", "Electricity", "Land & Revenue"]:
            return "MEDIUM"
        return "LOW"

    def file_complaint(self, name: str, phone: str, address: str,
                       description: str, complaint_type: str = "complaint") -> dict:
        """File a new complaint or grievance."""
        category = self._categorize(description)
        priority = self._assign_priority(description, category)
        ticket_id = _generate_ticket_id()

        complaint = {
            "ticket_id": ticket_id,
            "type": complaint_type,
            "name": name,
            "phone": phone,
            "address": address,
            "description": description,
            "category": category,
            "priority": priority,
            "status": "Received",
            "submitted_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "collector_response": None,
            "resolved_at": None
        }

        data = _load_data()
        data["complaints"].append(complaint)
        _save_data(data)

        return {
            "success": True,
            "ticket_id": ticket_id,
            "category": category,
            "priority": priority,
            "message": f"Your complaint has been registered with Ticket ID: {ticket_id}. "
                       f"Category: {category} | Priority: {priority}. "
                       f"Expected response: {'24-48 hours' if priority == 'CRITICAL' else '7-15 working days'}."
        }

    def track_complaint(self, ticket_id: str) -> dict:
        """Track the status of a complaint."""
        data = _load_data()
        for complaint in data["complaints"]:
            if complaint["ticket_id"] == ticket_id:
                return {"success": True, "complaint": complaint}
        return {"success": False, "message": f"No complaint found with Ticket ID: {ticket_id}"}

    def get_all_complaints(self) -> list:
        """Get all complaints (for collector dashboard)."""
        data = _load_data()
        return sorted(data["complaints"], key=lambda x: x["submitted_at"], reverse=True)

    def update_complaint_status(self, ticket_id: str, status: str, response: str) -> dict:
        """Update complaint status with collector's response."""
        data = _load_data()
        for complaint in data["complaints"]:
            if complaint["ticket_id"] == ticket_id:
                complaint["status"] = status
                complaint["collector_response"] = response
                complaint["updated_at"] = datetime.now().isoformat()
                if status in ["Resolved", "Closed"]:
                    complaint["resolved_at"] = datetime.now().isoformat()
                _save_data(data)
                return {"success": True, "message": "Complaint updated successfully"}
        return {"success": False, "message": "Complaint not found"}
