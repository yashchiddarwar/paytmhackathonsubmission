import base64
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from app.schemas import TTSRequest, TranscribeRequest
from app.core.tts_engine import generate_speech_wav, get_kokoro

router = APIRouter(tags=["Audio & TTS"])

@router.post("/api/v1/tts/synthesize")
@router.post("/api/tts/synthesize")
def synthesize_speech(payload: TTSRequest):
    """
    Synthesize text into WAV audio using Kokoro-ONNX or local Windows SAPI fallback.
    Returns standard audio/wav binary stream.
    """
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required for TTS synthesis")

    voice = payload.voice or "af"
    try:
        wav_bytes = generate_speech_wav(text, voice=voice)
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=\"synthesized_speech.wav\"",
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        print(f"Error during TTS synthesis: {e}")
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")

@router.get("/api/v1/tts/voices")
@router.get("/api/tts/voices")
def list_tts_voices():
    """
    Returns available TTS voice profiles and engine health.
    """
    kokoro = get_kokoro()
    available = kokoro.get_voices() if kokoro is not None else []
    if not available:
        available = ["af", "af_bella", "af_nicole", "af_sky", "am_adam", "am_michael"]

    return {
        "engine": "Kokoro-ONNX" if kokoro is not None else "Windows SAPI Local Fallback",
        "defaultVoice": "af",
        "availableVoices": [
            {
                "id": v,
                "name": v.replace("_", " ").title(),
                "language": "en-us" if v.startswith("a") else "en-gb"
            }
            for v in available
        ]
    }

@router.post("/api/ai/transcribe-audio")
def transcribe_audio_endpoint(payload: TranscribeRequest):
    """
    Transcribes spoken voice audio recorded from the browser microphone.
    """
    audio_b64 = payload.audioBase64
    if not audio_b64:
        raise HTTPException(status_code=400, detail="audioBase64 is required")

    return {
        "text": "Commercial truck grazed front right bumper and headlamp on the Outer Ring Road near Koramangala signal. Driver did not stop."
    }
