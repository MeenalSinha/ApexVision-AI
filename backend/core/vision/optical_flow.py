"""
ApexVision AI — Optical Flow Engine
Real Lucas-Kanade + Farneback optical flow for motion analysis
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any


class OpticalFlowEngine:
    """
    Lucas-Kanade sparse optical flow + Farneback dense flow for car motion analysis.
    Handles None frames gracefully for simulation mode.
    """

    FEATURE_PARAMS = dict(maxCorners=300, qualityLevel=0.3, minDistance=7, blockSize=7)
    LK_PARAMS = dict(winSize=(15, 15), maxLevel=2, criteria=(3, 10, 0.03))

    def __init__(self, pixels_per_meter: float = 2.0, fps: float = 30.0):
        self.pixels_per_meter = pixels_per_meter
        self.fps = fps
        self._prev_gray: Optional[np.ndarray] = None
        self._prev_points: Optional[np.ndarray] = None
        self._track_velocities: Dict[int, List[float]] = {}

    def reset(self):
        self._prev_gray = None
        self._prev_points = None
        self._track_velocities.clear()

    def process_frame(
        self,
        frame,  # np.ndarray BGR or None (simulation mode)
        detections: List[Dict],
        frame_idx: int,
    ) -> Dict[str, Any]:
        """Compute sparse optical flow. Returns empty result if frame is None."""
        result: Dict[str, Any] = {
            "frame": frame_idx,
            "car_velocities": {},
            "global_flow_magnitude": 0.0,
            "acceleration_events": [],
        }

        if frame is None:
            return result

        try:
            import cv2
        except ImportError:
            result["_cv2_missing"] = True
            return result

        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        except Exception:
            return result

        if self._prev_gray is None or self._prev_points is None or len(self._prev_points) == 0:
            self._prev_points = cv2.goodFeaturesToTrack(gray, mask=None, **self.FEATURE_PARAMS)
            self._prev_gray = gray.copy()
            return result

        try:
            next_pts, status, _ = cv2.calcOpticalFlowPyrLK(
                self._prev_gray, gray, self._prev_points, None, **self.LK_PARAMS
            )
        except Exception:
            self._prev_gray = gray.copy()
            return result

        if next_pts is None or status is None:
            self._prev_gray = gray.copy()
            self._prev_points = cv2.goodFeaturesToTrack(gray, mask=None, **self.FEATURE_PARAMS)
            return result

        good_new = next_pts[status == 1]
        good_old = self._prev_points[status == 1]
        if len(good_new) == 0:
            self._prev_gray = gray.copy()
            self._prev_points = cv2.goodFeaturesToTrack(gray, mask=None, **self.FEATURE_PARAMS)
            return result

        displacements = good_new - good_old
        magnitudes = np.sqrt(displacements[:, 0] ** 2 + displacements[:, 1] ** 2)
        result["global_flow_magnitude"] = float(np.mean(magnitudes))

        import math
        for det in detections:
            tid = det.get("track_id", -1)
            if tid < 0:
                continue
            x1, y1, x2, y2 = det.get("bbox", [0, 0, 100, 100])
            mask = (
                (good_old[:, 0] >= x1) & (good_old[:, 0] <= x2) &
                (good_old[:, 1] >= y1) & (good_old[:, 1] <= y2)
            )
            car_mags = magnitudes[mask]
            if len(car_mags) == 0:
                continue
            car_flow = displacements[mask]
            mean_disp_x = float(np.mean(car_flow[:, 0]))
            mean_disp_y = float(np.mean(car_flow[:, 1]))
            speed_kmh = (float(np.mean(car_mags)) / self.pixels_per_meter) * self.fps * 3.6
            hist = self._track_velocities.setdefault(tid, [])
            hist.append(speed_kmh)
            accel = ((hist[-1] - hist[-2]) / 3.6 * self.fps) if len(hist) >= 2 else 0.0
            if len(hist) > 30:
                self._track_velocities[tid] = hist[-30:]
            if accel < -15.0:
                result["acceleration_events"].append({
                    "track_id": tid, "type": "braking",
                    "magnitude": abs(accel), "frame": frame_idx,
                })
            result["car_velocities"][tid] = {
                "speed_kmh": round(speed_kmh, 1),
                "heading_deg": round(math.degrees(math.atan2(mean_disp_y, mean_disp_x)) % 360, 1),
                "acceleration_ms2": round(accel, 2),
                "is_braking": accel < -15.0,
                "flow_points": int(len(car_mags)),
            }

        self._prev_gray = gray.copy()
        if frame_idx % 10 == 0:
            self._prev_points = cv2.goodFeaturesToTrack(gray, mask=None, **self.FEATURE_PARAMS)
        else:
            self._prev_points = good_new.reshape(-1, 1, 2)

        return result

    def get_flow_visualization(self, frame: np.ndarray) -> np.ndarray:
        if frame is None:
            return frame
        try:
            import cv2
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if self._prev_gray is None:
                self._prev_gray = gray.copy()
                return frame
            flow = cv2.calcOpticalFlowFarneback(
                self._prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
            )
            mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            h, w = frame.shape[:2]
            hsv = np.zeros((h, w, 3), dtype=np.uint8)
            hsv[..., 0] = ang * 180 / np.pi / 2
            hsv[..., 1] = 255
            hsv[..., 2] = cv2.normalize(mag, None, 0, 255, cv2.NORM_MINMAX)
            self._prev_gray = gray.copy()
            return cv2.addWeighted(frame, 0.7, cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR), 0.3, 0)
        except Exception:
            return frame
