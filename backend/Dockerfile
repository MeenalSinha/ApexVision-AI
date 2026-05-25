FROM python:3.11-slim AS base

# Security: run as non-root
RUN groupadd -r apexvision && useradd -r -g apexvision apexvision

# System dependencies for OpenCV + Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 \
    libglib2.0-dev curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download YOLO model during build (cached in layer)
RUN python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>/dev/null || true

# Copy source
COPY --chown=apexvision:apexvision . .

# Create runtime directories
RUN mkdir -p uploads outputs models data/chromadb data/docling_parsed && \
    chown -R apexvision:apexvision /app

USER apexvision

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--loop", "uvloop", "--access-log"]
