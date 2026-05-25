# ApexVision AI

**Real-Time Motorsport Intelligence and Visualization Platform**

IBM SkillsBuild AI Builders Challenge — Grand Prize Submission

---

## What It Does

ApexVision AI is a full-stack AI system that watches motorsport race data in real time and delivers seven integrated intelligence layers simultaneously:

| Module | Technology | Function |
|--------|-----------|----------|
| Vision Tracking | YOLOv8 + ByteTrack + Optical Flow | Car detection, trajectory mapping, overtake detection |
| PitLane Pulse | IBM Granite via Watsonx.ai | Context-aware live race commentary |
| ApexCoach AI | IBM Granite + Racing Line Analysis | Per-corner coaching, braking/throttle optimization |
| SafetyNet AI | Physics Engine + Risk Model | Collision prediction, proximity and closing-rate analysis |
| RaceMind AI | IBM Granite + Tyre Degradation Model | Pit-stop windows, undercut/overcut prediction |
| PitWall-IQ | Docling + ChromaDB + Granite RAG | FIA regulation Q&A with article references |
| AR Visualization | Canvas2D + WebGL | Speed vectors, risk zones, trajectory arcs, tyre indicators |

> "An AI race engineer, strategist, commentator, safety analyst, and coach — unified in one platform."

---

## IBM Technology Integration

**IBM Granite** powers four real-time AI agents: race commentary that maintains narrative continuity across calls, strategy reasoning with confidence-scored recommendations, driver coaching with specific distances and percentages, and regulation compliance analysis with article references and penalty risk assessment.

**Watsonx.ai** provides the inference endpoint. The system uses the IAM token API for authentication with automatic refresh, structured JSON output prompting with schema enforcement, and a physics/rule-based fallback that activates gracefully when credentials are not configured.

**LangFlow** orchestrates the multi-agent pipeline. The `apexvision_pipeline.json` flow wires commentary, strategy, coaching, and regulation agents together with an orchestrator that can run them in parallel.

**Docling** parses FIA regulation PDFs into structured markdown, which is chunked and indexed into ChromaDB. Regulation queries use RAG: ChromaDB retrieves relevant article fragments, IBM Granite synthesises the answer with citation.

---

## Architecture

```
Browser (Next.js 14)
    |
    |-- HTTP/REST ──→ FastAPI Backend (Python 3.11)
    |-- WebSocket ──→ 10Hz race telemetry stream
    |
    FastAPI Backend
    ├── api/routes/        8 route modules
    ├── api/websocket/     Real-time 10Hz stream
    ├── core/vision/       YOLOv8 + ByteTrack + optical flow + racing line
    ├── core/ai/           LangChain agents → IBM Granite via Watsonx.ai
    ├── core/streaming/    Redis client (in-memory fallback)
    └── document_intel/    Docling parser → ChromaDB RAG
    |
    External Services
    ├── IBM Watsonx.ai     Granite LLM inference
    ├── Redis              WebSocket state, commentary cache
    └── PostgreSQL         Session persistence, telemetry log
```

---

## Project Structure

```
apexvision/
├── frontend/                    Next.js 14 + TypeScript + Tailwind
│   └── src/app/
│       ├── page.tsx             Landing page with boot sequence
│       ├── dashboard/           Command center — live AR track view
│       ├── coaching/            ApexCoach AI — real Granite analysis
│       ├── strategy/            RaceMind AI — pit-stop optimization
│       ├── incidents/           SafetyNet AI — live risk map
│       ├── regulation/          PitWall-IQ — RAG chatbot
│       ├── analytics/           Race statistics and speed traces
│       ├── replay/              Replay mode with live AI commentary
│       └── settings/            System status and IBM configuration
│
├── backend/                     FastAPI + Python 3.11
│   ├── main.py
│   ├── config/settings.py
│   ├── api/routes/              8 route modules
│   ├── api/websocket/           10Hz WebSocket streaming
│   ├── core/vision/             tracker, optical_flow, racing_line,
│   │                            overtake_detector, telemetry
│   ├── core/ai/langchain_agents.py   4 IBM Granite agents + orchestrator
│   ├── core/streaming/          Redis client with memory fallback
│   └── services/                Legacy service layer
│
├── document_intelligence/       Docling + ChromaDB RAG
│   └── docling_parser/parser.py
│
├── ai_pipelines/
│   └── langflow/apexvision_pipeline.json
│
├── tests/test_backend.py        12-test suite (all pass)
├── scripts/setup.sh             One-command setup
├── scripts/dev.sh               Development server launcher
├── docker-compose.yml           Full production stack
└── .env.example                 Environment template
```

---

## Quick Start

### Option A — Docker Compose (recommended)

```bash
git clone <repo> && cd apexvision
cp .env.example .env
# Edit .env: add IBM_WATSONX_API_KEY and IBM_PROJECT_ID
docker compose up --build
# Open http://localhost:3000
```

All services start automatically: PostgreSQL, Redis, FastAPI, Next.js, LangFlow, Nginx.

### Option B — Local Development

```bash
chmod +x scripts/setup.sh && ./scripts/setup.sh
# Edit backend/.env: add IBM credentials
chmod +x scripts/dev.sh && ./scripts/dev.sh
```

Access points:
- Dashboard: http://localhost:3000
- API docs:  http://localhost:8000/api/docs
- LangFlow:  http://localhost:7860

### Without IBM Credentials

All AI modules operate in high-fidelity fallback mode. Commentary uses rule-based race state analysis, strategy uses tyre degradation physics, coaching uses corner geometry scoring, and regulation uses a keyword-matched article database. The demo is fully functional without any external API keys.

---

## API Reference

