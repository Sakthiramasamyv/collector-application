"""
Collector Agent - Manages collector's responses, announcements, and thanksgiving messages.
"""

import json
import random
from datetime import datetime
from pathlib import Path
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

MESSAGES_FILE = Path(__file__).parent.parent / "storage" / "messages.json"
ANNOUNCEMENTS_FILE = Path(__file__).parent.parent / "storage" / "announcements.json"

RESPONSE_PROMPT = PromptTemplate(
    input_variables=["complaint_description", "category", "response_note"],
    template="""You are the District Collector of Coimbatore district, Tamil Nadu.
Write a formal, empathetic, and action-oriented official response to a citizen complaint.
Keep it under 100 words. Be specific about action taken.

Complaint Category: {category}
Complaint: {complaint_description}
Action Taken: {response_note}

Official Response:"""
)


def _load_messages():
    if MESSAGES_FILE.exists():
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"messages": []}


def _save_messages(data):
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _load_announcements():
    if ANNOUNCEMENTS_FILE.exists():
        with open(ANNOUNCEMENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"announcements": []}


def _save_announcements(data):
    with open(ANNOUNCEMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


class CollectorAgent:
    def __init__(self, llm=None):
        self.llm = llm
        self.response_chain = LLMChain(llm=llm, prompt=RESPONSE_PROMPT) if llm else None

    def generate_official_response(self, complaint_description: str,
                                    category: str, response_note: str) -> str:
        """Generate a formal official response using LLM."""
        if self.response_chain:
            try:
                return self.response_chain.run(
                    complaint_description=complaint_description,
                    category=category,
                    response_note=response_note
                ).strip()
            except Exception:
                pass
        return (f"Dear Citizen, Your complaint regarding {category} has been received and reviewed. "
                f"{response_note} We appreciate your patience and commitment to improving our district. "
                f"— District Collector, Coimbatore")

    def submit_thanksgiving(self, name: str, phone: str,
                             department: str, message: str) -> dict:
        """Submit a thanksgiving/appreciation message."""
        msg_id = f"THX-{random.randint(1000, 9999)}"
        msg = {
            "message_id": msg_id,
            "type": "thanksgiving",
            "name": name,
            "phone": phone,
            "department": department,
            "message": message,
            "submitted_at": datetime.now().isoformat(),
            "acknowledged": False
        }
        data = _load_messages()
        data["messages"].append(msg)
        _save_messages(data)
        return {
            "success": True,
            "message_id": msg_id,
            "message": f"Thank you! Your appreciation message (ID: {msg_id}) has been submitted. "
                       f"It will be forwarded to the concerned department."
        }

    def get_all_messages(self) -> list:
        """Get all thanksgiving/messages (for collector dashboard)."""
        data = _load_messages()
        return sorted(data["messages"], key=lambda x: x["submitted_at"], reverse=True)

    def post_announcement(self, title: str, content: str,
                           announcement_type: str, collector_name: str) -> dict:
        """Post an announcement/message from collector to citizens."""
        ann_id = f"ANN-{random.randint(1000, 9999)}"
        announcement = {
            "announcement_id": ann_id,
            "title": title,
            "content": content,
            "type": announcement_type,
            "collector_name": collector_name,
            "posted_at": datetime.now().isoformat(),
            "is_active": True
        }
        data = _load_announcements()
        data["announcements"].append(announcement)
        _save_announcements(data)
        return {
            "success": True,
            "announcement_id": ann_id,
            "message": f"Announcement '{title}' posted successfully."
        }

    def get_announcements(self) -> list:
        """Get all active announcements."""
        data = _load_announcements()
        return sorted(
            [a for a in data["announcements"] if a.get("is_active", True)],
            key=lambda x: x["posted_at"],
            reverse=True
        )

    def acknowledge_message(self, message_id: str) -> dict:
        """Mark a thanksgiving message as acknowledged."""
        data = _load_messages()
        for msg in data["messages"]:
            if msg["message_id"] == message_id:
                msg["acknowledged"] = True
                _save_messages(data)
                return {"success": True, "message": "Message acknowledged"}
        return {"success": False, "message": "Message not found"}
