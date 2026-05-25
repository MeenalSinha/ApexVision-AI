"""
ApexVision AI — Lap Timer & Sector Analysis
Estimates lap times from positional tracking data using SF line crossings.
"""

import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class LapRecord:
    lap_number: int
    start_time: float
    end_time: Optional[float] = None

    @property
    def lap_time_ms(self) -> Optional[int]:
        if self.end_time is None:
            return None
        return int((self.end_time - self.start_time) * 1000)

    @property
    def is_complete(self) -> bool:
        return self.end_time is not None

    def format(self) -> str:
        ms = self.lap_time_ms
        if ms is None:
            return "--:--.---"
        m = ms // 60000
        s = (ms % 60000) / 1000
        return f"{m}:{s:06.3f}"


class LapTimer:
    """
    Estimates lap times by detecting when a car crosses the start/finish line.
    Uses geometric side-of-line calculation for crossing detection.
    """

    def __init__(self, sf_line: Tuple[float, float, float, float] = (380, 80, 420, 80)):
        self.sf_x1, self.sf_y1, self.sf_x2, self.sf_y2 = sf_line
        self._car_laps: Dict[int, List[LapRecord]] = {}
        self._last_side: Dict[int, int] = {}

    def _side(self, x: float, y: float) -> int:
        lx = self.sf_x2 - self.sf_x1
        ly = self.sf_y2 - self.sf_y1
        cross = lx * (y - self.sf_y1) - ly * (x - self.sf_x1)
        return 1 if cross >= 0 else -1

    def update(self, track_id: int, x: float, y: float, timestamp: float = None) -> Optional[LapRecord]:
        if timestamp is None:
            timestamp = time.time()
        current_side = self._side(x, y)
        last_side = self._last_side.get(track_id, 0)
        self._last_side[track_id] = current_side
        if last_side == 0 or last_side == current_side:
            return None
        # SF line crossing detected
        laps = self._car_laps.setdefault(track_id, [])
        completed = None
        if laps and not laps[-1].is_complete:
            laps[-1].end_time = timestamp
            completed = laps[-1]
        laps.append(LapRecord(lap_number=len(laps) + 1, start_time=timestamp))
        return completed

    def get_lap_times(self, track_id: int) -> List[LapRecord]:
        return self._car_laps.get(track_id, [])

    def get_best_lap(self, track_id: int) -> Optional[LapRecord]:
        completed = [l for l in self._car_laps.get(track_id, []) if l.is_complete]
        return min(completed, key=lambda l: l.lap_time_ms or float("inf")) if completed else None

    def current_lap_number(self, track_id: int) -> int:
        return len(self._car_laps.get(track_id, []))
