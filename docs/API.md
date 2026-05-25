# ApexVision AI — API Reference

This document details the REST API endpoints available in the FastAPI backend. All endpoints are accessible at the base URL (e.g., `http://localhost:8000`).

For interactive documentation and OpenAPI specifications, visit the Swagger UI at `/api/docs` or ReDoc at `/api/redoc` when the backend is running.

---

## 1. System & Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Basic system health and module status. |
| `GET` | `/api/status` | Detailed runtime status, including Redis and Watsonx connections. |
| `GET` | `/` | Root endpoint returning platform metadata. |

---

## 2. Vision Tracking Engine

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/vision/upload` | Upload a race video for YOLOv8 and ByteTrack processing. |
| `POST` | `/api/vision/demo/start` | Start a synthetic tracking session using the physics engine. |
| `GET` | `/api/vision/session/{id}/coaching/{n}`| Get racing line coaching data for a specific car ID. |

---

## 3. PitLane Pulse (AI Commentary)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/commentary/generate` | Generates context-aware live race commentary via IBM Granite. |
| `POST` | `/api/commentary/event` | Generates commentary for specific critical race events. |

---

## 4. ApexCoach AI (Driver Coaching)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/coaching/analyze` | Generates detailed driver coaching feedback via IBM Granite. |
| `GET` | `/api/coaching/demo/performance/{id}` | Retrieve real-time performance scores for a specific driver. |
| `GET` | `/api/coaching/demo/comparison` | Retrieve performance comparisons across all drivers. |

---

## 5. RaceMind AI (Race Strategy)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/strategy/recommend` | Generates pit-stop and strategy recommendations via IBM Granite. |
| `GET` | `/api/strategy/demo/all-cars` | Retrieve active strategy recommendations for all track cars. |
| `GET` | `/api/strategy/tyres/degradation` | Retrieve live tyre degradation curves. |

---

## 6. SafetyNet AI (Incident Prediction)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/incidents/predict` | Predict collision risks using the physics-based model. |
| `GET` | `/api/incidents/demo/live` | Retrieve live incident states, proximity warnings, and time-to-incident. |

---

## 7. PitWall-IQ (Regulation RAG)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/regulation/query` | Ask a question against the FIA regulations using Docling RAG + IBM Granite. |
| `POST` | `/api/regulation/upload` | Upload and index a new regulation PDF via Docling into ChromaDB. |

---

## 8. Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/race-summary/{sid}` | Retrieve overall race statistics for a given session ID. |
| `GET` | `/api/analytics/positions/{sid}` | Retrieve historical position changes across all laps. |
| `GET` | `/api/analytics/speed-trace/{sid}/{id}`| Retrieve speed, throttle, and brake traces for a specific car. |
| `GET` | `/api/analytics/heatmap/{sid}/{id}` | Retrieve track position heatmaps for a specific car. |

---

## 9. Demo State

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/demo/full-state` | Retrieve the complete system state, including an AI snapshot. |

---

## 10. WebSockets (Live Telemetry)

| Type | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/race/{session_id}` | Streams 10Hz live race telemetry, AR overlay data, and physics updates. |
| `WS` | `/ws/commentary/{session_id}` | Streams live asynchronous IBM Granite commentary events. |
