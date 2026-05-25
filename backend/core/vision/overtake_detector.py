"""
ApexVision AI — Overtake Detection
Detects and classifies overtaking maneuvers from position tracking
"""

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import deque


@dataclass
class OvertakeEvent:
    frame: int
    car_overtaking: int
    car_overtaken: int
    position_before: Tuple[int, int]
    position_after: Tuple[int, int]
    location: Tuple[float, float]
    speed_delta: float
    overtake_type: str   # clean | aggressive | divebomb | drs_pass
    confidence: float


class OvertakeDetector:
    """Detects overtaking maneuvers by tracking relative car ordering."""

    def __init__(self):
        self._last_positions: Dict[int, int] = {}
        self._detected_events: List[OvertakeEvent] = []

    def update(self, frame: int, car_states: List[Dict]) -> List[OvertakeEvent]:
        new_events = []
        current = {cs["track_id"]: cs.get("race_position", i + 1) for i, cs in enumerate(car_states)}

        if self._last_positions:
            for tid, new_pos in current.items():
                old_pos = self._last_positions.get(tid)
                if old_pos is None or new_pos >= old_pos:
                    continue
                # tid improved position — find who it passed
                for other, other_new in current.items():
                    if other == tid:
                        continue
                    other_old = self._last_positions.get(other)
                    if other_old is None:
                        continue
                    if other_old <= old_pos and other_new >= new_pos:
                        cs_a = next((c for c in car_states if c["track_id"] == tid), {})
                        cs_b = next((c for c in car_states if c["track_id"] == other), {})
                        delta = cs_a.get("speed_kmh", 200) - cs_b.get("speed_kmh", 200)
                        otype = ("drs_pass" if cs_a.get("drs") and delta > 20
                                 else "divebomb" if delta > 40
                                 else "aggressive" if delta > 15
                                 else "clean")
                        evt = OvertakeEvent(
                            frame=frame, car_overtaking=tid, car_overtaken=other,
                            position_before=(old_pos, other_old),
                            position_after=(new_pos, other_new),
                            location=(cs_a.get("x", 0), cs_a.get("y", 0)),
                            speed_delta=round(delta, 1),
                            overtake_type=otype,
                            confidence=min(1.0, 0.7 + abs(delta) / 100),
                        )
                        new_events.append(evt)
                        self._detected_events.append(evt)

        self._last_positions = dict(current)
        return new_events

    def get_all_events(self) -> List[Dict]:
        return [
            {"frame": e.frame, "car_overtaking": e.car_overtaking, "car_overtaken": e.car_overtaken,
             "position_change": f"P{e.position_before[0]}->P{e.position_after[0]}",
             "location": e.location, "speed_delta_kmh": e.speed_delta,
             "type": e.overtake_type, "confidence": e.confidence}
            for e in self._detected_events
        ]

    def summary(self) -> Dict:
        by_type: Dict[str, int] = {}
        for e in self._detected_events:
            by_type[e.overtake_type] = by_type.get(e.overtake_type, 0) + 1
        return {"total": len(self._detected_events), "by_type": by_type}
