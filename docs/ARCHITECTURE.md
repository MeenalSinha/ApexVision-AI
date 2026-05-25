# ApexVision AI — Architecture Guide

This document outlines the high-level system architecture, module interactions, and scaling strategies for ApexVision AI.

---

## 1. System Overview

At its core, ApexVision AI is a microservices-based platform designed for high-throughput stream processing and concurrent AI agent orchestration.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        APEXVISION AI PLATFORM                          │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│    FRONTEND          │     BACKEND          │     AI / ML LAYER        │
│    Next.js 14        │     FastAPI          │     IBM Granite          │
│    TypeScript        │     Python 3.11      │     Watsonx.ai           │
│    TailwindCSS       │     WebSockets       │     LangChain / LangFlow │
│    Canvas2D AR       │     Redis Pub/Sub    │     ChromaDB             │
│    Recharts          │     PostgreSQL       │     Docling              │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

---

## 2. Module Architecture

The system is composed of 7 independent intelligence layers operating simultaneously.

### 2.1. Vision Tracking Engine
*   **Path**: `backend/core/vision/tracker.py`
*   **Technology**: YOLOv8 (Ultralytics), ByteTrack, Optical Flow (OpenCV)
*   **Function**: Processes video frames to detect cars, assign persistent tracking IDs, and calculate pixel-accurate velocity vectors.
*   **Output**: 10Hz JSON telemetry streamed to Redis, broadcasted via WebSockets to the frontend Canvas.
*   **Fallback Mode**: Employs a physics-accurate simulation using an elliptical track model (calibrated to the Monaco circuit) when video input is absent.

### 2.2. PitLane Pulse Commentary
*   **Path**: `backend/core/ai/langchain_agents.py` → `CommentaryAgent`
*   **Technology**: IBM Granite 13B via Watsonx.ai REST API
*   **Function**: Generates dynamic, context-aware commentary based on live race events.
*   **Mechanism**: Uses structured JSON prompts and maintains a rolling 6-line narrative history per session to ensure continuity.

### 2.3. ApexCoach AI
*   **Path**: `backend/core/ai/langchain_agents.py` → `CoachingAgent`
*   **Technology**: IBM Granite paired with a Racing Line Analyzer (`core/vision/racing_line.py`).
*   **Function**: Analyzes telemetry buffers using Menger curvature to detect corners and score apex geometry. Granite translates these metrics into actionable driver feedback.
*   **Output**: JSON containing performance scores (0-100), key improvements, and projected lap delta potentials.

### 2.4. SafetyNet AI
*   **Path**: `backend/api/routes/incidents.py`
*   **Technology**: Deterministic Physics Engine
*   **Function**: Continuously evaluates collision risks and tyre stress based on telemetry.
*   **Model**: Computes a weighted risk score: `0.55 × proximity + 0.30 × closing_rate + 0.15 × speed_differential`.
*   **Output**: Risk zones, time-to-incident (TTI) predictions, and real-time dashboard alerts.

### 2.5. RaceMind AI
*   **Path**: `backend/core/ai/langchain_agents.py` → `StrategyAgent`
*   **Technology**: IBM Granite paired with a tyre degradation physics model.
*   **Function**: Computes tyre wear (`compound_rate × age × track_temp_factor`) and prompts Granite to generate optimal pit-stop strategies.
*   **Output**: Confident-scored action recommendations (e.g., `PIT_NOW`, `PIT_UNDERCUT`, `STAY_OUT`).

### 2.6. PitWall-IQ (Regulation RAG)
*   **Path**: `backend/core/ai/langchain_agents.py` → `RegulationRAGAgent`
*   **Technology**: Docling (PDF Parsing), ChromaDB (Vector Store), IBM Granite (Synthesis)
*   **Flow**: 
    1. Upload FIA PDF via `/api/regulation/upload`.
    2. Docling parses the PDF into Markdown.
    3. Text is chunked and upserted into ChromaDB.
    4. User queries retrieve the top-4 relevant chunks via cosine similarity.
    5. Granite synthesizes the answer with specific article references.

### 2.7. AR Visualization
*   **Path**: `frontend/src/app/dashboard/page.tsx` (via `ARCanvas.tsx`)
*   **Technology**: HTML5 Canvas2D, WebGL, requestAnimationFrame loop.
*   **Function**: Renders telemetry at 60fps, compositing speed vectors, trajectory arcs, brake halos, tyre compound rings, and risk zones natively in the browser.

---

## 3. Data Flow Diagram

```text
  Race Video / WebSocket
            │
            ▼
      YOLOv8 Detection
      + ByteTrack IDs
      + Optical Flow
            │
            ▼
    Telemetry Extractor
   (speed, heading, accel)
            │
      ┌─────┴──────┐
      │            │
      ▼            ▼
  Redis 10Hz   IBM Granite
  Stream       Agents
      │            │
      ▼            ▼
  WebSocket     REST API
      │            │
      └─────┬──────┘
            ▼
     Frontend Canvas
    AR Overlay Render
            │
            ▼
       Cinematic F1
     Command Center
```

---

## 4. Scaling Architecture

ApexVision AI is designed for horizontal scalability across all tiers:

*   **API Layer (FastAPI)**: Runs via Uvicorn/Gunicorn workers behind an Nginx reverse proxy. New instances can be spun up trivially.
*   **WebSocket State**: Utilizes Redis Pub/Sub. Because WebSocket connections are stateful, Redis ensures that messages are successfully broadcast across multiple decoupled API worker nodes.
*   **Vision Processing**: Computer vision tasks (YOLOv8) can be offloaded to dedicated GPU worker pools using the same REST interfaces.
*   **Database**: PostgreSQL handles session persistence and historical telemetry logs using SQLAlchemy ORM with connection pooling.

### Production Network Topology

```text
Internet ──→ Nginx (TLS Termination) 
                   │
                   ├───→ Frontend (Next.js)
                   │
                   └───→ Backend (FastAPI × N workers)
                               ├──→ Redis (Pub/Sub & Cache)
                               ├──→ PostgreSQL (Persistence)
                               ├──→ Watsonx.ai (Granite LLM)
                               └───→ ChromaDB (Vector Search)
```

---

## 5. Security Considerations

*   **Credential Management**: All sensitive IBM API keys are injected at runtime via environment variables; none are hardcoded.
*   **Payload Validation**: The backend strictly validates video MIME types and JSON schemas (using Pydantic) prior to processing.
*   **Database Safety**: PostgreSQL queries are parameterized via the SQLAlchemy ORM to prevent SQL injection.
*   **API Protection**: FastApi middleware applies sliding-window rate limiting (120 req / 60s per IP) and comprehensive security headers (`X-Content-Type-Options`, `X-XSS-Protection`, etc.).

---

## 6. Performance Benchmarks

*   **WebSocket Telemetry Tick**: 100ms (10Hz) steady state.
*   **IBM Granite Latency**: ~1-3s per generation call (asynchronous, non-blocking to the main telemetry loop).
*   **Vision Processing**: 30fps real-time on GPU hardware / ~10fps on CPU fallback with frame skipping.
*   **Frontend AR Render**: 60fps locked via `requestAnimationFrame`.
*   **Regulation RAG Query**: 2-4s end-to-end (Retrieval + Synthesis).
