import os
import urllib.request
from pathlib import Path

WEIGHTS_DIR = Path(__file__).resolve().parent / "weights"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

FILES = {
    "kokoro-v0_19.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.onnx",
    "voices.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.bin"
}

def download_weights():
    print(f"Ensuring model weights in {WEIGHTS_DIR}...")
    for filename, url in FILES.items():
        dest = WEIGHTS_DIR / filename
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"  [OK] {filename} already exists ({dest.stat().st_size / (1024*1024):.1f} MB)")
            continue
        print(f"  [DOWNLOADING] {filename} from {url}...")
        try:
            urllib.request.urlretrieve(url, dest)
            print(f"  [COMPLETED] {filename} saved successfully.")
        except Exception as e:
            print(f"  [ERROR] Failed to download {filename}: {e}")

if __name__ == "__main__":
    download_weights()
