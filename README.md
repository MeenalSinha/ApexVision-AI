# ApexVision AI

**Real-Time Motorsport Intelligence and Visualization Platform**

IBM SkillsBuild AI Builders Challenge — Grand Prize Submission

---

## Project Overview

ApexVision AI is a production-ready, full-stack AI system that analyzes motorsport race data in real time, delivering seven integrated intelligence layers simultaneously.

| Module | Technology | Function |
|--------|-----------|----------|
| **Vision Tracking** | YOLOv8 + ByteTrack + Optical Flow | Car detection, trajectory mapping, overtake detection |
| **PitLane Pulse** | IBM Granite via Watsonx.ai | Context-aware live race commentary |
| **ApexCoach AI** | IBM Granite + Racing Line Analysis | Per-corner coaching, braking/throttle optimization |
| **SafetyNet AI** | Physics Engine + Risk Model | Collision prediction, proximity and closing-rate analysis |
| **RaceMind AI** | IBM Granite + Tyre Degradation Model | Pit-stop windows, undercut/overcut prediction |
| **PitWall-IQ** | Docling + ChromaDB + Granite RAG | FIA regulation Q&A with article references |
| **AR Visualization** | Canvas2D + WebGL | Speed vectors, risk zones, trajectory arcs, tyre indicators |

> "An AI race engineer, strategist, commentator, safety analyst, and coach — unified in one platform."

---

## Quick Start

### Docker Compose (Recommended)

The entire production stack (PostgreSQL, Redis, FastAPI Backend, Next.js Frontend, LangFlow, and Nginx) is orchestrated via Docker Compose.

1. Clone the repository and navigate to the project root:
   ```bash
   git clone <repo> && cd apexvision-final
   ```

2. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```

3. **IMPORTANT:** Open `.env` and add your IBM credentials to enable live IBM Granite inference:
   ```env
   IBM_WATSONX_API_KEY=your_api_key_here
   IBM_PROJECT_ID=your_watsonx_project_id_here
   ```

4. Build and start the services:
   ```bash
   docker compose up --build -d
   ```

5. Access the platform at **http://localhost:3000**

> **Note:** If IBM credentials are not provided, the platform gracefully degrades to a physics-calibrated fallback mode. All interfaces remain functional for testing purposes.

### Local Development Setup

If you prefer to run the services outside of Docker:

```bash
# Setup Python virtual environment and dependencies
chmod +x scripts/setup.sh && ./scripts/setup.sh

# Start the Next.js frontend and FastAPI backend
chmod +x scripts/dev.sh && ./scripts/dev.sh
```

---

## Documentation Directory

For deeper technical details, please refer to the following documentation files in the `docs/` folder:

*   [**Architecture Overview**](./docs/ARCHITECTURE.md) — System design, data flow, and scaling strategy.
*   [**Deployment Guide**](./docs/DEPLOYMENT.md) — Detailed deployment options and environment variable configurations.
*   [**IBM Technology Integration**](./docs/IBM_TECHNOLOGY.md) — Deep dive into how IBM Granite, Watsonx.ai, LangFlow, and Docling power the AI agents.
*   [**API Reference**](./docs/API.md) — Complete REST and WebSocket endpoint documentation.

---

## Key Features & User Flows

1. **Dashboard** — The command center. Watch live cars orbit the circuit with real-time AR overlays: speed vectors (cyan lines), braking halos (red rings), and DRS indicators (green).
2. **PitLane Pulse** — Live, continuous IBM Granite commentary streams into the console panel, narrating overtakes, pit stops, and safety cars.
3. **SafetyNet Alerts** — The physics engine constantly evaluates collision risks. Critical proximity alerts appear with red flash animations.
4. **RaceMind Strategy** — Monitor live tyre degradation percentages. IBM Granite evaluates the physics model to issue dynamic pit-stop recommendations.
5. **ApexCoach Analysis** — Select any driver to view real IBM Granite analysis of their racing line, complete with per-corner scores and lap time histograms.
6. **PitWall-IQ Chatbot** — Query FIA rules directly. Docling parses the official PDF regulations, and IBM Granite uses RAG to provide accurate answers with article citations.
7. **Post-Race Analytics** — Review position history SVG charts, speed traces with throttle/brake overlays, and track position heatmaps.

---

## Computer Vision Pipeline

The vision stack uses **YOLOv8n** for detection and **ByteTrack** for multi-object tracking with ID persistence. **Optical flow** (Lucas-Kanade sparse) enriches each detection with pixel-accurate velocity vectors. 

The racing line analyzer runs Menger curvature on trajectory buffers to detect corners and score apex geometry. The overtake detector tracks position-order changes between frames and classifies each event as clean, aggressive, divebomb, or DRS pass.

---

## Incident Prediction Physics

SafetyNet AI runs a physics engine on every call:

**Collision risk** = `0.55 × proximity_risk + 0.30 × closing_rate_risk + 0.15 × speed_differential_risk`

**Tyre stress** = `degradation_pct × 0.5 + speed_factor × 0.3 + braking_force × 0.2`

Time-to-incident (TTI) is computed dynamically from current distances divided by the positive closing rate.

---

## Test Suite

The backend is fully verified with a comprehensive test suite. To run the tests locally:

```bash
cd backend
pytest tests/test_backend.py
```

The 12-test suite covers: incident prediction physics, tyre degradation models, optical flow fallback handling, speed traces, position history, and IBM Granite agent response formatting.

---

*ApexVision AI — Powered by IBM Granite, Watsonx.ai, LangFlow, Docling, YOLOv8, and ByteTrack.*
