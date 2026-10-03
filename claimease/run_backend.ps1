Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting ClaimEase Autonomous Local Backend" -ForegroundColor Green
Write-Host "Local SQLite + ChromaDB + Ollama + Kokoro TTS" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot
& ".\backend\venv\Scripts\python.exe" "backend\run.py"
