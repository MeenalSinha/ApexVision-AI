"""ApexVision AI — Video Processing Utilities"""

import os
from typing import Dict, Any, Optional, Tuple, Generator


def get_video_metadata(video_path: str) -> Dict[str, Any]:
    """Extract metadata from a video file."""
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": "Cannot open video", "path": video_path}
        fps = cap.get(cv2.CAP_PROP_FPS)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        meta = {
            "path": video_path,
            "fps": fps,
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "total_frames": total,
            "duration_s": round(total / max(1, fps), 2),
            "file_size_mb": round(os.path.getsize(video_path) / (1024 * 1024), 2),
        }
        cap.release()
        return meta
    except ImportError:
        return {"error": "OpenCV not available", "path": video_path}
    except Exception as e:
        return {"error": str(e), "path": video_path}


def frame_generator(
    video_path: str,
    skip: int = 1,
    max_frames: Optional[int] = None,
    resize: Optional[Tuple[int, int]] = None,
) -> Generator:
    """Generator that yields (frame_number, frame) tuples from a video file."""
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        n, processed = 0, 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if n % skip == 0:
                if resize:
                    frame = cv2.resize(frame, resize)
                yield n, frame
                processed += 1
                if max_frames and processed >= max_frames:
                    break
            n += 1
        cap.release()
    except Exception:
        return


def draw_ar_overlay(frame, detections: list, track_colors: dict = None):
    """Draw AR overlays — bounding boxes, IDs, speed labels."""
    try:
        import cv2
        output = frame.copy()
        for det in detections:
            bbox = det.get("bbox", [])
            if len(bbox) < 4:
                continue
            x1, y1, x2, y2 = [int(v) for v in bbox]
            tid = det.get("track_id", 0)
            color = (0, 229, 255)
            if track_colors and tid in track_colors:
                color = track_colors[tid]
            cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)
            label = f"#{tid} {det.get('speed_kmh', 0):.0f}km/h"
            cv2.putText(output, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        return output
    except ImportError:
        return frame
