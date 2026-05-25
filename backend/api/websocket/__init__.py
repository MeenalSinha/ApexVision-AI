"""
ApexVision AI — WebSocket Streaming
Real-time 10Hz race telemetry with live IBM Granite commentary
"""

import asyncio
import json
import math
import random
import time
from typing import Dict, Set, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self._sessions: Dict[str, Set[WebSocket]] = {}
        self._states: Dict[str, dict] = {}

    async def connect(self, ws: WebSocket, sid: str):
        await ws.accept()
        self._sessions.setdefault(sid, set()).add(ws)

    def disconnect(self, ws: WebSocket, sid: str):
        self._sessions.get(sid, set()).discard(ws)

    async def send(self, ws: WebSocket, data: dict):
        try:
            if ws.client_state == WebSocketState.CONNECTED:
                await ws.send_json(data)
        except Exception:
            pass


manager = ConnectionManager()

# Fallback commentary when Granite is unavailable
FALLBACK_COMMENTARY = [
    ("Car 44 has arrived 14 meters later into Turn 4 — generating overtaking pressure while risking rear tyre instability.", "tactical_pressure", 0.82),
    ("The undercut window is live. Out-lap pace on fresh Mediums is three-tenths faster than anything on track.", "pit_strategy", 0.91),
    ("SafetyNet flags elevated collision probability. Three cars converging in the braking zone simultaneously.", "incident_warning", 0.96),
    ("Sector 2 gap: Car 11 has found 0.4 seconds through the medium-speed complex via later throttle application.", "performance_insight", 0.74),
    ("Tyre degradation alert for Car 16. Rear graining pattern indicates threshold approach in 3 to 4 laps.", "tyre_warning", 0.85),
    ("DRS train forming. Cars 7 and 44 within eight-tenths at the detection point. Overtake probability 72 percent.", "drs_battle", 0.88),
    ("Weather radar: 67 percent rain probability in 18 minutes. RaceMind recommending intermediate preparation.", "weather_strategy", 0.78),
    ("Car 11 has set a new personal best in Sector 2 — the fastest of any car all race on this compound.", "fastest_lap", 0.90),
    ("The gap at the front has compressed to under eight-tenths. We are entering a critical strategic window.", "strategic_battle", 0.86),
    ("Cars 1 and 44 are within DRS range. The closing rate is 12 km/h — an overtake attempt is imminent.", "overtake_attempt", 0.94),
]


