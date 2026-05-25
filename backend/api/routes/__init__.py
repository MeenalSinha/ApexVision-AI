from .vision import router as vision_router
from .commentary import router as commentary_router
from .incidents import router as incidents_router
from .strategy import router as strategy_router
from .coaching import router as coaching_router
from .regulation import router as regulation_router
from .analytics import router as analytics_router
from .demo import router as demo_router

__all__ = [
    "vision_router",
    "commentary_router",
    "incidents_router",
    "strategy_router",
    "coaching_router",
    "regulation_router",
    "analytics_router",
    "demo_router",
]
