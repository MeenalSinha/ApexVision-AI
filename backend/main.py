"""
ApexVision AI — Main FastAPI Application
Real-Time Motorsport Intelligence Platform
IBM SkillsBuild AI Builders Challenge
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from api.routes import (
    vision_router, commentary_router, coaching_router,
    strategy_router, incidents_router, regulation_router,
    analytics_router, demo_router,
)
from api.websocket import router as websocket_router
from config.settings import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("apexvision")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ApexVision AI starting...")

    # Create required directories
    for d in [
        settings.UPLOAD_DIR, settings.OUTPUT_DIR,
        "./data/chromadb", "./data/docling_parsed",
        "./data/fia_docs", "./models",
    ]:
        os.makedirs(d, exist_ok=True)

    # Redis (non-fatal)
    try:
        from core.streaming.redis_client import init_redis
        await init_redis()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis unavailable (in-memory fallback active): {e}")

    logger.info(
        "ApexVision AI ready — IBM Granite: %s | Watsonx: %s",
        settings.IBM_GRANITE_MODEL,
        "configured" if settings.IBM_WATSONX_API_KEY else "demo mode",
    )
    yield

    try:
        from core.streaming.redis_client import close_redis
        await close_redis()
    except Exception:
        pass
    logger.info("ApexVision AI shutdown complete")


app = FastAPI(
    title="ApexVision AI",
    description=(
        "Real-Time Motorsport Intelligence & Visualization Platform — "
        "IBM SkillsBuild AI Builders Challenge. "
        "Powered by IBM Granite, Watsonx.ai, LangFlow, Docling, YOLOv8."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Security headers middleware ──────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next: Callable) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"]  = "nosniff"
    response.headers["X-Frame-Options"]          = "SAMEORIGIN"
    response.headers["X-XSS-Protection"]         = "1; mode=block"
    response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]        = "camera=(), microphone=(), geolocation=()"
    # Remove server info
    if "server" in response.headers:
        del response.headers["server"]
    return response


# ── Basic rate limiting middleware ───────────────────────────────────────────
_request_counts: dict = {}
_RATE_WINDOW  = 60   # seconds
_RATE_LIMIT   = 120  # requests per window per IP (generous for demo)

@app.middleware("http")
async def rate_limiter(request: Request, call_next: Callable) -> Response:
    # Skip rate limiting for WebSocket upgrades and health checks
    if request.url.path.startswith("/ws/") or request.url.path == "/api/health":
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_key = f"{client_ip}:{int(now // _RATE_WINDOW)}"

    count = _request_counts.get(window_key, 0) + 1
    _request_counts[window_key] = count

    # Clean old keys periodically
    if len(_request_counts) > 5000:
        cutoff = int(now // _RATE_WINDOW) - 2
        _request_counts.clear()

    if count > _RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after": _RATE_WINDOW},
            headers={"Retry-After": str(_RATE_WINDOW)},
        )
    return await call_next(request)


# ── Request timing middleware ────────────────────────────────────────────────
@app.middleware("http")
async def timing_middleware(request: Request, call_next: Callable) -> Response:
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{elapsed:.1f}ms"
    return response


# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=500)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(vision_router,     prefix="/api/vision",     tags=["Vision Tracking"])
app.include_router(commentary_router, prefix="/api/commentary", tags=["AI Commentary"])
app.include_router(coaching_router,   prefix="/api/coaching",   tags=["Driver Coaching"])
app.include_router(strategy_router,   prefix="/api/strategy",   tags=["Race Strategy"])
app.include_router(incidents_router,  prefix="/api/incidents",  tags=["Incident Prediction"])
app.include_router(regulation_router, prefix="/api/regulation", tags=["Regulation Intelligence"])
app.include_router(analytics_router,  prefix="/api/analytics",  tags=["Race Analytics"])
app.include_router(demo_router,       prefix="/api/demo",       tags=["Demo Mode"])
app.include_router(websocket_router,  prefix="/ws",             tags=["WebSocket"])


# ── Health & Status ───────────────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
async def health():
    return {
        "status":              "operational",
        "service":             "ApexVision AI",
        "version":             "1.0.0",
        "ibm_granite_model":   settings.IBM_GRANITE_MODEL,
        "watsonx_configured":  bool(settings.IBM_WATSONX_API_KEY),
        "modules": {
            "vision_tracking":       "active",
            "ai_commentary":         "active",
            "driver_coaching":       "active",
            "race_strategy":         "active",
            "incident_prediction":   "active",
            "regulation_rag":        "active",
            "ar_visualization":      "active",
        },
    }


@app.get("/api/status", tags=["System"])
async def status():
    redis_ok = False
    try:
        from core.streaming.redis_client import get_redis
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        pass

    return {
        "vision_engine":        "active",
        "commentary_engine":    "active — IBM Granite" if settings.IBM_WATSONX_API_KEY else "active — demo mode",
        "coaching_engine":      "active",
        "strategy_engine":      "active",
        "incident_predictor":   "active",
        "regulation_rag":       "active",
        "ar_overlay":           "active",
        "streaming":            "active",
        "redis":                "connected" if redis_ok else "in-memory fallback",
        "watsonx_configured":   bool(settings.IBM_WATSONX_API_KEY),
        "granite_model":        settings.IBM_GRANITE_MODEL,
        "ibm_iam_endpoint":     "https://iam.cloud.ibm.com",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "name":        "ApexVision AI",
        "description": "Real-Time Motorsport Intelligence Platform",
        "version":     "1.0.0",
        "docs":        "/api/docs",
        "health":      "/api/health",
        "ibm_tech":    ["IBM Granite", "Watsonx.ai", "LangFlow", "Docling"],
    }
