"""
ApexVision AI — ApexCoach AI Driver Coaching
Real IBM Granite coaching analysis
"""

import json
import random
import math
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from core.ai.langchain_agents import CoachingAgent

router = APIRouter()
_agent = CoachingAgent()


class CornerData(BaseModel):
    corner: str
    braking_point_m: float
    throttle_pct: float
    speed_kmh: float
    lateral_g: float
    score: Optional[float] = None


class CoachingRequest(BaseModel):
    session_id: str = "demo"
    car_id: int = 44
    driver: str = "Driver 44"
    lap_count: int = 20
    best_lap_ms: int = 87341
    avg_lap_ms: int = 88100
    variance_ms: int = 340
    max_speed: float = 310
    min_speed: float = 65
    avg_speed: float = 213
    braking_events: int = 24
    aggressive_inputs: int = 6
    corner_data: List[CornerData] = []


@router.post("/analyze")
async def analyze_driver(req: CoachingRequest):
    """Real IBM Granite driver coaching analysis."""
    telemetry = {
        "driver": req.driver,
        "lap_count": req.lap_count,
        "best_lap_ms": req.best_lap_ms,
        "avg_lap_ms": req.avg_lap_ms,
        "variance_ms": req.variance_ms,
        "max_speed": req.max_speed,
        "min_speed": req.min_speed,
        "avg_speed": req.avg_speed,
        "braking_events": req.braking_events,
        "aggressive_inputs": req.aggressive_inputs,
        "corner_data": [c.model_dump() for c in req.corner_data],
    }
    result = await _agent.analyze(telemetry)
    result["car_id"] = req.car_id
    result["session_id"] = req.session_id
    return result


@router.get("/demo/performance/{car_id}")
async def demo_performance(car_id: int):
    """Real Granite coaching analysis for a demo car."""
    rng = random.Random(car_id * 31)
    corners = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]

    corner_data = [
        {
            "corner": c,
            "braking_point_m": rng.uniform(88, 112),
            "throttle_pct": rng.uniform(0.55, 0.98),
            "speed_kmh": rng.uniform(95, 290),
            "lateral_g": rng.uniform(1.2, 4.8),
            "score": rng.uniform(60, 98),
        }
        for c in corners
    ]

    telemetry = {
        "driver": f"Driver {car_id:02d}",
        "lap_count": 20,
        "best_lap_ms": 87200 + rng.randint(-400, 600),
        "avg_lap_ms": 87800 + rng.randint(-200, 800),
        "variance_ms": rng.randint(200, 520),
        "max_speed": rng.uniform(290, 320),
        "min_speed": rng.uniform(58, 80),
        "avg_speed": rng.uniform(200, 225),
        "braking_events": rng.randint(18, 32),
        "aggressive_inputs": rng.randint(2, 12),
        "corner_data": corner_data,
    }

    result = await _agent.analyze(telemetry)

    # Enrich with lap time history for charts
    base_lap = telemetry["best_lap_ms"]
    variance = telemetry["variance_ms"]
    result["lap_times"] = [
        {"lap": i + 1, "time_ms": int(base_lap + rng.gauss(300, variance))}
        for i in range(20)
    ]
    result["sector_scores"] = [
        {"sector": c, "score": cd["score"], "delta": round(rng.uniform(-0.35, 0.25), 3)}
        for c, cd in zip(corners, corner_data)
    ]
    result["corner_data"] = corner_data
    result["car_id"] = car_id
    return result


@router.get("/demo/comparison")
async def demo_comparison():
    """Compare all 6 cars head to head."""
    results = []
    for car_id in [44, 1, 11, 16, 63, 55]:
        rng = random.Random(car_id * 17)
        score = rng.randint(62, 96)
        results.append({
            "car_id": car_id,
            "driver": f"Driver {car_id:02d}",
            "overall_score": score,
            "consistency_score": rng.randint(65, 98),
            "aggression_index": round(rng.uniform(0.35, 0.92), 2),
            "lap_delta_potential": round(rng.uniform(-0.8, -0.1), 2),
            "best_lap_ms": 87200 + rng.randint(0, 1200),
        })
    results.sort(key=lambda x: x["overall_score"], reverse=True)
    return {"comparison": results}
