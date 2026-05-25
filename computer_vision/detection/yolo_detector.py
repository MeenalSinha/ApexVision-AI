"""
ApexVision AI — YOLOv8 Vehicle Detector
Motorsport-optimized car detection pipeline.
"""

from pathlib import Path
from typing import List, Dict, Any

# COCO class IDs for vehicles
VEHICLE_CLASSES = {2: "car", 5: "bus", 7: "truck"}


class YOLOv8Detector:
    """YOLOv8-based vehicle detector for motorsport footage."""

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence: float = 0.45,
        iou_threshold: float = 0.45,
        imgsz: int = 640,
    ):
        self.model_path = model_path
        self.confidence = confidence
        self.iou_threshold = iou_threshold
        self.imgsz = imgsz
        self._model = None
        self._initialized = False

    def _init(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            from ultralytics import YOLO
            path = str(self.model_path) if Path(self.model_path).exists() else "yolov8n.pt"
            self._model = YOLO(path)
        except Exception:
            self._model = None

    def detect(self, frame) -> List[Dict[str, Any]]:
        """Run YOLOv8 inference. Returns [{bbox, confidence, class_id, class_name}]"""
        self._init()
        if frame is None or self._model is None:
            return []
        try:
            results = self._model(
                frame,
                conf=self.confidence,
                iou=self.iou_threshold,
                classes=list(VEHICLE_CLASSES.keys()),
                verbose=False,
            )
            detections = []
            if results and results[0].boxes is not None:
                for box in results[0].boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cls_id = int(box.cls[0])
                    if cls_id not in VEHICLE_CLASSES:
                        continue
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": round(float(box.conf[0]), 3),
                        "class_id": cls_id,
                        "class_name": VEHICLE_CLASSES[cls_id],
                        "area": (x2 - x1) * (y2 - y1),
                    })
            return detections
        except Exception:
            return []

    @property
    def is_available(self) -> bool:
        self._init()
        return self._model is not None
