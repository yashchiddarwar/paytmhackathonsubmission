@echo off
echo ========================================================
echo Starting ClaimEase Autonomous Local Backend
echo Local SQLite + ChromaDB + Ollama + Kokoro TTS
echo ========================================================
cd /d "%~dp0"
call backend\venv\Scripts\activate.bat
python backend\run.py
pause
