"""
ApexVision AI — PitLane Pulse Commentary Engine
Powered by IBM Granite via Watsonx.ai
"""

import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.ai.langchain_agents import CommentaryAgent
from core.streaming.redis_client import get_redis

router = APIRouter()
_agent = CommentaryAgent()


class RaceStateInput(BaseModel):
    session_id: str
    lap: int = 40
    total_laps: int = 78
    leader: str = "Car 44"
    gap_p1_p2: float = 1.2
    safety_car: bool = False
    weather: str = "dry"
    recent_events: List[str] = []
    cars: List[dict] = []
    mode: str = "broadcast"
    language: str = "en"
    excitement_level: float = 0.7


class EventInput(BaseModel):
    session_id: str
    event_type: str
    lap: int
    car_id: Optional[int] = None
    car_id_2: Optional[int] = None
    details: dict = {}


@router.post("/generate")
async def generate_commentary(req: RaceStateInput):
    """Generate IBM Granite commentary for current race state."""
    race_state = {
        "lap": req.lap,
        "total_laps": req.total_laps,
        "leader": req.leader,
        "gap_p1_p2": req.gap_p1_p2,
        "safety_car": req.safety_car,
        "weather": req.weather,
        "recent_events": req.recent_events,
        "cars": req.cars,
    }
    result = await _agent.generate(race_state, mode=req.mode)

    # Persist to Redis
    try:
        redis = await get_redis()
        await redis.lpush(f"commentary:{req.session_id}", json.dumps(result))
        await redis.ltrim(f"commentary:{req.session_id}", 0, 49)
        await redis.expire(f"commentary:{req.session_id}", 3600)
    except Exception:
        pass

    return result


@router.post("/event")
async def event_commentary(event: EventInput):
    """Generate commentary for a specific race event."""
    race_state = {
        "lap": event.lap,
        "total_laps": 78,
        "recent_events": [f"{event.event_type}: car {event.car_id} {'vs car ' + str(event.car_id_2) if event.car_id_2 else ''}"],
        "cars": [],
        **event.details,
    }
    result = await _agent.generate(race_state)

    try:
        redis = await get_redis()
        await redis.lpush(f"commentary:{event.session_id}", json.dumps(result))
        await redis.ltrim(f"commentary:{event.session_id}", 0, 49)
    except Exception:
        pass

    return result


@router.get("/history/{session_id}")
async def get_history(session_id: str, limit: int = 20):
    try:
        redis = await get_redis()
        raw = await redis.lrange(f"commentary:{session_id}", 0, limit - 1)
        return {"session_id": session_id, "history": [json.loads(r) for r in raw], "count": len(raw)}
    except Exception:
        return {"session_id": session_id, "history": [], "count": 0}


@router.post("/demo/stream")
async def demo_stream():
    """Generate a batch of live commentary lines for demo."""
    import math, random
    demo_state = {
        "lap": 42, "total_laps": 78, "leader": "Car 44", "gap_p1_p2": 1.8,
        "safety_car": False, "weather": "dry",
        "recent_events": ["overtake Turn 1", "Car 16 tyre warning"],
        "cars": [{"car_id": i+1, "position": i+1, "tyre_compound": ["Medium","Hard","Soft","Medium","Soft","Hard"][i], "tyre_age": 10+i*5, "speed_kmh": 280-i*8, "gap": i*1.4} for i in range(6)],
    }
    lines = []
    for mode in ["broadcast", "engineering", "broadcast"]:
        r = await _agent.generate(demo_state, mode=mode)
        lines.append(r)
    return {"commentary_lines": lines}
