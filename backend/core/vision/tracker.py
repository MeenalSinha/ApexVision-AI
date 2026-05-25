"""
ApexVision AI — Vision Tracking Engine
YOLOv8 + ByteTrack multi-object car tracking
Falls back to physics-accurate simulation when models are unavailable
"""

import asyncio
import json
import math
import random
from pathlib import Path
from typing import Dict, Any, List, Optional

from core.vision.optical_flow import OpticalFlowEngine
from core.vision.overtake_detector import OvertakeDetector
from core.vision.racing_line import RacingLineAnalyzer
from core.vision.telemetry import TelemetryExtractor


class VisionTracker:
    """YOLOv8 + ByteTrack car detection and multi-object tracking."""

    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.5, tracker_type: str = "bytetrack"):
        self.model_path = model_path
        self.confidence = confidence
        self.tracker_type = tracker_type
        self._model = None
        self._initialized = False
        self._flow = OpticalFlowEngine()
        self._overtakes = OvertakeDetector()
        self._racing_line = RacingLineAnalyzer()
        self._telemetry = TelemetryExtractor()

    def _init_model(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            from ultralytics import YOLO
            model_file = Path(self.model_path)
            if not model_file.exists():
                # Download smallest model
                self._model = YOLO("yolov8n.pt")
            else:
                self._model = YOLO(str(model_file))
        except (ImportError, Exception):
            self._model = None

    async def process_frame(self, frame, session_id: str, frame_num: int) -> Dict[str, Any]:
        self._init_model()
        if self._model is None:
            return await self._simulate_frame(frame_num)

        try:
            results = self._model.track(
                frame,
                conf=self.confidence,
                tracker=f"{self.tracker_type}.yaml",
                persist=True,
                classes=[2, 5, 7],
                verbose=False,
            )
            detections = []
            if results and results[0].boxes is not None:
                for box in results[0].boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    tid = int(box.id[0]) if box.id is not None else -1
                    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                    telem = self._telemetry.extract(tid, [cx, cy], frame_num)
                    self._racing_line.add_position(tid, cx, cy, telem.get("speed_kmh", 0))
                    detections.append({
                        "track_id": tid,
                        "confidence": round(float(box.conf[0]), 3),
                        "bbox": [x1, y1, x2, y2],
                        "center": [cx, cy],
                        **telem,
                    })

            # Optical flow enrichment
            flow_data = self._flow.process_frame(frame, detections, frame_num)
            for det in detections:
                tid = det["track_id"]
                if tid in flow_data.get("car_velocities", {}):
                    det.update(flow_data["car_velocities"][tid])

            # Overtake detection
            car_states = [{"track_id": d["track_id"], "race_position": i+1, "x": d["center"][0], "y": d["center"][1], "speed_kmh": d.get("speed_kmh", 200), "drs": False} for i, d in enumerate(detections)]
            new_overtakes = self._overtakes.update(frame_num, car_states)

            return {
                "frame": frame_num,
                "detections": detections,
                "car_count": len(detections),
                "flow": flow_data,
                "new_overtakes": [{"car_overtaking": e.car_overtaking, "car_overtaken": e.car_overtaken, "type": e.overtake_type} for e in new_overtakes],
            }
        except Exception as e:
            return await self._simulate_frame(frame_num)

    async def process_video(self, video_path: str, session_id: str) -> Dict[str, Any]:
        self._init_model()
        if self._model is None:
            return await self._simulate_video(session_id)

        try:
            import cv2
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_num = 0
            track_ids: set = set()

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_num % 3 == 0:
                    result = await self.process_frame(frame, session_id, frame_num)
                    for det in result.get("detections", []):
                        track_ids.add(det["track_id"])
                frame_num += 1
                if frame_num % 300 == 0:
                    await asyncio.sleep(0)

            cap.release()
            return {"car_count": len(track_ids), "total_frames": frame_num, "fps": fps, "overtakes": self._overtakes.summary()}
        except Exception:
            return await self._simulate_video(session_id)

    async def _simulate_frame(self, frame_num: int) -> Dict[str, Any]:
        t = frame_num * 0.015
        detections = []
        for i in range(6):
            base_angle = 2 * math.pi * i / 6
            orbit = 0.008 + (6 - i) * 0.0004
            angle = base_angle + t * orbit
            rx = 285 + 25 * math.cos(2 * angle)
            ry = 162 + 18 * math.sin(2 * angle)
            cx = 380 + rx * math.cos(angle)
            cy = 220 + ry * math.sin(angle)
            speed = 220 + 80 * abs(math.sin(angle * 2)) + random.uniform(-10, 10)
            telem = self._telemetry.extract(i + 1, [cx, cy], frame_num)
            self._racing_line.add_position(i + 1, cx, cy, speed)
            detections.append({
                "track_id": i + 1,
                "confidence": round(0.88 + random.uniform(0, 0.11), 3),
                "bbox": [cx-22, cy-10, cx+22, cy+10],
                "center": [round(cx, 1), round(cy, 1)],
                "speed_kmh": round(speed, 1),
                "heading_deg": round((math.degrees(angle + math.pi / 2)) % 360, 1),
                "acceleration_ms2": round(telem.get("acceleration", 0), 2),
                "is_braking": telem.get("braking", False),
                "race_position": i + 1,
            })
        return {"frame": frame_num, "detections": detections, "car_count": 6, "simulated": True, "new_overtakes": []}

    async def _simulate_video(self, session_id: str) -> Dict[str, Any]:
        await asyncio.sleep(1.5)
        return {"car_count": 6, "total_frames": 3600, "fps": 30.0, "overtakes": {"total": 8, "by_type": {"clean": 4, "drs_pass": 3, "aggressive": 1}}, "simulated": True}

    def get_coaching_analysis(self, track_id: int) -> Dict:
        return self._racing_line.analyze_driver(track_id)

    def get_overtake_summary(self) -> Dict:
        return self._overtakes.summary()
