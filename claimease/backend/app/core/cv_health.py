import cv2
import numpy as np

def analyze_image_health(image_bytes: bytes) -> dict:
    """
    Deterministically computes image sharpness / blur using the Laplacian variance method.
    Scores above 100 typically represent sharp readable text.
    """
    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return {"blur_score": 0.0, "is_readable": False, "readability": "fail"}
        
        score = float(cv2.Laplacian(img, cv2.CV_64F).var())
        is_readable = score > 100.0
        return {
            "blur_score": round(score, 2),
            "is_readable": is_readable,
            "readability": "pass" if is_readable else "warning"
        }
    except Exception as e:
        return {"blur_score": 0.0, "is_readable": False, "readability": "fail", "error": str(e)}
