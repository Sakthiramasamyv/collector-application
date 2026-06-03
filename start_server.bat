# District Collectorate Multi-Agent Assistance System
# =====================================================
# A RAG + LangChain powered multi-agent application

@echo off
echo ============================================================
echo  District Collectorate Assistance System - Starting Server
echo ============================================================
echo.

cd /d "%~dp0backend"

echo [1/3] Checking Python environment...
python --version
echo.

echo [2/3] Installing dependencies (first run only)...
pip install -r requirements.txt
echo.

echo [3/3] Starting FastAPI backend server...
echo.
echo  Backend API:     http://localhost:8000
echo  API Docs:        http://localhost:8000/docs
echo  Frontend:        Open frontend/index.html in browser
echo.
echo ============================================================
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
