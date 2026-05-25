# ApexVision AI — Deployment Guide

This guide outlines the steps required to deploy the ApexVision AI platform. 

## Environment Configuration

Before deploying, ensure you configure the environment variables. A `.env.example` file is provided in the project root. Copy it to `.env` and fill in the required values.

```bash
cp .env.example .env
```

### Environment Variables Matrix

| Variable | Required? | Description | Default / Example |
|---|---|---|---|
| `IBM_WATSONX_URL` | **Yes** | The base URL for Watsonx.ai API. | `https://us-south.ml.cloud.ibm.com` |
| `IBM_WATSONX_API_KEY` | **Yes** | Your IBM Cloud IAM API Key for accessing Watsonx.ai. | `your_api_key_here` |
| `IBM_PROJECT_ID` | **Yes** | Your Watsonx.ai Project ID. Required for Granite inference. | `your_project_id_here` |
| `IBM_GRANITE_MODEL` | No | The specific IBM Granite model ID to use. | `ibm/granite-13b-instruct-v2` |
| `DB_PASSWORD` | **Yes** | Password for the PostgreSQL database. | `apexvision_secret` |
| `SECRET_KEY` | **Yes** | Random string used for hashing and session security. | `min_32_chars_random_string` |
| `PUBLIC_API_URL` | No | The URL Next.js uses to reach the FastAPI backend. | `http://localhost:8000` |
| `PUBLIC_WS_URL` | No | The WebSocket URL for live telemetry streaming. | `ws://localhost:8000` |
| `LANGFLOW_SECRET` | No | Secret key used by the LangFlow service. | `apexvision-langflow-secret` |
| `DEBUG` | No | Toggles detailed logging and traceback generation. | `false` |

> **Warning:** Never commit your `.env` file to version control. The repository includes a `.gitignore` configured to prevent this.

---

## 1. Docker Compose (Recommended)

The easiest and most reliable way to run the entire stack (PostgreSQL, Redis, FastAPI Backend, Next.js Frontend, LangFlow, Nginx) is via Docker Compose.

1. Ensure Docker Desktop (or Docker Engine) is running.
2. Build and start all services in detached mode:
   ```bash
   docker compose up --build -d
   ```
3. View the live logs for the backend (useful for monitoring IBM Granite calls):
   ```bash
   docker compose logs -f backend
   ```
4. Access the web dashboard at **http://localhost:3000**
5. Access the LangFlow interface at **http://localhost:7860**

**To shut down and wipe the database volumes:**
```bash
docker compose down -v
```

---

## 2. Local Development (Native)

If you need to develop outside of Docker, you can use the provided Bash scripts to bootstrap the environment.

### Prerequisites
* Python 3.11+
* Node.js 20+ (with `npm` or `yarn`)
* PostgreSQL running locally (or externally accessible)
* Redis running locally (or externally accessible)

### Setup & Execution
1. Run the setup script to create virtual environments and install dependencies:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```
2. Start the development servers:
   ```bash
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

---

## 3. Cloud Platform Deployment

### Vercel (Frontend Only)
The Next.js frontend is fully optimized for Vercel.
1. Navigate to the frontend directory: `cd frontend`
2. Deploy via Vercel CLI:
   ```bash
   npx vercel
   ```
3. When prompted, provide the `PUBLIC_API_URL` and `PUBLIC_WS_URL` pointing to your hosted backend.

### Railway.app (Full Stack)
Railway is ideal for deploying the FastAPI backend and Postgres/Redis instances.
1. Install the Railway CLI.
2. Initialize the project: `railway init`
3. Add the required databases: `railway add postgresql redis`
4. Deploy the backend directory: `railway up`

### Generic Docker Hosting
Both the frontend and backend include optimized, multi-stage `Dockerfile`s suitable for generic container hosting (e.g., AWS ECS, Google Cloud Run, Azure Container Apps). 

*   The **backend** runs as a non-root user and exposes a healthcheck endpoint at `/api/health`.
*   The **frontend** utilizes Next.js `output: 'standalone'` for a minimal footprint.