def _build_frame(t: float, session_id: str) -> dict:
    state = manager._states.setdefault(session_id, {
        "lap": 25.0, "sc_timer": 0, "safety_car": False, "frame": 0
    })
    state["lap"] = min(78, state["lap"] + 0.005)
    state["sc_timer"] = state.get("sc_timer", 0) + 1
    state["frame"] = state.get("frame", 0) + 1

    if state["sc_timer"] > 600 and random.random() < 0.003:
        state["safety_car"] = True
        state["sc_timer"] = 0
    if state["safety_car"] and state["sc_timer"] > 80:
        state["safety_car"] = False

    teams     = ["RedStar", "SilverArrow", "PrancingHorse", "Bull", "Azure", "Orange"]
    compounds = ["Soft", "Medium", "Hard", "Medium", "Soft", "Hard"]
    car_ids   = [1, 44, 11, 16, 63, 55]

    cars = []
    for i in range(6):
        base  = 2 * math.pi * i / 6
        orbit = 0.008 + (6 - i) * 0.0004
        angle = base + t * orbit
        rx    = 285 + 25 * math.cos(2 * angle)
        ry    = 162 + 18 * math.sin(2 * angle)
        speed = 220 + 80 * abs(math.sin(angle * 2)) + random.gauss(0, 7)
        tyre_age = min(55, 12 + i * 3 + t * 0.04)
        # Degradation-based speed penalty
        compound = compounds[i]
        base_rate = {"Soft": 0.034, "Medium": 0.022, "Hard": 0.014}.get(compound, 0.022)
        deg = min(1.0, tyre_age * base_rate)
        speed_penalty = deg * 12  # max 12km/h loss at full degradation
        adjusted_speed = max(60, speed - speed_penalty)

        cars.append({
            "car_id":       car_ids[i],
            "driver":       f"Driver {car_ids[i]:02d}",
            "team":         teams[i],
            "position":     i + 1,
            "x":            round(380 + rx * math.cos(angle) + random.gauss(0, 1.2), 1),
            "y":            round(220 + ry * math.sin(angle) + random.gauss(0, 1.2), 1),
            "angle":        round((math.atan2(
                                math.sin(angle + 0.08) - math.sin(angle),
                                math.cos(angle + 0.08) - math.cos(angle)
                            ) * 180 / math.pi + 360) % 360, 1),
            "speed_kmh":    round(max(60, adjusted_speed), 1),
            "tyre_compound": compound,
            "tyre_age":     round(tyre_age, 1),
            "tyre_deg_pct": round(deg * 100, 1),
            "gap":          round(i * (1.2 + math.sin(t * 0.1 + i) * 0.5), 3),
            "drs":          math.sin(angle) > 0.42,
            "ers_deploy":   round(max(0, min(4, 2 + math.sin(t * 0.3 + i) * 1.5)), 2),
            "brake":        round(max(0, 0.8 - 0.8 * abs(math.sin(angle * 2))), 3),
            "throttle":     round(min(1, 0.4 + 0.6 * abs(math.sin(angle * 2))), 3),
            "fuel_remaining": round(max(0, 100 - state["lap"] * 1.28), 1),
        })

    return {
        "lap":        round(state["lap"], 2),
        "safety_car": state["safety_car"],
        "cars":       cars,
    }


async def _get_granite_commentary(race_state: dict) -> Optional[dict]:
    """Try to get real IBM Granite commentary; return None on failure."""
    try:
        from core.ai.langchain_agents import CommentaryAgent
        agent = CommentaryAgent()
        result = await asyncio.wait_for(agent.generate(race_state, mode="broadcast"), timeout=8.0)
        if result and result.get("commentary") and "_watsonx_error" not in result:
            return result
    except Exception:
        pass
    return None


