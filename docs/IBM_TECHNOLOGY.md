# IBM Technology Usage — ApexVision AI

This document details how ApexVision AI deeply integrates IBM technologies (Granite, Watsonx.ai, Docling) across its intelligence layers.

---

## 1. IBM Granite (ibm/granite-13b-instruct-v2)

IBM Granite serves as the primary reasoning engine for four distinct AI agents within the platform.

### 1.1. PitLane Pulse Commentary Engine
*   **Location**: `backend/core/ai/langchain_agents.py` (`CommentaryAgent`)
*   **Implementation**: Triggered every 8-10 seconds during live race telemetry or on-demand for specific events.
*   **Prompting**: Utilizes structured JSON output schemas to enforce structured responses. It maintains a rolling 6-line narrative history in context to ensure continuous storytelling.
*   **Hyperparameters**: `Temperature: 0.82` (tuned for creative, natural-sounding commentary).

### 1.2. RaceMind AI Strategy Analyst
*   **Location**: `backend/core/ai/langchain_agents.py` (`StrategyAgent`)
*   **Implementation**: Processes real-time track metrics including tyre age, compound type, track temperature, and distance gaps.
*   **Output Strategy**: Emits decisive actions (`PIT_NOW`, `PIT_UNDERCUT`, `PIT_OVERCUT`, `STAY_OUT`, `PIT_SAFETY_CAR`) with associated confidence scoring.
*   **Hyperparameters**: `Temperature: 0.35` (tuned for deterministic, reliable strategy advice).

### 1.3. ApexCoach AI Driver Coach
*   **Location**: `backend/core/ai/langchain_agents.py` (`CoachingAgent`)
*   **Implementation**: Translates geometric racing line telemetry (braking points, apex angles, corner exit speeds) into actionable human-readable feedback.
*   **Output Strategy**: Returns a JSON object containing an overall score (0-100), an array of key improvements, and a projected lap delta.
*   **Hyperparameters**: `Temperature: 0.45` (tuned for precise, technical coaching terminology).

### 1.4. PitWall-IQ Regulation RAG
*   **Location**: `backend/core/ai/langchain_agents.py` (`RegulationRAGAgent`)
*   **Implementation**: The synthesizer for the Retrieval-Augmented Generation (RAG) pipeline.
*   **Context Injection**: Provided with the top-4 most relevant context chunks retrieved from ChromaDB.
*   **Output Strategy**: Generates a definitive answer, cites the specific FIA article reference, and assesses potential penalty risks.
*   **Hyperparameters**: `Temperature: 0.18` (highly factual, minimizing hallucination).

---

## 2. Watsonx.ai

### 2.1. Authentication & Token Management
All IBM Granite calls are routed securely through the Watsonx.ai REST API.
*   Authentication relies on the **IBM Cloud IAM token API** with automatic token refreshes.
*   The `WatsonxLLM` class caches valid IAM tokens in memory for up to 3600 seconds, significantly reducing latency and API overhead on consecutive calls.
*   If valid credentials are not provided in the environment, the system gracefully degrades to high-fidelity, physics-calibrated fallback modes without crashing.

### 2.2. API Payload Structure
The backend constructs requests targeting the `/ml/v1/text/generation` endpoint:

```json
{
  "model_id": "ibm/granite-13b-instruct-v2",
  "input": "<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>\n",
  "parameters": {
    "max_new_tokens": 512,
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 50,
    "repetition_penalty": 1.05,
    "stop_sequences": ["<|user|>", "<|system|>"]
  },
  "project_id": "{IBM_PROJECT_ID}"
}
```

---

## 3. Docling

Docling is the backbone of the PitWall-IQ Regulation RAG system, handling the ingestion of highly technical, complex PDF documents.

### PDF Processing Pipeline
1.  **Ingestion**: An FIA regulation PDF is uploaded via the `POST /api/regulation/upload` endpoint.
2.  **Parsing**: The Docling `DocumentConverter` strips out formatting noise and parses the PDF into highly structured Markdown.
3.  **Chunking**: The resulting Markdown is processed into chunks of 400 words, utilizing a 40-word overlap to preserve context boundaries.
4.  **Embedding**: Chunks are embedded and indexed into a ChromaDB instance alongside their source metadata.
5.  **Retrieval**: When queried, ChromaDB uses cosine similarity to retrieve the top-4 chunks, which are then passed to IBM Granite for synthesis.

### Supported Document Types
The system is optimized for handling technical rulebooks, specifically:
*   FIA F1 Sporting Regulations
*   FIA F1 Technical Regulations
*   FIA Financial Regulations
*   FIA International Sporting Code

---

## 4. LangFlow

LangFlow acts as the visual orchestrator for the platform's multi-agent logic. 

To visualize or modify the pipeline:
1. Ensure the LangFlow container is running (`docker compose up -d langflow`).
2. Navigate to the LangFlow UI at `http://localhost:7860`.
3. Import the pre-built pipeline located at `ai_pipelines/langflow/apexvision_pipeline.json`.
4. The pipeline explicitly maps the orchestration flow:
   *   `Race State Input` → routes simultaneously to `Commentary Chain`, `Strategy Chain`, and `Coaching Chain`.
   *   `ChromaDB Retriever` + `Query Input` → routes to `RAG Chain`.
   *   All outputs converge at the `ApexVision Orchestrator` node for unified JSON delivery.

---

## 5. Technology Coverage Matrix

| Feature | IBM Granite | Watsonx.ai | LangFlow | Docling |
|---------|-------------|------------|----------|---------|
| **Race Commentary** | ✅ Primary LLM | ✅ Inference | ✅ Chain node | — |
| **Strategy AI** | ✅ Primary LLM | ✅ Inference | ✅ Chain node | — |
| **Driver Coaching** | ✅ Primary LLM | ✅ Inference | ✅ Chain node | — |
| **Regulation RAG** | ✅ Synthesizer | ✅ Inference | ✅ RAG chain | ✅ PDF parser |
| **Multi-agent Sync** | ✅ All agents | ✅ All calls | ✅ Orchestrator | — |
| **Fallback Mode** | ✅ Physical logic | ✅ Graceful degradation | ✅ Direct API | ✅ Rule-based |
