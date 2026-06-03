"""
Main FastAPI Application - District Collectorate Multi-Agent System
Compatible with latest LangChain (0.3+) and Python 3.14
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent))

app = FastAPI(
    title="District Collectorate Assistance System",
    description="Multi-Agent RAG Application for Coimbatore District",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Initialize LLM ──────────────────────────────────────────────
llm = None
groq_key = os.getenv("GROQ_API_KEY", "")
if groq_key and groq_key != "your_groq_api_key_here":
    try:
        from langchain_groq import ChatGroq
        llm = ChatGroq(
            groq_api_key=groq_key,
            model_name="llama3-8b-8192",
            temperature=0.3,
            max_tokens=500,
        )
        print("[Main] ✅ LLM initialized: Groq llama3-8b-8192")
    except Exception as e:
        print(f"[Main] ⚠️  Could not initialize Groq LLM: {e}")
else:
    print("[Main] ℹ️  No GROQ_API_KEY — running in rule-based fallback mode.")

# ─── Initialize Agents ───────────────────────────────────────────
from agents.complaint_agent import ComplaintAgent
from agents.appointment_agent import AppointmentAgent
from agents.collector_agent import CollectorAgent
from agents.rag_agent import RAGAgent

complaint_agent   = ComplaintAgent(llm=llm)
appointment_agent = AppointmentAgent(llm=llm)
collector_agent   = CollectorAgent(llm=llm)
rag_agent         = RAGAgent(llm=llm)

print("[Main] ✅ All agents initialized!")

# ─── Pydantic Models ─────────────────────────────────────────────
class ComplaintRequest(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    description: str
    complaint_type: Optional[str] = "complaint"

class AppointmentRequest(BaseModel):
    name: str
    phone: str
    address: Optional[str] = ""
    purpose: str
    preferred_date: Optional[str] = None

class ThanksgivingRequest(BaseModel):
    name: str
    phone: Optional[str] = ""
    department: str
    message: str

class ChatRequest(BaseModel):
    question: str

class CollectorComplaintResponse(BaseModel):
    ticket_id: str
    status: str
    response: str

class AppointmentResponseModel(BaseModel):
    appointment_id: str
    status: str
    confirmed_date: Optional[str] = ""
    confirmed_time: Optional[str] = ""
    note: Optional[str] = ""

class AnnouncementRequest(BaseModel):
    title: str
    content: str
    announcement_type: str
    collector_name: str

class CollectorLogin(BaseModel):
    password: str

COLLECTOR_PASSWORD = "collector@2024"

# ─── Routes ──────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "District Collectorate Assistance System", "status": "running", "llm": llm is not None}

@app.get("/api/health")
def health():
    return {"status": "healthy", "llm_active": llm is not None, "district": "Coimbatore, Tamil Nadu"}

# ── Citizen ───────────────────────────────────────────────────────

@app.post("/api/complaint/file")
def file_complaint(req: ComplaintRequest):
    if not req.name or not req.phone or not req.description:
        raise HTTPException(400, "Name, phone, and description are required")
    return complaint_agent.file_complaint(
        name=req.name, phone=req.phone, address=req.address,
        description=req.description, complaint_type=req.complaint_type
    )

@app.get("/api/complaint/track/{ticket_id}")
def track_complaint(ticket_id: str):
    return complaint_agent.track_complaint(ticket_id.upper())

@app.post("/api/appointment/request")
def request_appointment(req: AppointmentRequest):
    if not req.name or not req.phone or not req.purpose:
        raise HTTPException(400, "Name, phone, and purpose are required")
    return appointment_agent.request_appointment(
        name=req.name, phone=req.phone, address=req.address,
        purpose=req.purpose, preferred_date=req.preferred_date
    )

@app.post("/api/thanksgiving/submit")
def submit_thanksgiving(req: ThanksgivingRequest):
    if not req.name or not req.message:
        raise HTTPException(400, "Name and message are required")
    return collector_agent.submit_thanksgiving(
        name=req.name, phone=req.phone,
        department=req.department, message=req.message
    )

@app.get("/api/announcements")
def get_announcements():
    return {"announcements": collector_agent.get_announcements()}

@app.post("/api/chat")
def chat(req: ChatRequest):
    if not req.question or len(req.question.strip()) < 2:
        raise HTTPException(400, "Please enter a valid question")
    return rag_agent.chat(req.question)

@app.get("/api/chat/questions")
def get_questions():
    return {"questions": rag_agent.get_predefined_questions()}

# ── Collector ────────────────────────────────────────────────────

@app.post("/api/collector/login")
def collector_login(req: CollectorLogin):
    if req.password == COLLECTOR_PASSWORD:
        return {"success": True, "message": "Login successful", "token": "collector_authenticated"}
    raise HTTPException(401, "Invalid password")

@app.get("/api/collector/complaints")
def get_all_complaints():
    complaints = complaint_agent.get_all_complaints()
    return {"complaints": complaints, "total": len(complaints)}

@app.post("/api/collector/complaint/respond")
def respond_complaint(req: CollectorComplaintResponse):
    complaint_data = complaint_agent.track_complaint(req.ticket_id)
    if complaint_data.get("success"):
        c = complaint_data["complaint"]
        official_resp = collector_agent.generate_official_response(
            complaint_description=c["description"],
            category=c["category"],
            response_note=req.response
        )
    else:
        official_resp = req.response
    return complaint_agent.update_complaint_status(
        ticket_id=req.ticket_id, status=req.status, response=official_resp
    )

@app.get("/api/collector/appointments")
def get_all_appointments():
    appointments = appointment_agent.get_all_appointments()
    return {"appointments": appointments, "total": len(appointments)}

@app.post("/api/collector/appointment/respond")
def respond_appointment(req: AppointmentResponseModel):
    return appointment_agent.respond_to_appointment(
        apt_id=req.appointment_id, status=req.status,
        confirmed_date=req.confirmed_date, confirmed_time=req.confirmed_time,
        note=req.note
    )

@app.get("/api/collector/messages")
def get_messages():
    messages = collector_agent.get_all_messages()
    return {"messages": messages, "total": len(messages)}

@app.post("/api/collector/announce")
def post_announcement(req: AnnouncementRequest):
    return collector_agent.post_announcement(
        title=req.title, content=req.content,
        announcement_type=req.announcement_type, collector_name=req.collector_name
    )

@app.post("/api/collector/message/acknowledge/{message_id}")
def acknowledge_message(message_id: str):
    return collector_agent.acknowledge_message(message_id)

# ─── Startup ─────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("[Startup] Pre-loading RAG knowledge base...")
    try:
        from rag.knowledge_base import build_vectorstore
        build_vectorstore()
        print("[Startup] ✅ RAG knowledge base ready!")
    except Exception as e:
        print(f"[Startup] ⚠️  RAG pre-load skipped: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
