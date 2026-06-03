# 🏛️ District Collectorate Assistance System
### Multi-Agent RAG + LangChain Application — Coimbatore District, Tamil Nadu

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 📝 File Complaint | AI categorizes & prioritizes complaints automatically |
| 📅 Book Appointment | Smart scheduling with urgency detection |
| 🙏 Send Appreciation | Thanksgiving messages routed to officials |
| 🤖 AI Chatbot | RAG-powered Q&A using ChromaDB + LangChain |
| 🛡️ Collector Dashboard | Secure portal to manage all submissions |
| 📢 Announcements | Collector broadcasts messages to citizens |

---

## 🏗️ Architecture

```
Multi-Agent System (LangChain)
├── Complaint Agent    → Categorize, prioritize, store complaints
├── Appointment Agent  → Urgency detection, smart scheduling
├── Collector Agent    → Official responses, announcements
└── RAG Agent          → ChromaDB retrieval + conversational Q&A
         │
         ▼
RAG Knowledge Base (ChromaDB + sentence-transformers)
├── district_info.txt       → Collector office info
├── government_schemes.txt  → All welfare schemes
├── complaint_guide.txt     → Complaint process guide
├── appointment_guide.txt   → Appointment booking guide
└── faq.txt                 → 20 frequently asked questions
```

---

## ⚡ Quick Start

### Step 1 — Install Python Dependencies
```bash
cd district-collectorate/backend
pip install -r requirements.txt
```

### Step 2 — (Optional) Set Groq API Key for Full AI
Get a FREE key from https://console.groq.com

Edit `backend/.env`:
```
GROQ_API_KEY=your_key_here
```

> **Without API key**: App works in rule-based fallback mode — still fully functional!

### Step 3 — Start the Backend
```bash
# Option A: Double-click
start_server.bat

# Option B: Command line
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4 — Open the Frontend
```
Open: district-collectorate/frontend/index.html
```

---

## 🔑 Collector Dashboard

**Password**: `collector@2024`

---

## 📁 Project Structure

```
district-collectorate/
├── backend/
│   ├── main.py                  ← FastAPI server (all API endpoints)
│   ├── .env                     ← GROQ_API_KEY goes here
│   ├── requirements.txt
│   ├── agents/
│   │   ├── complaint_agent.py   ← LangChain complaint processing
│   │   ├── appointment_agent.py ← LangChain appointment scheduling
│   │   ├── collector_agent.py   ← Response generation + announcements
│   │   └── rag_agent.py         ← RAG chatbot (ConversationalRetrievalChain)
│   ├── rag/
│   │   ├── knowledge_base.py    ← ChromaDB vector store setup
│   │   └── documents/           ← Knowledge base .txt files
│   └── storage/
│       ├── complaints.json
│       ├── appointments.json
│       ├── messages.json
│       └── announcements.json
├── frontend/
│   ├── index.html               ← Single-page application
│   ├── style.css                ← Dark glassmorphism UI
│   └── app.js                   ← All frontend logic
├── start_server.bat             ← One-click server start
└── README.md
```

---

## 🤖 Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Groq (llama3-8b) / Fallback rule-based |
| **RAG Framework** | LangChain ConversationalRetrievalChain |
| **Vector Store** | ChromaDB (local, persistent) |
| **Embeddings** | sentence-transformers/all-MiniLM-L6-v2 |
| **Backend** | FastAPI + Uvicorn |
| **Frontend** | HTML5 + Vanilla CSS (Glassmorphism) + JS |
| **Storage** | JSON files (no database required) |

---

## 🛠️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/complaint/file` | File a complaint |
| GET | `/api/complaint/track/{id}` | Track complaint |
| POST | `/api/appointment/request` | Request appointment |
| POST | `/api/thanksgiving/submit` | Send appreciation |
| POST | `/api/chat` | AI chatbot query |
| GET | `/api/announcements` | Get announcements |
| POST | `/api/collector/login` | Collector login |
| GET | `/api/collector/complaints` | All complaints |
| POST | `/api/collector/complaint/respond` | Respond to complaint |
| GET | `/api/collector/appointments` | All appointments |
| POST | `/api/collector/appointment/respond` | Respond to appointment |
| GET | `/api/collector/messages` | Get appreciations |
| POST | `/api/collector/announce` | Post announcement |

**Interactive API Docs**: http://localhost:8000/docs

---

## 🎓 Project Info

- **Domain**: Multi-Agent AI + RAG Methodology
- **Framework**: LangChain + FastAPI
- **Application**: E-Governance / District Administration
- **Team**: ECE Department IV Year Project
