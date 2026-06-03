"""
RAG Agent - Latest LangChain compatible chatbot with full fallback support
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

PREDEFINED_QA = {
    "complaint": "To file a complaint, go to the **Citizen Portal** tab → **File Complaint**. Fill in your name, phone, address and describe your issue. Our AI agent will auto-categorize it and assign a priority. You'll receive a unique Ticket ID (CMP-XXXX) to track your complaint.",
    "appointment": "To book an appointment, visit **Citizen Portal** → **Book Appointment**. Describe your purpose clearly. Our AI agent detects urgency — urgent cases get a slot within 24 hours, regular cases within 2-3 working days. Appointments are available Tue-Fri, 11AM–5PM.",
    "track": "Enter your Ticket ID (CMP-XXXX) in the **Track Status** tab to see your complaint status, category, priority, and any official response from the Collector's office.",
    "income certificate": "Visit your nearest **Tahsildar office** or **e-Sevai centre** with Aadhaar card, ration card, and bank passbook. Processing takes **7 working days**. You can also apply online at tn.gov.in.",
    "caste certificate": "Apply at the **Tahsildar office** or e-Sevai centre. Required docs: birth certificate, school certificate, parent's caste certificate, Aadhaar. Processing: **15 working days**.",
    "ration card": "Apply at the **Tahsildar office** or e-Sevai centre. Documents: Aadhaar of all family members, family photo, residence proof, income proof. Processing: **30 days**.",
    "scheme": "Coimbatore offers many schemes: **PMAY** (housing), **MGNREGS** (100-day employment), **Kalaignar Magalir Urimai Thittam** (₹1000/month for women heads), **Ayushman Bharat** (₹5 lakh health cover), **NEEDS** (youth entrepreneurship), **Old Age Pension** (₹1000/month). Ask me about any specific scheme!",
    "pension": "**Old Age Pension**: ₹1000/month for eligible senior citizens.\n**Widow Pension**: ₹1000/month for eligible widows.\nApply at the **Tahsildar office** with age proof and Aadhaar card.",
    "bribe": "Report bribery **immediately**! File a corruption complaint on this portal — it gets **CRITICAL priority** and 24-hour response. Also contact:\n- Vigilance & Anti-Corruption Department\n- CM Cell: **1100** (toll-free)\nYour identity is kept strictly confidential.",
    "emergency": "📞 **Emergency Numbers:**\n- Police: **100**\n- Fire: **101**\n- Ambulance: **108**\n- Women Helpline: **181**\n- Childline: **1098**\n- Senior Citizen Helpline: **14567**\n- CM Cell: **1100**\n- District Control Room: **0422-2390111**",
    "working hours": "The Collectorate is open **Monday to Friday, 10:00 AM – 5:45 PM**.\n**Public Grievance Day**: Every Monday, 10 AM – 1 PM (walk-in, no appointment needed).\nRegular appointments: Tue–Fri, 11AM–1PM and 3PM–5PM.\nEmergency: 0422-2390111 (24x7).",
    "thanksgiving": "To send appreciation, go to **Citizen Portal** → **Send Appreciation**. Your message is officially recorded and forwarded to the concerned official and their department head — it positively impacts their performance evaluation!",
    "disability": "Apply for disability certificate at the **District Medical Board** (Government Hospital). Required: medical records, Aadhaar, passport photo. Medical board assessment done. Certificate issued in **30 days**.",
    "patta": "Apply at the **Tahsildar office** with original sale deed, previous Patta, encumbrance certificate, and ID proof. The process takes **30-90 days** depending on complexity.",
    "death certificate": "Apply at the local **Panchayat/Municipality** with hospital death record or doctor's certificate. Issued within **7 days**. Also available from e-Sevai centres.",
    "pmay": "**Pradhan Mantri Awas Yojana (PMAY)** — Housing for All.\n- Beneficiaries: BPL, EWS, LIG families\n- Benefit: Financial assistance for house construction\n- Apply: Nearest CSC or Collectorate\n- Documents: Aadhaar, income certificate, land documents",
    "child labor": "Report child labor immediately by calling **Childline: 1098** or file a complaint on this portal under 'Social Welfare' category. The District Child Labor Inspector responds within **24 hours**.",
    "road": "For road/pothole complaints, file under **Road & Transport** category in the Citizen Portal. Your complaint gets routed to PWD (Public Works Department). HIGH priority complaints get 72-hour response.",
    "water": "For water supply issues, file under **Water Supply** category. Complaints are routed to TWAD Board / Local Body. Drinking water contamination gets CRITICAL priority.",
    "hello": "Hello! 👋 I'm your **District Collectorate AI Assistant** powered by RAG & LangChain.\n\nI can help you with:\n- Filing complaints & tracking status\n- Booking appointments with the Collector\n- Government schemes & welfare programs\n- Certificates & documents\n- Emergency contacts\n\nWhat would you like to know?",
    "hi": "Hello! 👋 I'm your **District Collectorate AI Assistant**. How can I help you today?",
}

PREDEFINED_QUESTIONS = [
    "How to file a complaint?",
    "How to book an appointment?",
    "What government schemes are available?",
    "How to get income certificate?",
    "How to track my complaint?",
    "What are emergency contact numbers?",
    "How to report bribery?",
    "How to apply for pension scheme?",
    "What are collector's working hours?",
    "How to get a ration card?",
]


class RAGAgent:
    def __init__(self, llm=None):
        self.llm = llm
        self.chain = None
        self.chat_history = []

        if llm:
            self._init_rag_chain()

    def _init_rag_chain(self):
        try:
            from rag.knowledge_base import get_retriever
            retriever = get_retriever(k=4)
            if retriever is None:
                return

            from langchain.memory import ConversationBufferWindowMemory
            memory = ConversationBufferWindowMemory(
                memory_key="chat_history",
                output_key="answer",
                return_messages=True,
                k=5
            )

            # Try latest LangChain API
            try:
                from langchain.chains import ConversationalRetrievalChain
                from langchain.prompts import PromptTemplate

                QA_PROMPT = PromptTemplate(
                    input_variables=["context", "chat_history", "question"],
                    template="""You are a helpful AI assistant for the Coimbatore District Collectorate.