@router.websocket("/race/{session_id}")
async def race_stream(ws: WebSocket, session_id: str):
    await manager.connect(ws, session_id)
    await manager.send(ws, {
        "type":       "connected",
        "session_id": session_id,
        "message":    "ApexVision AI stream active — IBM Granite commentary enabled",
    })

    frame           = 0
    fallback_idx    = 0
    t               = 0.0
    granite_task: Optional[asyncio.Task] = None
    last_commentary = time.time()
    COMMENTARY_INTERVAL = 10.0  # seconds between commentary calls

    try:
        while ws.client_state == WebSocketState.CONNECTED:
            t += 0.1
            state = _build_frame(t, session_id)

            # Send telemetry frame
            await manager.send(ws, {
                "type":      "telemetry",
                "frame":     frame,
                "timestamp": time.time(),
                **state,
            })

            # Commentary: try IBM Granite, fall back to curated lines
            now = time.time()
            if now - last_commentary >= COMMENTARY_INTERVAL:
                last_commentary = now
                race_state_for_ai = {
                    "lap":           round(state["lap"]),
                    "total_laps":    78,
                    "leader":        f"Car {state['cars'][0]['car_id']}",
                    "gap_p1_p2":     state["cars"][1]["gap"] if len(state["cars"]) > 1 else 1.8,
                    "safety_car":    state["safety_car"],
                    "weather":       "dry",
                    "recent_events": [],
                    "cars":          [{
                        "car_id":        c["car_id"],
                        "position":      c["position"],
                        "tyre_compound": c["tyre_compound"],
                        "tyre_age":      int(c["tyre_age"]),
                        "tyre_deg_pct":  c["tyre_deg_pct"],
                        "speed_kmh":     c["speed_kmh"],
                        "gap":           c["gap"],
                        "drs":           c["drs"],
                    } for c in state["cars"]],
                }

                # Fire and collect IBM Granite commentary async
                granite_result = await _get_granite_commentary(race_state_for_ai)
                if granite_result:
                    await manager.send(ws, {
                        "type":       "commentary",
                        "text":       granite_result.get("commentary", ""),
                        "excitement": granite_result.get("excitement_level", 0.7),
                        "event_type": granite_result.get("event_type", "general"),
                        "tactical":   granite_result.get("tactical_insight"),
                        "source":     "ibm_granite",
                        "timestamp":  time.time(),
                    })
                else:
                    # Curated fallback lines (high quality, not random)
                    line, etype, excitement = FALLBACK_COMMENTARY[fallback_idx % len(FALLBACK_COMMENTARY)]
                    fallback_idx += 1
                    await manager.send(ws, {
                        "type":       "commentary",
                        "text":       line,
                        "excitement": excitement + random.uniform(-0.03, 0.03),
                        "event_type": etype,
                        "source":     "curated",
                        "timestamp":  time.time(),
                    })

            # Risk alerts every ~4.5 seconds
            if frame % 45 == 0 and random.random() < 0.30:
                cars = state["cars"]
                if len(cars) >= 2:
                    c1, c2 = random.sample(cars[:4], 2)  # Focus on front-runners
                    dist = math.sqrt((c1["x"] - c2["x"])**2 + (c1["y"] - c2["y"])**2)
                    if dist < 70:
                        risk = max(0.3, min(0.95, 1.0 - dist / 70))
                        # Real physics: closing rate
                        speed_diff = abs(c1["speed_kmh"] - c2["speed_kmh"])
                        risk += min(0.2, speed_diff / 200)
                        await manager.send(ws, {
                            "type":        "risk_alert",
                            "risk_level":  round(risk, 2),
                            "cars":        [c1["car_id"], c2["car_id"]],
                            "description": (
                                f"Cars {c1['car_id']} & {c2['car_id']} — "
                                f"{risk:.0%} collision risk, {dist:.0f}px proximity"
                            ),
                            "timestamp":   time.time(),
                        })

            # Pit stop event simulation (realistic timing)
            if frame % 300 == 0 and random.random() < 0.25:
                car = random.choice(state["cars"][1:])  # Not leader
                if car["tyre_deg_pct"] > 55:
                    await manager.send(ws, {
                        "type":     "pit_stop",
                        "car_id":   car["car_id"],
                        "lap":      round(state["lap"]),
                        "old_compound": car["tyre_compound"],
                        "new_compound": random.choice(["Hard", "Medium"]),
                        "timestamp": time.time(),
                    })

            frame += 1
            await asyncio.sleep(0.1)  # 10Hz

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(ws, session_id)


@router.websocket("/commentary/{session_id}")
async def commentary_stream(ws: WebSocket, session_id: str):
    """Dedicated IBM Granite commentary stream."""
    await manager.connect(ws, session_id)
    idx = 0
    try:
        while ws.client_state == WebSocketState.CONNECTED:
            # Try Granite first
            race_state = {
                "lap": 42, "total_laps": 78, "leader": "Car 44",
                "gap_p1_p2": 1.8 + random.uniform(-0.3, 0.3),
                "safety_car": False, "weather": "dry",
                "recent_events": ["Lap 41 overtake Turn 1"],
                "cars": [],
            }
            result = await _get_granite_commentary(race_state)
            if result:
                await manager.send(ws, {
                    "type":       "commentary",
                    "text":       result["commentary"],
                    "excitement": result["excitement_level"],
                    "event_type": result["event_type"],
                    "source":     "ibm_granite",
                    "timestamp":  time.time(),
                })
            else:
                line, etype, excitement = FALLBACK_COMMENTARY[idx % len(FALLBACK_COMMENTARY)]
                await manager.send(ws, {
                    "type":       "commentary",
                    "text":       line,
                    "excitement": excitement,
                    "event_type": etype,
                    "source":     "curated",
                    "timestamp":  time.time(),
                })
            idx += 1
            await asyncio.sleep(9 + random.uniform(0, 5))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws, session_id)
