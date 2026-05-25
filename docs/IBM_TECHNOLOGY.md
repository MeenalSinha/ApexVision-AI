# IBM Technology Usage — ApexVision AI

## IBM SkillsBuild AI Builders Challenge

This document details how ApexVision AI integrates IBM technologies at
every layer of the platform.

---

## IBM Granite (ibm/granite-13b-instruct-v2)

### Agent 1: PitLane Pulse Commentary Engine
- **File**: `backend/core/ai/langchain_agents.py` → `CommentaryAgent`
- **Prompt style**: Structured JSON output with schema enforcement
- **Context management**: Maintains 6-line rolling commentary history
- **Temperature**: 0.82 (creative, natural-sounding commentary)
- **Called when**: Every 8 seconds during live race, on demand for events

### Agent 2: RaceMind AI Strategy Analyst
- **File**: `backend/core/ai/langchain_agents.py` → `StrategyAgent`
- **Prompt style**: Structured JSON with confidence-scored recommendations
- **Context**: Current tyre state, gaps, weather, degradation percentage
- **Temperature**: 0.35 (deterministic, reliable strategy advice)
- **Output**: PIT_NOW | PIT_UNDERCUT | PIT_OVERCUT | STAY_OUT | PIT_SAFETY_CAR

### Agent 3: ApexCoach AI Driver Coach
- **File**: `backend/core/ai/langchain_agents.py` → `CoachingAgent`
- **Prompt style**: Telemetry JSON → structured coaching recommendations
- **Context**: Corner data, braking events, lap times, speed range
- **Temperature**: 0.45 (precise, technical coaching language)
- **Output**: Score 0-100, key_improvements[], lap_delta_potential

### Agent 4: PitWall-IQ Regulation RAG
- **File**: `backend/core/ai/langchain_agents.py` → `RegulationRAGAgent`
- **Prompt style**: RAG with ChromaDB context injection
- **Context**: Top-4 ChromaDB chunks from Docling-parsed FIA PDFs
- **Temperature**: 0.18 (highly factual, article-referenced answers)
- **Output**: Answer, article reference, penalty_risk, compliance_status

---

## Watsonx.ai

### Authentication
- Uses IBM Cloud IAM token API with automatic refresh
- Token cached for up to 3600 seconds per session
- Graceful degradation when credentials not configured

### API Endpoint
```
POST {IBM_WATSONX_URL}/ml/v1/text/generation?version=2023-05-29

Headers:
  Authorization: Bearer {iam_token}
  Content-Type: application/json

Body:
  {
    "model_id": "ibm/granite-13b-instruct-v2",
    "input": "<|system|>\n{system}\n<|user|>\n{prompt}\n<|assistant|>\n",
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

### Configuration
Add to `backend/.env`:
```
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_WATSONX_API_KEY=your_ibm_cloud_api_key
IBM_PROJECT_ID=your_watsonx_project_id
IBM_GRANITE_MODEL=ibm/granite-13b-instruct-v2
```

---

## LangFlow

### Pipeline Import
1. Start the LangFlow service: `docker-compose up langflow`
2. Navigate to `http://localhost:7860`
3. Import: `ai_pipelines/langflow/apexvision_pipeline.json`
4. Configure Watsonx.ai credentials in the IBM Granite node
5. Run the pipeline with sample race state JSON

### Agents in the Flow
- **Race State Input** → Commentary Chain → PitLane Pulse
- **Race State Input** → Strategy Chain → RaceMind AI
- **Race State Input** → Coaching Chain → ApexCoach AI
- **ChromaDB Retriever** + **Regulation Prompt** → RAG Chain → PitWall-IQ
- All four outputs → **ApexVision Orchestrator** → unified JSON response

---

## Docling

### PDF Processing Pipeline
1. FIA regulation PDF uploaded via `POST /api/regulation/upload`
2. Docling `DocumentConverter` parses PDF → structured Markdown
3. Text chunked: 400-word chunks with 40-word overlap
4. Each chunk indexed into ChromaDB with source metadata
5. Query: ChromaDB cosine similarity → top-4 chunks → IBM Granite synthesis

### Supported Documents
- FIA F1 Sporting Regulations 2024 (58 articles)
- FIA F1 Technical Regulations 2024 (165 articles)
- FIA Financial Regulations 2024 (89 articles)
- FIA International Sporting Code 2024 (79 articles)

### Pre-built Knowledge Base
Even without uploaded PDFs, PitWall-IQ uses a rule-based fallback covering
15+ common regulation queries (safety car pitting, DRS rules, track limits,
tyre compound rules, unsafe release, fuel flow, etc.)

---

## Summary: IBM Technology Coverage Matrix

| Feature | IBM Granite | Watsonx.ai | LangFlow | Docling |
|---------|-------------|------------|----------|---------|
| Race Commentary | ✅ Primary LLM | ✅ Inference | ✅ Chain node | — |
| Strategy AI | ✅ Primary LLM | ✅ Inference | ✅ Chain node | — |
| Driver Coaching | ✅ Primary LLM | ✅ Inference | ✅ Chain node | — |
| Regulation RAG | ✅ Synthesizer | ✅ Inference | ✅ RAG chain | ✅ PDF parser |
| Multi-agent | ✅ All agents | ✅ All calls | ✅ Orchestrator | — |
| Demo mode | ✅ Full calls | ✅ With keys | ✅ Always | ✅ Upload flow |
| Fallback | ✅ Physics-based | ✅ Graceful | ✅ API direct | ✅ Rule-based |
