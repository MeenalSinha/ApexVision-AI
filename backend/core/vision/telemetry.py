"""
ApexVision AI — Telemetry Extractor
Correctly calibrated speed/acceleration from positional tracking.

Monaco canvas: ~1431px circumference = 3337m real
→ meters_per_pixel = 3337 / 1431 = 2.332 m/px
→ At 80ms simulation tick, 2px displacement = 2 * 2.332 / 0.08 = 58.3 m/s = 210 km/h ✓
"""

import math
from typing import Dict, Any


# Monaco calibration: 1431 canvas-px = 3337 real metres
METERS_PER_PIXEL: float = 3337.0 / 1431.0   # 2.332 m/px
DEFAULT_DT: float = 1.0 / 30.0              # assume 30 fps unless overridden


class TelemetryExtractor:
    """
    Extracts speed, heading, and acceleration from frame-to-frame
    positional deltas of tracked objects.
    """

    def __init__(self, fps: float = 30.0, meters_per_pixel: float = METERS_PER_PIXEL):
        self.fps = fps
        self.dt = 1.0 / fps
        self.mpp = meters_per_pixel
        self._prev: Dict[int, Dict] = {}

    def extract(
        self,
        track_id: int,
        center: list,   # [cx, cy] in canvas pixels
        frame_num: int,
        override_dt: float | None = None,
    ) -> Dict[str, Any]:
        dt = override_dt if override_dt is not None else self.dt
        prev = self._prev.get(track_id)

        speed_kmh = 0.0
        acceleration = 0.0
        heading = 0.0
        braking = False
        throttle_est = 0.0

        if prev is not None:
            dx = center[0] - prev["x"]
            dy = center[1] - prev["y"]
            dist_px = math.sqrt(dx * dx + dy * dy)

            # Convert pixels → metres → m/s → km/h
            dist_m = dist_px * self.mpp
            speed_mps = dist_m / dt
            speed_kmh = speed_mps * 3.6

            heading = math.degrees(math.atan2(dy, dx)) % 360

            prev_speed = prev.get("speed_kmh", 0.0)
            # acceleration in m/s² (speed delta in m/s divided by dt)
            acceleration = ((speed_kmh - prev_speed) / 3.6) / dt

            braking = acceleration < -15.0
            throttle_est = max(0.0, min(1.0, acceleration / 25.0)) if acceleration > 0 else 0.0

        self._prev[track_id] = {
            "x": center[0],
            "y": center[1],
            "frame": frame_num,
            "speed_kmh": speed_kmh,
        }

        return {
            "track_id": track_id,
            "frame": frame_num,
            "x": center[0],
            "y": center[1],
            "speed_kmh": round(speed_kmh, 1),
            "acceleration": round(acceleration, 2),
            "heading_deg": round(heading, 1),
            "braking": braking,
            "throttle_estimate": round(throttle_est, 3),
        }
