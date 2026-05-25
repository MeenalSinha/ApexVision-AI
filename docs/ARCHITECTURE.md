# ApexVision AI — Architecture Guide

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     APEXVISION AI PLATFORM                     │
├──────────────────┬─────────────────────┬───────────────────────┤
│   FRONTEND       │    BACKEND          │   AI / ML LAYER       │
│   Next.js 14     │    FastAPI          │   IBM Granite         │
│   TypeScript     │    Python 3.11      │   Watsonx.ai          │
│   TailwindCSS    │    WebSockets       │   LangChain           │
│   Canvas2D AR    │    Redis            │   LangFlow            │
│   Recharts       │    PostgreSQL       │   ChromaDB            │
└──────────────────┴─────────────────────┴───────────────────────┘
```

## Module Architecture

### Module 1: Vision Tracking Engine
- **File**: `backend/core/vision/tracker.py`
- **Tech**: YOLOv8 (Ultralytics) + ByteTrack + Optical Flow (OpenCV)
- **Fallback**: Physics-accurate simulation (elliptical track model)
- **Output**: 10Hz telemetry → Redis → WebSocket → Frontend Canvas

### Module 2: PitLane Pulse Commentary
- **File**: `backend/core/ai/langchain_agents.py` → `CommentaryAgent`
- **Tech**: IBM Granite 13B via Watsonx.ai REST API
- **System Prompt**: Constrains to JSON schema with excitement levels
- **Context**: Maintains rolling 6-line narrative history per session
- **Fallback**: Physics-calibrated pre-written commentary lines

### Module 3: ApexCoach AI
- **File**: `backend/core/ai/langchain_agents.py` → `CoachingAgent`
- **Tech**: IBM Granite + Racing Line Analyzer (`core/vision/racing_line.py`)
- **Analysis**: Curvature-based corner detection, apex scoring, feedback
- **Output**: JSON with scores, recommendations, lap delta potential

### Module 4: SafetyNet AI
- **File**: `backend/api/routes/incidents.py`
- **Tech**: Pure physics — proximity, closing rate, tyre stress
- **Model**: Weighted risk = 0.55×proximity + 0.30×closing_rate + 0.15×speed_diff
- **Output**: Risk zones with TTI (time to incident), alerts

### Module 5: RaceMind AI
- **File**: `backend/core/ai/langchain_agents.py` → `StrategyAgent`
- **Tech**: IBM Granite + tyre degradation model
- **Degradation Model**: compound_rate × age × (1 + track_temp_factor)
- **Output**: PIT_NOW | PIT_UNDERCUT | STAY_OUT with confidence scores

### Module 6: PitWall-IQ (Regulation RAG)
- **File**: `backend/core/ai/langchain_agents.py` → `RegulationRAGAgent`
- **Tech**: Docling PDF parser → ChromaDB vector store → IBM Granite RAG
- **Flow**: Upload PDF → Docling parse → chunk → ChromaDB upsert → query → retrieve → Granite synthesize
- **Fallback**: Rule-based response library for 15+ common regulation queries

### Module 7: AR Visualization
- **File**: `frontend/src/app/dashboard/page.tsx` (Canvas2D renderer)
- **Elements**: Speed vectors, trajectory arcs, brake halos, tyre rings, risk zones, DRS labels
- **Performance**: RequestAnimationFrame loop, 60fps rendering, GPU compositing

## Data Flow

```
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
WebSocket   REST API
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

## IBM Technology Integration

### IBM Granite
All four AI agents call `ibm/granite-13b-instruct-v2` via the Watsonx.ai
REST API endpoint `/ml/v1/text/generation`. The model is prompted with
structured JSON output schemas enforced via system prompts.

### Watsonx.ai
Authentication uses IBM IAM with automatic token refresh. The `WatsonxLLM`
class in `langchain_agents.py` manages token lifecycle and caches valid tokens
for up to 3600 seconds.

### LangFlow
The `ai_pipelines/langflow/apexvision_pipeline.json` defines the complete
multi-agent flow. Import this into LangFlow UI (http://localhost:7860) after
running Docker Compose. The flow wires Commentary → Strategy → Coaching →
Regulation agents through the ApexVision Orchestrator node.

### Docling
FIA regulation PDFs are parsed via Docling's `DocumentConverter`:
1. Upload PDF via `/api/regulation/upload`
2. Docling converts to structured markdown
3. Text is chunked (400 words, 40-word overlap)
4. Chunks indexed into ChromaDB with cosine similarity
5. Regulation queries retrieve top-4 chunks → Granite synthesizes answer

## Scaling Architecture

### Horizontal Scaling
- Backend: Multiple FastAPI workers behind Nginx
- WebSocket: Redis pub/sub for cross-worker broadcast
- Vision: GPU workers pool for parallel video processing

### Production Deployment
```
Internet → Nginx (TLS) → Frontend (Next.js)
                       → Backend (FastAPI ×N workers)
                              → Redis (session state)
                              → PostgreSQL (persistence)
                              → Watsonx.ai (IBM Granite)
                              → ChromaDB (vector search)
```

## Security Considerations
- All IBM API keys loaded from environment variables (never hardcoded)
- Backend validates video MIME types before processing
- WebSocket connections authenticated via session tokens
- PostgreSQL uses parameterized queries via SQLAlchemy ORM
- CORS restricted to configured origins

## Performance Benchmarks (Target)
- WebSocket telemetry: 10Hz (100ms tick)
- IBM Granite latency: 1-3s per call (commentary/strategy)
- Vision processing: 30fps real-time (GPU) / 10fps (CPU fallback)
- Canvas AR render: 60fps (requestAnimationFrame)
- Regulation RAG query: 2-4s end-to-end
