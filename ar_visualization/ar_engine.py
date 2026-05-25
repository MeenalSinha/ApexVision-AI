"""
ApexVision AI — AR Visualization Engine
Canvas2D + WebGL overlay renderer for motorsport intelligence.

This module defines the AR rendering configuration used by the frontend
Canvas2D layer to produce F1 broadcast-quality overlays.
"""

from typing import Dict, List, Any, Tuple, Optional
import math


# ── Color palette (matches frontend CSS variables) ──────────────────────────
COLORS = {
    "accent":  "#00E5FF",
    "red":     "#FF2442",
    "amber":   "#FFB800",
    "green":   "#00FF88",
    "purple":  "#7B61FF",
    "white":   "#FFFFFF",
}

TYRE_COLORS = {
    "Soft":   "#FF2442",
    "Medium": "#FFB800",
    "Hard":   "#FFFFFF",
    "Inter":  "#39B54A",
    "Wet":    "#0066FF",
}

RISK_COLORS = {
    "CRITICAL": "#FF2442",
    "HIGH":     "#FF2442",
    "ELEVATED": "#FFB800",
    "LOW":      "#00FF88",
}


def risk_color(risk: float) -> str:
    """Get overlay color for a risk level 0.0-1.0."""
    if risk >= 0.65:
        return RISK_COLORS["CRITICAL"]
    elif risk >= 0.45:
        return RISK_COLORS["HIGH"]
    elif risk >= 0.25:
        return RISK_COLORS["ELEVATED"]
    return RISK_COLORS["LOW"]


def build_overlay_config(cars: List[Dict], risk_zones: List[Dict] = None) -> Dict[str, Any]:
    """
    Build the complete AR overlay configuration for a frame.
    Returns a dict consumed by the frontend Canvas2D renderer.
    """
    car_overlays = []
    for car in cars:
        cx, cy = car.get("x", 0), car.get("y", 0)
        speed = car.get("speed_kmh", 200)
        heading = car.get("heading_deg", 0)
        compound = car.get("tyre_compound", "Medium")
        brake = car.get("brake", 0)
        drs = car.get("drs", False)
        team = car.get("team", "")

        # Speed vector endpoint
        vlen = (speed / 340) * 40
        rad = math.radians(heading)
        vx = cx + math.cos(rad) * vlen
        vy = cy + math.sin(rad) * vlen

        # Trajectory prediction (10 points)
        trajectory = [
            {
                "x": round(cx + math.cos(rad) * vlen * s / 4, 1),
                "y": round(cy + math.sin(rad) * vlen * s / 4, 1),
            }
            for s in range(11)
        ]

        car_overlays.append({
            "car_id": car.get("car_id", 0),
            "position": car.get("position", 1),
            "cx": round(cx, 1),
            "cy": round(cy, 1),
            "vx": round(vx, 1),
            "vy": round(vy, 1),
            "speed_kmh": round(speed, 1),
            "heading_deg": round(heading, 1),
            "trajectory": trajectory,
            "tyre_color": TYRE_COLORS.get(compound, "#fff"),
            "brake_halo": brake > 0.3,
            "brake_intensity": brake,
            "drs_active": drs,
            "drs_label": "DRS" if drs else None,
            "label_position": f"P{car.get('position', '?')}",
            "speed_label": f"{round(speed)}",
        })

    risk_overlays = []
    for zone in (risk_zones or []):
        r = zone.get("risk_level", 0)
        risk_overlays.append({
            "zone_id": zone.get("zone_id", ""),
            "cx": zone.get("x", 400),
            "cy": zone.get("y", 220),
            "radius": zone.get("radius", 25),
            "risk_level": r,
            "color": risk_color(r),
            "zone_type": zone.get("zone_type", "collision"),
            "description": zone.get("description", ""),
        })

    return {
        "cars": car_overlays,
        "risk_zones": risk_overlays,
        "render_options": {
            "show_trajectories": True,
            "show_speed_vectors": True,
            "show_brake_halos": True,
            "show_drs_labels": True,
            "show_risk_zones": True,
            "show_tyre_rings": True,
            "show_speed_labels": True,
            "show_position_labels": True,
            "trajectory_opacity": 0.35,
            "vector_opacity": 0.9,
            "glow_radius": 15,
        },
    }


def compute_canvas_transform(
    real_x: float,
    real_y: float,
    canvas_width: int,
    canvas_height: int,
    track_width: float = 760.0,
    track_height: float = 440.0,
) -> Tuple[float, float]:
    """Convert real track coordinates to canvas pixel coordinates."""
    cx = (real_x / track_width) * canvas_width
    cy = (real_y / track_height) * canvas_height
    return cx, cy
