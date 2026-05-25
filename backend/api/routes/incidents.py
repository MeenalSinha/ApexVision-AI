"""
ApexVision AI — SafetyNet AI: Real Incident Risk Prediction
Physics-based collision prediction with real proximity/closing-rate math
"""

import math
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class CarState(BaseModel):
    car_id: int
    x: float
    y: float
    speed_kmh: float
    heading_deg: float
    acceleration: float = 0.0
    braking_force: float = 0.0
    drs: bool = False
    tyre_age: int = 10
    tyre_compound: str = "Medium"


class IncidentRequest(BaseModel):
    session_id: str
    cars: List[CarState]
    track_context: dict = {}


def _closing_rate(c1: CarState, c2: CarState) -> float:
    """Signed closing rate: positive = approaching, negative = diverging."""
    dx = c2.x - c1.x
    dy = c2.y - c1.y
    dist = max(0.001, math.sqrt(dx**2 + dy**2))
    v1x = c1.speed_kmh * math.cos(math.radians(c1.heading_deg))
    v1y = c1.speed_kmh * math.sin(math.radians(c1.heading_deg))
    v2x = c2.speed_kmh * math.cos(math.radians(c2.heading_deg))
    v2y = c2.speed_kmh * math.sin(math.radians(c2.heading_deg))
    return ((v1x - v2x) * dx + (v1y - v2y) * dy) / dist


def _tyre_stress(car: CarState) -> float:
    """Tyre failure risk from age, compound, speed, and braking."""
    base = {"Soft": 0.034, "Medium": 0.022, "Hard": 0.014}.get(car.tyre_compound, 0.022)
    deg = min(1.0, car.tyre_age * base)
    speed_factor = max(0, (car.speed_kmh - 240) / 80)
    brake_factor = car.braking_force
    return min(1.0, deg * 0.5 + speed_factor * 0.3 + brake_factor * 0.2)


def _collision_risk(c1: CarState, c2: CarState) -> dict:
    dx, dy = c2.x - c1.x, c2.y - c1.y
    dist = math.sqrt(dx**2 + dy**2)
    proximity = max(0.0, 1.0 - dist / 75.0)
    closing = _closing_rate(c1, c2)
    closing_risk = max(0.0, min(1.0, closing / 160.0)) if closing > 0 else 0.0
    speed_diff = abs(c1.speed_kmh - c2.speed_kmh)
    speed_risk = min(1.0, speed_diff / 120.0)
    raw = 0.55 * proximity + 0.30 * closing_risk + 0.15 * speed_risk
    # DRS zone amplifier
    if c1.drs or c2.drs:
        raw = min(1.0, raw * 1.15)
    tti = (dist / (closing / 3.6)) if closing > 1.0 else None
    return {
        "risk": round(min(1.0, raw), 3),
        "distance_px": round(dist, 1),
        "closing_rate_kmh": round(closing, 1),
        "time_to_incident_s": round(tti, 1) if tti and tti > 0 else None,
    }


@router.post("/predict")
async def predict(req: IncidentRequest):
    risk_zones = []
    alerts = []
    max_risk = 0.0

    for i, c1 in enumerate(req.cars):
        for j, c2 in enumerate(req.cars):
            if i >= j:
                continue
            cr = _collision_risk(c1, c2)
            if cr["risk"] > 0.2:
                risk_zones.append({
                    "zone_id": f"col_{c1.car_id}_{c2.car_id}",
                    "risk_level": cr["risk"],
                    "zone_type": "collision",
                    "x": (c1.x + c2.x) / 2,
                    "y": (c1.y + c2.y) / 2,
                    "radius": max(18, cr["distance_px"] * 0.5),
                    "cars_involved": [c1.car_id, c2.car_id],
                    "closing_rate_kmh": cr["closing_rate_kmh"],
                    "time_to_incident_s": cr["time_to_incident_s"],
                    "description": f"Cars {c1.car_id} & {c2.car_id}: {cr['risk']:.0%} collision risk, closing at {cr['closing_rate_kmh']:.0f}km/h",
                })
                max_risk = max(max_risk, cr["risk"])
                if cr["risk"] > 0.65:
                    alerts.append({"level": "CRITICAL", "cars": [c1.car_id, c2.car_id], "risk": cr["risk"], "message": f"CRITICAL: Cars {c1.car_id} & {c2.car_id} — {cr['risk']:.0%} collision risk"})
                elif cr["risk"] > 0.45:
                    alerts.append({"level": "WARNING", "cars": [c1.car_id, c2.car_id], "risk": cr["risk"], "message": f"WARNING: Cars {c1.car_id} & {c2.car_id} — elevated proximity"})

    for car in req.cars:
        ts = _tyre_stress(car)
        if ts > 0.55:
            risk_zones.append({
                "zone_id": f"tyre_{car.car_id}",
                "risk_level": round(ts, 3),
                "zone_type": "tyre_failure",
                "x": car.x, "y": car.y, "radius": 25,
                "cars_involved": [car.car_id],
                "description": f"Car {car.car_id}: tyre stress {ts:.0%} ({car.tyre_compound} age {car.tyre_age}L)",
            })
            max_risk = max(max_risk, ts)
            if ts > 0.7:
                alerts.append({"level": "WARNING", "cars": [car.car_id], "risk": ts, "message": f"Tyre failure risk Car {car.car_id}: {ts:.0%}"})

        # Aggressive maneuver detection
        if car.acceleration > 22:
            ag_risk = min(1.0, (car.acceleration - 22) / 18)
            if ag_risk > 0.3:
                risk_zones.append({
                    "zone_id": f"agg_{car.car_id}",
                    "risk_level": round(ag_risk, 3),
                    "zone_type": "unsafe_maneuver",
                    "x": car.x, "y": car.y, "radius": 22,
                    "cars_involved": [car.car_id],
                    "description": f"Car {car.car_id}: aggressive acceleration {car.acceleration:.0f}m/s²",
                })

    risk_zones.sort(key=lambda z: z["risk_level"], reverse=True)
    return {
        "session_id": req.session_id,
        "overall_risk": round(max_risk, 3),
        "risk_level_label": ("CRITICAL" if max_risk > 0.65 else "HIGH" if max_risk > 0.45 else "ELEVATED" if max_risk > 0.25 else "LOW"),
        "risk_zones": risk_zones[:10],
        "alerts": alerts,
    }


@router.get("/demo/live")
async def demo_live():
    """Generate live demo incident state."""
    import random
    cars = []
    for i in range(6):
        angle = 2 * math.pi * i / 6
        cars.append({
            "car_id": i + 1,
            "x": 400 + 280 * math.cos(angle) + random.uniform(-5, 5),
            "y": 220 + 160 * math.sin(angle) + random.uniform(-5, 5),
            "speed_kmh": random.uniform(185, 310),
            "heading_deg": (math.degrees(angle + math.pi / 2)) % 360,
            "acceleration": random.uniform(-28, 24),
            "braking_force": random.uniform(0, 1),
            "drs": random.random() > 0.6,
            "tyre_age": random.randint(5, 42),
            "tyre_compound": random.choice(["Soft", "Medium", "Hard"]),
        })
    # Force a high-risk scenario for demo
    cars[0]["x"] = cars[1]["x"] + 38
    cars[0]["y"] = cars[1]["y"] + 12
    cars[0]["speed_kmh"] = 268
    cars[1]["speed_kmh"] = 231
    cars[0]["heading_deg"] = cars[1]["heading_deg"] + 5

    req = IncidentRequest(session_id="demo", cars=[CarState(**c) for c in cars])
    return await predict(req)
