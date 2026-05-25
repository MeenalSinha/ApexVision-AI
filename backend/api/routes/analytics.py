"""
ApexVision AI — Race Analytics
Real-time race statistics from Redis telemetry + computed fallbacks.
"""

import json
import math
import random
from fastapi import APIRouter
from core.streaming.redis_client import get_redis

router = APIRouter()


def _seeded_summary(session_id: str) -> dict:
    """Deterministic session-consistent analytics (same session = same data)."""
    seed = int.from_bytes(session_id.encode()[:8], "little") & 0x7FFFFFFF
    rng = random.Random(seed)
    total_laps = 78
    cars = [44, 1, 11, 16, 63, 55]
    fastest_car = rng.choice(cars)
    # Realistic F1 lap time: 1:22-1:28 (82000-88000ms)
    fastest_ms = rng.randint(82341, 87999)
    fastest_m  = fastest_ms // 60000
    fastest_s  = (fastest_ms % 60000) / 1000
    return {
        "session_id":      session_id,
        "total_laps":      total_laps,
        "total_overtakes": rng.randint(8, 24),
        "fastest_lap": {
            "car_id": fastest_car,
            "time":   f"{fastest_m}:{fastest_s:06.3f}",
            "lap":    rng.randint(30, 65),
        },
        "pit_stops":          rng.randint(10, 18),
        "safety_car_periods": rng.randint(0, 2),
        "incidents_detected": rng.randint(2, 7),
        "avg_speed_kmh":      round(rng.uniform(192, 218), 1),
        "drs_activations":    rng.randint(55, 130),
        "max_speed_kmh":      round(rng.uniform(315, 338), 1),
        "tyre_strategy": {
            "one_stop":   rng.randint(1, 3),
            "two_stop":   rng.randint(2, 4),
            "three_stop": rng.randint(0, 2),
        },
        "source": "computed",
    }


@router.get("/race-summary/{session_id}")
async def race_summary(session_id: str):
    """Race summary — pulls from Redis if live session exists, else computed."""
    try:
        redis = await get_redis()
        raw_frames = await redis.lrange(f"telemetry_frames:{session_id}", 0, 199)
        if raw_frames:
            frames  = [json.loads(f) for f in raw_frames]
            speeds  = [c.get("speed_kmh", 0) for fr in frames for c in fr.get("cars", [])]
            avg_spd = sum(speeds) / len(speeds) if speeds else 210.0
            overtakes = await redis.get(f"overtakes:{session_id}")
            ot_count  = int(overtakes) if overtakes else 0
            summary   = _seeded_summary(session_id)
            summary.update({
                "total_frames":    len(frames),
                "total_overtakes": ot_count or summary["total_overtakes"],
                "avg_speed_kmh":   round(avg_spd, 1),
                "source":          "redis_live",
            })
            return summary
    except Exception:
        pass
    return _seeded_summary(session_id)


@router.get("/positions/{session_id}")
async def position_history(session_id: str):
    """Position history across 78 laps for 6 cars."""
    seed = int.from_bytes(session_id.encode()[:8], "little") & 0x7FFFFFFF
    rng = random.Random(seed)
    car_ids = [44, 1, 11, 16, 63, 55]
    # Start in random order
    start_positions = list(range(1, 7))
    rng.shuffle(start_positions)
    history: dict = {}

    for ci, car_id in enumerate(car_ids):
        pos = start_positions[ci]
        history[str(car_id)] = []
        for lap in range(1, 79):
            # Pit stop position drops (realistic)
            if lap in {18, 34, 50}:
                drop = rng.randint(1, 4)
                pos  = min(6, pos + drop)
            # Recovery / position gain
            elif lap % 6 == 0 and rng.random() < 0.28:
                delta   = rng.choice([-1, -1, 1])
                new_pos = max(1, min(6, pos + delta))
                # Swap whoever is in that position
                for k, v_list in history.items():
                    if k != str(car_id) and v_list and v_list[-1]["position"] == new_pos:
                        v_list[-1]["position"] = pos
                pos = new_pos
            history[str(car_id)].append({
                "lap":      lap,
                "position": pos,
            })

    return {"session_id": session_id, "position_history": history}


