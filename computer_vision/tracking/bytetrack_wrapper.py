"""
ApexVision AI — ByteTrack Integration Wrapper
Wraps Ultralytics ByteTrack for motorsport multi-car tracking.
"""
from typing import List, Dict


class ByteTrackWrapper:
    """ByteTrack multi-object tracker configured for motorsport car detection."""

    TRACK_THRESH = 0.25
    TRACK_BUFFER = 30
    MATCH_THRESH = 0.8
    FRAME_RATE = 30

    def __init__(self):
        self._tracker = None
        self._initialized = False
        self._track_history: Dict[int, List[Dict]] = {}

    def _init(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            from ultralytics.trackers.byte_tracker import BYTETracker
            import argparse
            args = argparse.Namespace(
                track_thresh=self.TRACK_THRESH,
                track_buffer=self.TRACK_BUFFER,
                match_thresh=self.MATCH_THRESH,
                mot20=False,
            )
            self._tracker = BYTETracker(args, frame_rate=self.FRAME_RATE)
        except Exception:
            self._tracker = None

    def update(self, detections: List[Dict], frame_shape: tuple) -> List[Dict]:
        """Update tracker with new detections. Returns tracked objects with persistent IDs."""
        self._init()
        if self._tracker is None or not detections:
            return self._passthrough(detections)
        try:
            import numpy as np
            det_array = np.array([
                [d["bbox"][0], d["bbox"][1], d["bbox"][2], d["bbox"][3],
                 d["confidence"], d.get("class_id", 2)]
                for d in detections
            ], dtype=np.float32)
            online_targets = self._tracker.update(det_array, frame_shape, frame_shape)
            results = []
            for t in online_targets:
                x1, y1, w, h = t.tlwh
                cx, cy = x1 + w / 2, y1 + h / 2
                results.append({
                    "track_id": t.track_id,
                    "bbox": [x1, y1, x1 + w, y1 + h],
                    "center": [cx, cy],
                    "score": t.score,
                })
                hist = self._track_history.setdefault(t.track_id, [])
                hist.append({"x": cx, "y": cy})
                if len(hist) > 500:
                    self._track_history[t.track_id] = hist[-500:]
            return results
        except Exception:
            return self._passthrough(detections)

    def _passthrough(self, detections: List[Dict]) -> List[Dict]:
        return [
            {
                "track_id": i + 1,
                "bbox": d.get("bbox", [0, 0, 100, 100]),
                "center": [
                    (d["bbox"][0] + d["bbox"][2]) / 2,
                    (d["bbox"][1] + d["bbox"][3]) / 2,
                ] if "bbox" in d else [50, 50],
                "score": d.get("confidence", 0.9),
            }
            for i, d in enumerate(detections)
        ]

    def get_trajectory(self, track_id: int) -> List[Dict]:
        return self._track_history.get(track_id, [])

    def get_all_trajectories(self) -> Dict[int, List[Dict]]:
        return dict(self._track_history)

    @property
    def active_track_ids(self) -> List[int]:
        return list(self._track_history.keys())