Use the context below to answer the citizen's question clearly and concisely (2-4 sentences).
If context doesn't help, use general knowledge about Indian government procedures.

Context: {context}
Chat History: {chat_history}
Question: {question}

Answer:"""
                )

                self.chain = ConversationalRetrievalChain.from_llm(
                    llm=self.llm,
                    retriever=retriever,
                    memory=memory,
                    return_source_documents=True,
                    combine_docs_chain_kwargs={"prompt": QA_PROMPT},
                    verbose=False
                )
                print("[RAG Agent] ✅ ConversationalRetrievalChain initialized")
            except Exception as e:
                print(f"[RAG Agent] ⚠️  Chain init failed: {e}")
        except Exception as e:
            print(f"[RAG Agent] ⚠️  RAG init failed: {e}")

    def _check_predefined(self, question: str):
        q = question.lower().strip()
        # Direct keyword matching
        for key, answer in PREDEFINED_QA.items():
            if key in q:
                return answer
        # Multi-word fuzzy match
        q_words = set(q.split())
        best_match = None
        best_score = 0
        for key in PREDEFINED_QA:
            key_words = set(key.split())
            overlap = len(q_words & key_words)
            if overlap > best_score and overlap >= 1:
                best_score = overlap
                best_match = key
        if best_match and best_score >= 1:
            return PREDEFINED_QA[best_match]
        return None

    def chat(self, question: str) -> dict:
        # Try LangChain RAG chain first
        if self.chain:
            try:
                result = self.chain({"question": question})
                answer = result.get("answer", "").strip()
                sources = list({
                    doc.metadata.get("source", "Knowledge Base")
                    for doc in result.get("source_documents", [])
                })
                if answer:
                    return {"answer": answer, "source": "rag", "sources": sources}
            except Exception as e:
                print(f"[RAG Agent] Chain error: {e}")

        # Predefined Q&A
        predefined = self._check_predefined(question)
        if predefined:
            return {"answer": predefined, "source": "predefined", "sources": []}

        # Similarity search fallback
        try:
            from rag.knowledge_base import similarity_search
            docs = similarity_search(question, k=3)
            if docs:
                context = "\n\n".join(d.page_content for d in docs[:2])[:600]
                return {
                    "answer": f"Based on district knowledge:\n\n{context}\n\n📞 For more help, call the Collectorate: **0422-2390111** (Mon–Fri, 10AM–5:45PM)",
                    "source": "similarity",
                    "sources": []
                }
        except Exception:
            pass

        # Final fallback
        return {
            "answer": "I'm here to help! For this query, please:\n\n"
                      "📞 Call District Control Room: **0422-2390111**\n"
                      "🏛️ Visit Collectorate: Mon–Fri, 10AM–5:45PM\n"
                      "📅 Public Grievance Day: Every Monday, 10AM–1PM\n\n"
                      "You can also file a complaint or request an appointment through this portal.",
            "source": "fallback",
            "sources": []
        }

    def get_predefined_questions(self) -> list:
        return PREDEFINED_QUESTIONS
