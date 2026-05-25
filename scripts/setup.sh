#!/usr/bin/env bash
# ApexVision AI — One-command development setup
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERR]${NC}   $*"; exit 1; }

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║       APEXVISION AI — SETUP           ║"
echo "  ║   Motorsport Intelligence Platform    ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Check prerequisites
command -v python3 &>/dev/null || error "Python 3.10+ required"
command -v node    &>/dev/null || error "Node.js 20+ required"
command -v npm     &>/dev/null || error "npm required"

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node --version | sed 's/v//')
info "Python $PY_VER | Node $NODE_VER"

# Backend
info "Setting up Python backend..."
cd "$(dirname "$0")/../backend"

python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
success "Backend dependencies installed"

[ -f .env ] || cp .env.example .env && warn ".env created — add your IBM_WATSONX_API_KEY"

for d in uploads outputs models data/chromadb data/docling_parsed; do
    mkdir -p "$d"
done

python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>/dev/null && success "YOLOv8n model ready" || warn "YOLOv8n download failed — simulation mode active"

cd ..

# Frontend
info "Setting up frontend..."
cd frontend
npm install --silent
success "Frontend dependencies installed"
cd ..

# Root .env
[ -f .env ] || cp .env.example .env

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║           SETUP COMPLETE              ║"
echo "  ║                                       ║"
echo "  ║  Next steps:                          ║"
echo "  ║  1. Edit backend/.env — add IBM keys  ║"
echo "  ║  2. Run: ./scripts/dev.sh             ║"
echo "  ║  3. Open: http://localhost:3000        ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""
