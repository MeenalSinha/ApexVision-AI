"""
ApexVision AI — Vision Tracking API
YOLOv8 + ByteTrack with real optical flow enrichment
"""

import uuid, os, json, ast
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from core.vision.tracker import VisionTracker
from core.streaming.redis_client import get_redis
from config.settings import settings

router = APIRouter()
_tracker: Optional[VisionTracker] = None


def get_tracker() -> VisionTracker:
    global _tracker
    if _tracker is None:
        _tracker = VisionTracker(
            model_path=settings.YOLO_MODEL_PATH,
            confidence=settings.YOLO_CONFIDENCE,
            tracker_type=settings.TRACKER_TYPE,
        )
    return _tracker


class SessionResponse(BaseModel):
    session_id: str
    status: str
    car_count: int = 0
    fps: float = 0.0


@router.post("/upload", response_model=SessionResponse)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(400, "Must be a video file")
    session_id = str(uuid.uuid4())
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    path = f"{settings.UPLOAD_DIR}/{session_id}_{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())
    try:
        redis = await get_redis()
        await redis.set(f"session:{session_id}", json.dumps({"status": "uploaded", "video_path": path}), ex=7200)
    except Exception:
        pass
    background_tasks.add_task(_process_video, session_id, path)
    return SessionResponse(session_id=session_id, status="processing")


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    try:
        redis = await get_redis()
        raw = await redis.get(f"session:{session_id}")
        if raw:
            data = json.loads(raw)
            return SessionResponse(session_id=session_id, **{k: data[k] for k in ("status", "car_count", "fps") if k in data})
    except Exception:
        pass
    raise HTTPException(404, "Session not found")


@router.get("/session/{session_id}/frames")
async def get_frames(session_id: str, start: int = 0, end: int = 100):
    try:
        redis = await get_redis()
        raw_list = await redis.lrange(f"frames:{session_id}", start, min(end, start + 99))
        return {"session_id": session_id, "frames": [json.loads(r) for r in raw_list]}
    except Exception:
        return {"session_id": session_id, "frames": []}


@router.get("/session/{session_id}/trajectories")
async def get_trajectories(session_id: str):
    try:
        redis = await get_redis()
        raw = await redis.get(f"trajectories:{session_id}")
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return {"session_id": session_id, "trajectories": {}, "heatmap": []}


@router.get("/session/{session_id}/coaching/{car_id}")
async def get_coaching(session_id: str, car_id: int):
    """Get racing line coaching analysis for a specific car from the tracker."""
    tracker = get_tracker()
    return tracker.get_coaching_analysis(car_id)


@router.post("/demo/start")
async def start_demo():
    """Start a demo tracking session using the real tracker simulation."""
    import math, random
    session_id = "demo_" + str(uuid.uuid4())[:8]
    tracker = get_tracker()
    # Generate several simulated frames to populate the tracker state
    for frame_num in range(60):
        await tracker.process_frame(None, session_id, frame_num)

    try:
        redis = await get_redis()
        await redis.set(f"session:{session_id}", json.dumps({"status": "demo_active", "car_count": 6, "fps": 30.0}), ex=3600)
    except Exception:
        pass

    return {"session_id": session_id, "status": "demo_active", "car_count": 6, "track": "Circuit de Monaco", "lap_count": 78}


async def _process_video(session_id: str, path: str):
    """Background: process uploaded video through real YOLOv8 tracker."""
    tracker = get_tracker()
    try:
        redis = await get_redis()
        result = await tracker.process_video(path, session_id)
        await redis.set(f"session:{session_id}", json.dumps({"status": "complete", "car_count": result.get("car_count", 0), "fps": result.get("fps", 30)}), ex=7200)
    except Exception as e:
        try:
            redis = await get_redis()
            await redis.set(f"session:{session_id}", json.dumps({"status": "error", "error": str(e)}), ex=3600)
        except Exception:
            pass