### Core Endpoints

```
GET  /api/health                            System health and module status
GET  /api/status                            Runtime status including Redis and Watsonx

POST /api/vision/upload                     Upload video for YOLOv8 tracking
POST /api/vision/demo/start                 Start demo tracking session
GET  /api/vision/session/{id}/coaching/{n}  Racing line coaching for a car

POST /api/commentary/generate               IBM Granite race commentary
POST /api/commentary/event                  Event-specific commentary

POST /api/coaching/analyze                  IBM Granite driver coaching
GET  /api/coaching/demo/performance/{id}    Demo per-car coaching data
GET  /api/coaching/demo/comparison          All-cars comparison

POST /api/strategy/recommend                IBM Granite strategy recommendation
GET  /api/strategy/demo/all-cars            Strategy for all demo cars
GET  /api/strategy/tyres/degradation        Tyre degradation curves

POST /api/incidents/predict                 Physics-based collision prediction
GET  /api/incidents/demo/live               Live demo incident state

POST /api/regulation/query                  Docling RAG + IBM Granite
POST /api/regulation/upload                 Index a PDF via Docling

GET  /api/analytics/race-summary/{sid}      Race statistics
GET  /api/analytics/positions/{sid}         Position history (78 laps)
GET  /api/analytics/speed-trace/{sid}/{id}  Speed, throttle, brake trace
GET  /api/analytics/heatmap/{sid}/{id}      Position heatmap

GET  /api/demo/full-state                   Complete demo state + AI snapshot

WS   /ws/race/{session_id}                  10Hz race telemetry stream
WS   /ws/commentary/{session_id}            Commentary stream
```

---

## Demo Walkthrough

1. **Landing page** — cinematic boot sequence initialises all 7 AI systems with a progress bar
2. **Dashboard** — six cars orbit Monaco Circuit with real-time AR overlays: speed vectors (cyan lines), braking halos (red rings), DRS indicators (green), tyre compound rings (compound colours)
3. **IBM Granite commentary** — every ~10 seconds the system calls `POST /api/commentary/generate` with the live race state; the response streams into the commentary panel
4. **SafetyNet alerts** — every ~4 seconds `GET /api/incidents/demo/live` is polled; critical alerts appear with red flash animation
5. **Strategy tab** — tyre degradation percentages updated live; physics model shows pit recommendations per car
6. **ApexCoach page** — select any driver; real IBM Granite analysis with per-corner scores, lap time histogram, and coaching recommendations
7. **RaceMind page** — live degradation curves from the backend; safety car toggle triggers `PIT_SAFETY_CAR` recommendations
8. **PitWall-IQ** — RAG chatbot; try "Can the driver legally pit under current safety car conditions?" for a live Docling+Granite answer
9. **Analytics page** — position history SVG chart, speed trace with throttle/brake overlay, tyre strategy breakdown
10. **Replay page** — full race simulation with real-time IBM Granite commentary

---

## Computer Vision Pipeline

The vision stack uses YOLOv8n for detection (auto-downloads on first run) and ByteTrack for multi-object tracking with ID persistence. Optical flow (Lucas-Kanade sparse) enriches each detection with pixel-accurate velocity vectors. The racing line analyser runs Menger curvature on trajectory buffers to detect corners and score apex geometry. The overtake detector tracks position-order changes between frames and classifies each event as clean, aggressive, divebomb, or DRS pass.

When no video is available (demo mode), all modules produce physically accurate synthetic telemetry: cars follow elliptical orbits calibrated to Monaco's 3,337m circuit (1,431 canvas pixels = 3,337m → 2.332 m/px), giving realistic 210 km/h average speeds from 2px/tick at 12.5Hz.

---

## Incident Prediction Physics

SafetyNet AI runs a physics engine on every call:

**Collision risk** = 0.55 × proximity_risk + 0.30 × closing_rate_risk + 0.15 × speed_differential_risk

where:
- proximity_risk = max(0, 1 − distance / 75)
- closing_rate = relative velocity projected onto car-to-car vector (km/h)
- DRS active adds a 15% amplifier

**Tyre stress** = degradation_pct × 0.5 + speed_factor × 0.3 + braking_force × 0.2

Time-to-incident is computed from current distance divided by closing rate when positive.

---

## Scalability

The architecture scales horizontally at every layer. The FastAPI backend supports multiple workers behind Nginx. Redis Streams can replace the in-memory state for distributed WebSocket sessions. YOLOv8 inference moves to a dedicated GPU node using the same REST interface. ChromaDB upgrades to Pinecone or Weaviate for production vector scale. LangFlow's visual pipeline editor allows AI agent reconfiguration without code changes.

---

## Future Roadmap

- Live F1 Timing API integration (official telemetry feeds)
- GPU-accelerated YOLOv8x inference at 60 FPS on race footage
- Multilingual commentary (Spanish, German, Japanese, Mandarin) via Granite multilingual models
- Mobile companion app for race engineers
- 10-year historical race pattern database
- Predictive pit stop timing using fuel load and tyre wear sensors
- Driver biometric integration (steering torque, G-force)
- WebXR augmented reality for stadium broadcast overlay

---

## Test Suite

```bash
cd apexvision/tests
python3 test_backend.py
```

12 tests covering: incident prediction, tyre degradation ordering and curves, racing line analysis, optical flow graceful handling, overtake detection, speed traces, position history, IBM Granite agent fallbacks (commentary, strategy, regulation), and telemetry calibration.

---

*ApexVision AI — IBM SkillsBuild AI Builders Challenge*
*Powered by IBM Granite, Watsonx.ai, LangFlow, Docling, YOLOv8, ByteTrack*