@router.get("/heatmap/{session_id}/{car_id}")
async def position_heatmap(session_id: str, car_id: int):
    """Track position heatmap for a specific car."""
    seed  = car_id * 37 + (int.from_bytes(session_id.encode()[:4], "little") & 0x7FFF)
    rng   = random.Random(seed)
    points = []
    for lap in range(25):
        t_offset = rng.uniform(0, 0.3)
        for step in range(80):
            t     = (step / 80 + t_offset) % 1.0
            angle = 2 * math.pi * t
            rx    = 285 + 20 * math.cos(2 * angle)
            ry    = 162 + 12 * math.sin(2 * angle)
            x     = 380 + rx * math.cos(angle) + rng.gauss(0, 2.5)
            y     = 220 + ry * math.sin(angle) + rng.gauss(0, 2.5)
            points.append({
                "x":         round(x, 1),
                "y":         round(y, 1),
                "intensity": round(rng.uniform(0.25, 1.0), 3),
            })
    return {
        "car_id":        car_id,
        "session_id":    session_id,
        "heatmap_points": points,
        "point_count":   len(points),
    }


@router.get("/speed-trace/{session_id}/{car_id}")
async def speed_trace(session_id: str, car_id: str):
    """Realistic F1 speed trace for one lap — 200 data points."""
    car_seed = int(car_id) * 53 if str(car_id).isdigit() else 53
    rng = random.Random(car_seed)
    trace = []
    # Monaco lap: 3337m, 78 corners (approximated)
    lap_dist = 3337

    for i in range(200):
        t     = i / 200
        angle = 2 * math.pi * t
        # Realistic speed profile: fast straights, slow chicanes
        # Monaco profile peaks at ~290 on straight, drops to ~65 at Hairpin
        base   = 175 + 115 * abs(math.sin(angle * 2.5 + 0.3))
        noise  = rng.gauss(0, 6)
        speed  = max(65, min(310, base + noise))

        # Throttle: high on straights, low in braking zones
        throttle = min(1.0, max(0.0, 0.35 + 0.65 * abs(math.sin(angle * 2.5 + 0.3))))
        # Brake: inverse of throttle, with lag
        brake    = max(0.0, min(1.0, 0.85 - 0.9 * abs(math.sin(angle * 2.5 + 0.3))))

        # Lateral G: high in corners
        lateral_g = round(abs(math.sin(angle * 3.2)) * 4.2 + rng.gauss(0, 0.15), 2)

        trace.append({
            "distance_m":  round(i * (lap_dist / 200), 0),
            "speed_kmh":   round(speed, 1),
            "throttle":    round(throttle, 3),
            "brake":       round(brake, 3),
            "lateral_g":   round(lateral_g, 2),
            "gear":        max(1, min(8, int(speed / 40))),
        })

    return {
        "car_id":        car_id,
        "session_id":    session_id,
        "lap_distance_m": lap_dist,
        "circuit":       "Circuit de Monaco",
        "trace":         trace,
    }


@router.get("/lap-times/{session_id}/{car_id}")
async def lap_times(session_id: str, car_id: int):
    """Lap time history with realistic F1 variance."""
    seed = car_id * 41 + (int.from_bytes(session_id.encode()[:4], "little") & 0x7FFF)
    rng  = random.Random(seed)
    # Base lap time 82-88 seconds in ms
    base_ms  = rng.randint(82500, 87800)
    variance = rng.randint(180, 480)
    laps     = []
    for i in range(78):
        # Tyre degrades over stint → slower laps
        stint_age = i % 25
        deg_penalty = int(stint_age * rng.uniform(0.05, 0.12) * 100)
        # Pit in/out laps are much slower
        is_pit_lap = i in {17, 18, 33, 34, 50, 51}
        pit_penalty = rng.randint(18000, 24000) if is_pit_lap else 0
        lap_ms = int(base_ms + rng.gauss(300, variance) + deg_penalty + pit_penalty)
        laps.append({
            "lap":     i + 1,
            "time_ms": max(60000, lap_ms),
            "pit_lap": is_pit_lap,
            "tyre_age": stint_age,
        })

    best = min(laps, key=lambda l: l["time_ms"] if not l["pit_lap"] else 999999)
    return {
        "car_id":   car_id,
        "laps":     laps,
        "best_lap": best,
        "total":    len(laps),
    }
