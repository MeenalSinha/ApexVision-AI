"""
ApexVision AI — Racing Line Analysis
Compares actual driven lines vs ideal using trajectory curvature
"""

import math
import numpy as np
from typing import Dict, List, Tuple, Optional


class RacingLineAnalyzer:
    def __init__(self):
        self._trajectories: Dict[int, List[Tuple[float, float]]] = {}
        self._speed_histories: Dict[int, List[float]] = {}

    def add_position(self, track_id: int, x: float, y: float, speed: float = 0.0):
        buf = self._trajectories.setdefault(track_id, [])
        buf.append((x, y))
        if len(buf) > 500:
            self._trajectories[track_id] = buf[-500:]
        spd = self._speed_histories.setdefault(track_id, [])
        spd.append(speed)
        if len(spd) > 500:
            self._speed_histories[track_id] = spd[-500:]

    def _curvature(self, pts: List[Tuple[float, float]]) -> List[float]:
        arr = np.array(pts, dtype=float)
        result = []
        for i in range(1, len(arr) - 1):
            p0, p1, p2 = arr[i-1], arr[i], arr[i+1]
            cross = abs((p1[0]-p0[0])*(p2[1]-p0[1]) - (p2[0]-p0[0])*(p1[1]-p0[1]))
            d01 = np.linalg.norm(p1-p0)
            d12 = np.linalg.norm(p2-p1)
            d02 = np.linalg.norm(p2-p0)
            denom = d01 * d12 * d02
            result.append(float(2 * cross / denom) if denom > 1e-10 else 0.0)
        return result

    def detect_corners(self, trajectory: List[Tuple[float, float]], threshold: float = 0.008) -> List[Dict]:
        if len(trajectory) < 12:
            return []
        curvs = self._curvature(trajectory)
        corners, in_corner, start, peak_k, peak_i = [], False, 0, 0.0, 0
        for i, k in enumerate(curvs):
            if k > threshold and not in_corner:
                in_corner, start, peak_k, peak_i = True, i, k, i
            elif k > threshold:
                if k > peak_k:
                    peak_k, peak_i = k, i
            elif in_corner:
                in_corner = False
                if i - start >= 4:
                    corners.append({"entry": trajectory[start], "apex": trajectory[peak_i+1], "exit": trajectory[min(i+1, len(trajectory)-1)], "max_curvature": round(peak_k, 6), "start_idx": start, "end_idx": i})
        return corners

    def score_corner(self, corner: Dict, apex_speed: float) -> Dict:
        entry = np.array(corner["entry"])
        apex = np.array(corner["apex"])
        exit_ = np.array(corner["exit"])
        d_entry = float(np.linalg.norm(apex - entry))
        d_exit = float(np.linalg.norm(exit_ - apex))
        ratio = d_entry / max(1.0, d_entry + d_exit)
        score = 100.0
        score -= max(0, (ratio - 0.58) * 60) if ratio > 0.58 else max(0, (0.38 - ratio) * 80)
        if apex_speed < 90:
            score -= (90 - apex_speed) * 0.15
        feedback = []
        if ratio < 0.38:
            feedback.append("Apex too early — brake later and aim for later geometric apex")
        elif ratio > 0.58:
            feedback.append("Apex too late — straighten entry for better exit drive")
        if apex_speed < 90:
            feedback.append(f"Apex speed {apex_speed:.0f}km/h below optimal — review braking point distance")
        return {"score": round(max(0, min(100, score)), 1), "entry_ratio": round(ratio, 3), "apex_speed_kmh": round(apex_speed, 1), "feedback": feedback}

    def analyze_driver(self, track_id: int) -> Dict:
        traj = self._trajectories.get(track_id, [])
        speeds = self._speed_histories.get(track_id, [])
        if len(traj) < 20:
            return {"error": "insufficient_data", "track_id": track_id}
        corners = self.detect_corners(traj)
        scored = []
        for i, c in enumerate(corners[:12]):
            mid = c["start_idx"] + (c["end_idx"] - c["start_idx"]) // 2
            spd = speeds[mid] if mid < len(speeds) else 120.0
            s = self.score_corner(c, spd)
            s["corner_index"] = i + 1
            scored.append(s)
        overall = sum(s["score"] for s in scored) / len(scored) if scored else 72.0
        variance = float(np.var([s["score"] for s in scored])) if len(scored) > 1 else 0.0
        consistency = max(0, 100 - variance * 0.4)
        feedback = list(dict.fromkeys(f for s in scored for f in s.get("feedback", [])))
        return {"track_id": track_id, "overall_score": round(overall, 1), "consistency_score": round(consistency, 1), "corners_analyzed": len(scored), "corner_scores": scored, "recommendations": feedback[:5]}
