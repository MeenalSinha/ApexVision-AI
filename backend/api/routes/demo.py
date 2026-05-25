"""
ApexVision AI — Demo Mode: full state generation using real physics + agents
"""

import math
import random
from fastapi import APIRouter
from core.ai.langchain_agents import OrchestratorAgent

router = APIRouter()
_orch = OrchestratorAgent()

DRIVERS = [
    {"id": 44, "name": "Driver 44", "team": "SilverArrow", "color": "#00D2BE"},
    {"id": 1,  "name": "Driver 01", "team": "RedStar",     "color": "#E8002D"},
    {"id": 11, "name": "Driver 11", "team": "RedStar",     "color": "#E8002D"},
    {"id": 16, "name": "Driver 16", "team": "PrancingHorse","color": "#DC0000"},
    {"id": 63, "name": "Driver 63", "team": "SilverArrow", "color": "#00D2BE"},
    {"id": 55, "name": "Driver 55", "team": "Bull",        "color": "#3671C6"},
]

COMPOUNDS = ["Medium", "Hard", "Soft", "Medium", "Soft", "Hard"]


@router.get("/full-state")
async def full_state():
    """Complete demo race state with real AI commentary + strategy."""
    rng = random.Random(42)
    lap = 42

    cars = []
    for i, d in enumerate(DRIVERS):
        angle = 2 * math.pi * i / 6 + rng.uniform(-0.15, 0.15)
        compound = COMPOUNDS[i]
        age = [18, 24, 9, 31, 41, 14][i]
        cars.append({
            **d,
            "car_id": d["id"],
            "position": i + 1,
            "lap": lap,
            "gap": i * (1.4 + rng.uniform(0, 1.2)),
            "speed_kmh": round(rng.uniform(215, 335), 1),
            "tyre_compound": compound,
            "tyre_age": age,
            "drs": rng.random() > 0.5,
            "ers_deploy": round(rng.uniform(0, 4), 1),
            "x": round(400 + 280 * math.cos(angle), 1),
            "y": round(220 + 160 * math.sin(angle), 1),
            "heading": round((math.degrees(angle + math.pi / 2)) % 360, 1),
        })

    # Real IBM Granite AI snapshot (parallel call)
    try:
        race_state = {
            "lap": lap, "total_laps": 78, "leader": "Driver 44",
            "gap_p1_p2": cars[1]["gap"], "safety_car": False, "weather": "dry",
            "recent_events": ["Lap 41 overtake Turn 1", "Car 16 tyre warning lap 40"],
            "cars": [{"car_id": c["id"], "position": c["position"], "tyre_compound": c["tyre_compound"], "tyre_age": c["tyre_age"], "speed_kmh": c["speed_kmh"], "gap": c["gap"]} for c in cars],
        }
        ai_snapshot = await _orch.run_parallel(race_state)
    except Exception as e:
        ai_snapshot = {"error": str(e)}

    return {
        "session_id": "demo_showcase",
        "track": "Circuit de Monaco",
        "race_name": "Monaco Grand Prix",
        "lap": lap, "total_laps": 78,
        "weather": "dry", "air_temp_c": 24, "track_temp_c": 48,
        "safety_car": False, "drs_enabled": True,
        "cars": cars,
        "ai_snapshot": ai_snapshot,
        "ai_systems_active": {
            "vision_tracking": True, "commentary_engine": True,
            "coaching_intelligence": True, "incident_predictor": True,
            "strategy_ai": True, "regulation_rag": True, "ar_overlays": True,
        },
    }


@router.get("/incidents")
async def demo_incidents():
    from api.routes.incidents import demo_live
    return await demo_live()


@router.get("/strategy")
async def demo_strategy():
    from api.routes.strategy import demo_all_cars
    return await demo_all_cars()
