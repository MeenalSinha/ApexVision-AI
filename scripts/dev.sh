#!/usr/bin/env bash
# ApexVision AI — Development server launcher
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    [ -n "${BACKEND_PID:-}" ]  && kill "$BACKEND_PID"  2>/dev/null || true
    [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    redis-cli shutdown 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo -e "${CYAN}  APEXVISION AI — STARTING DEVELOPMENT SERVERS${NC}"
echo ""

# Redis
if ! redis-cli ping &>/dev/null 2>&1; then
    redis-server --daemonize yes --port 6379 --loglevel warning
    sleep 1
fi
echo -e "${GREEN}  [Redis]${NC}    localhost:6379"

# Backend
cd "$ROOT/backend"
source venv/bin/activate 2>/dev/null || true
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info &
BACKEND_PID=$!
sleep 2
echo -e "${GREEN}  [Backend]${NC}  http://localhost:8000"
echo -e "${GREEN}  [API Docs]${NC} http://localhost:8000/api/docs"

# Frontend
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
sleep 3
echo -e "${GREEN}  [Frontend]${NC} http://localhost:3000"

echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""

wait $BACKEND_PID $FRONTEND_PID
