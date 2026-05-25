"""
ApexVision AI — RaceMind AI Strategy Intelligence
Real IBM Granite strategy analysis via Watsonx.ai
"""

import json
import math
from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from core.ai.langchain_agents import StrategyAgent

router = APIRouter()
_agent = StrategyAgent()


class CarStrategyInput(BaseModel):
    session_id: str = "demo"
    car_id: int = 44
    position: int = 1
    lap: int = 42
    total_laps: int = 78
    tyre_compound: str = "Medium"
    tyre_age_laps: int = 20
    gap_ahead: Optional[float] = None
    gap_behind: Optional[float] = None
    fuel_remaining_kg: float = 45.0
    pitstops_taken: int = 1
    weather: str = "dry"
    track_temp_c: float = 42.0
    safety_car_active: bool = False
    competitors: List[dict] = []


def _deg(compound: str, age: int, track_temp: float) -> float:
    base = {"Soft": 0.034, "Medium": 0.022, "Hard": 0.014, "Inter": 0.018, "Wet": 0.011}.get(compound, 0.022)
    return min(1.0, age * base * (1 + max(0, (track_temp - 40) / 120)))


@router.post("/recommend")
async def recommend(req: CarStrategyInput):
    """Real IBM Granite strategy recommendation."""
    deg = _deg(req.tyre_compound, req.tyre_age_laps, req.track_temp_c)
    laps_left = req.total_laps - req.lap

    ai_result = await _agent.analyze({
        "position": req.position,
        "lap": req.lap,
        "total_laps": req.total_laps,
        "laps_remaining": laps_left,
        "tyre_compound": req.tyre_compound,
        "tyre_age": req.tyre_age_laps,
        "tyre_degradation_pct": round(deg * 100, 1),
        "gap_ahead": req.gap_ahead,
        "gap_behind": req.gap_behind,
        "fuel_remaining_kg": req.fuel_remaining_kg,
        "pitstops": req.pitstops_taken,
        "weather": req.weather,
        "track_temp": req.track_temp_c,
        "safety_car": req.safety_car_active,
        "competitors": req.competitors[:4],
    })

    ai_result["tyre_degradation_pct"] = round(deg * 100, 1)
    ai_result["car_id"] = req.car_id
    return ai_result


@router.get("/tyres/degradation")
async def tyre_degradation():
    """Tyre degradation curves for visualization (no LLM needed)."""
    compounds = {
        "Soft":   {"rate": 0.034, "color": "#FF2442"},
        "Medium": {"rate": 0.022, "color": "#FFB800"},
        "Hard":   {"rate": 0.014, "color": "#FFFFFF"},
        "Inter":  {"rate": 0.018, "color": "#39B54A"},
        "Wet":    {"rate": 0.011, "color": "#0066FF"},
    }
    curves = {}
    for name, data in compounds.items():
        curves[name] = {
            "color": data["color"],
            "points": [
                {"lap": lap, "degradation": round(min(100, lap * data["rate"] * 100), 1)}
                for lap in range(0, 55)
            ],
        }
    return {"degradation_curves": curves}


@router.get("/demo/all-cars")
async def demo_all_cars():
    """Run real strategy analysis for all demo cars."""
    import random
    demo_cars = [
        {"car_id": 44, "position": 1, "compound": "Medium", "age": 18, "gap_ahead": None, "gap_behind": 2.3, "pitstops": 1},
        {"car_id": 1,  "position": 2, "compound": "Hard",   "age": 24, "gap_ahead": 2.3,  "gap_behind": 2.8, "pitstops": 1},
        {"car_id": 11, "position": 3, "compound": "Soft",   "age": 9,  "gap_ahead": 2.8,  "gap_behind": 4.3, "pitstops": 2},
        {"car_id": 16, "position": 4, "compound": "Medium", "age": 31, "gap_ahead": 4.3,  "gap_behind": 5.4, "pitstops": 1},
        {"car_id": 63, "position": 5, "compound": "Hard",   "age": 41, "gap_ahead": 5.4,  "gap_behind": 7.3, "pitstops": 1},
        {"car_id": 55, "position": 6, "compound": "Soft",   "age": 14, "gap_ahead": 7.3,  "gap_behind": None,"pitstops": 2},
    ]
    results = []
    for car in demo_cars:
        deg = _deg(car["compound"], car["age"], 42.0)
        # Use agent only for lead car; physics model for rest to save API calls
        if car["position"] == 1:
            ai = await _agent.analyze({
                "position": car["position"], "lap": 42, "total_laps": 78, "laps_remaining": 36,
                "tyre_compound": car["compound"], "tyre_age": car["age"],
                "tyre_degradation_pct": round(deg * 100, 1),
                "gap_ahead": car["gap_ahead"], "gap_behind": car["gap_behind"],
                "pitstops": car["pitstops"], "weather": "dry", "track_temp": 42,
                "safety_car": False, "competitors": [],
            })
        else:
            laps_left = 36
            sc = False
            action = "PIT_NOW" if deg > 0.72 else ("PIT_UNDERCUT" if car["gap_ahead"] and car["gap_ahead"] < 25 and deg > 0.44 else "STAY_OUT")
            ai = {
                "action": action,
                "confidence": 0.95 if sc else (0.90 if deg > 0.72 else 0.76),
                "primary_recommendation": f"{action} — {round(deg*100)}% degradation",
                "tyre_recommendation": "Hard" if laps_left > 25 else "Medium",
                "undercut_available": bool(car["gap_ahead"] and car["gap_ahead"] < 25),
                "risk_level": "high" if deg > 0.72 else "medium",
                "reasoning": f"Degradation {round(deg*100)}% with {laps_left} laps remaining.",
            }
        results.append({
            "car_id": car["car_id"], "position": car["position"],
            "tyre_compound": car["compound"], "tyre_age": car["age"],
            "tyre_degradation_pct": round(deg * 100, 1),
            **ai,
        })
    return {"cars": results, "lap": 42, "total_laps": 78}
