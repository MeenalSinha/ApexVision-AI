# ApexVision AI — Deployment Guide

## Local Development

```bash
./scripts/setup.sh   # one-time install
./scripts/dev.sh     # start all services
```

## Docker Compose

```bash
cp .env.example .env   # fill in IBM keys
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| IBM_WATSONX_API_KEY | Live AI | IBM Cloud API key |
| IBM_PROJECT_ID | Live AI | Watsonx.ai project ID |
| IBM_GRANITE_MODEL | No | Defaults to granite-13b-instruct-v2 |
| REDIS_URL | No | Defaults to localhost:6379 |
| SECRET_KEY | Production | Random 64-char string |

## Cloud Platforms

**Vercel (frontend):** `cd frontend && npx vercel`

**Railway (full stack):** `railway init && railway add postgresql redis && railway up`

**Docker anywhere:** Build `backend/Dockerfile` and `frontend/Dockerfile`. Backend runs as non-root user with healthcheck endpoint at `/api/health`.
