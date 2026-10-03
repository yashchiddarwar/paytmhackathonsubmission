import io
import os
import subprocess
import tempfile
import soundfile as sf
from pathlib import Path
from app.config import WEIGHTS_DIR, KOKORO_MODEL_PATH, KOKORO_VOICES_PATH

kokoro_instance = None
kokoro_failed = False

def get_kokoro():
    """Lazily load Kokoro ONNX model if model and voice files exist."""
    global kokoro_instance, kokoro_failed
    if kokoro_instance is not None:
        return kokoro_instance
    if kokoro_failed:
        return None

    if not KOKORO_MODEL_PATH.exists() or not KOKORO_VOICES_PATH.exists():
        try:
            import sys
            backend_dir = str(WEIGHTS_DIR.parent)
            if backend_dir not in sys.path:
                sys.path.insert(0, backend_dir)
            from download_weights import download_weights
            print("Kokoro weights not found. Auto-downloading...")
            download_weights()
        except Exception as e:
            print(f"Auto-download weights skipped or failed: {e}")

    if KOKORO_MODEL_PATH.exists() and KOKORO_VOICES_PATH.exists():
        try:
            from kokoro_onnx import Kokoro
            kokoro_instance = Kokoro(
                str(KOKORO_MODEL_PATH),
                str(KOKORO_VOICES_PATH)
            )
            print("Kokoro-ONNX TTS initialized successfully.")
            return kokoro_instance
        except Exception as e:
            print(f"Failed to load Kokoro-ONNX: {e}")
            kokoro_failed = True
            return None
    return None

def generate_speech_sapi_fallback(text: str) -> bytes:
    """Windows Speech (SAPI) fallback to generate real, clear WAV speech."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        safe_text = text.replace('"', '""').replace("'", "''").replace("\n", " ")
        ps_script = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('{tmp_path}')
$synth.Speak('{safe_text}')
$synth.Dispose()
"""
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True,
            timeout=15
        )
        if proc.returncode == 0 and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 44:
            with open(tmp_path, "rb") as f:
                data = f.read()
            try:
                os.remove(tmp_path)
            except Exception:
                pass
            return data
    except Exception as e:
        print(f"Windows SAPI TTS fallback error: {e}")

    # Fallback to generating a simple valid WAV chime/beep tone if SAPI is unavailable
    import numpy as np
    sample_rate = 22050
    duration = 1.0
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    # Gentle notification chime (A4 440Hz decaying tone)
    tone = np.sin(2 * np.pi * 440 * t) * np.exp(-3 * t)
    buf = io.BytesIO()
    sf.write(buf, tone, sample_rate, format="WAV")
    return buf.getvalue()

def generate_speech_wav(text: str, voice: str = "af") -> bytes:
    """
    Synthesize text into WAV audio bytes.
    First tries Kokoro-ONNX using available voices; falls back cleanly to local Windows SAPI TTS.
    """
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        cleaned_text = "ClaimEase Audio Engine ready."

    kokoro = get_kokoro()
    if kokoro is not None:
        try:
            available = kokoro.get_voices()
            selected_voice = voice
            if selected_voice not in available:
                if selected_voice == "af_heart" and "af" in available:
                    selected_voice = "af"
                elif "af" in available:
                    selected_voice = "af"
                elif available:
                    selected_voice = available[0]

            samples, sample_rate = kokoro.create(cleaned_text, voice=selected_voice, speed=1.0, lang="en-us")
            buf = io.BytesIO()
            sf.write(buf, samples, sample_rate, format="WAV")
            wav_bytes = buf.getvalue()
            if len(wav_bytes) > 44:
                return wav_bytes
        except Exception as e:
            print(f"Kokoro speech creation note: {e}, using Windows SAPI fallback")

    return generate_speech_sapi_fallback(cleaned_text)
