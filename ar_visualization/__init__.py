"""
ApexVision AI — AR Visualization Layer
Canvas2D overlay renderer for motorsport intelligence HUD.
"""
from .ar_engine import build_overlay_config, compute_canvas_transform, COLORS, TYRE_COLORS, RISK_COLORS, risk_color

__all__ = [
    "build_overlay_config",
    "compute_canvas_transform",
    "COLORS",
    "TYRE_COLORS",
    "RISK_COLORS",
    "risk_color",
]
