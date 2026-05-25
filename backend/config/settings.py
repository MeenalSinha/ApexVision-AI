"""
ApexVision AI — Configuration Settings
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ApexVision AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "apexvision-secret-key-change-in-production"

    # IBM / Watsonx
    IBM_WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    IBM_WATSONX_API_KEY: str = ""
    IBM_PROJECT_ID: str = ""
    IBM_GRANITE_MODEL: str = "ibm/granite-13b-instruct-v2"
    IBM_GRANITE_VISION_MODEL: str = "ibm/granite-20b-multimodal"

    # Database
    DATABASE_URL: str = "postgresql://apexvision:apexvision@localhost:5432/apexvision"
    REDIS_URL: str = "redis://localhost:6379"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://apexvision.ai",
    ]

    # Computer Vision
    YOLO_MODEL_PATH: str = "models/yolov8n.pt"
    YOLO_CONFIDENCE: float = 0.5
    TRACKER_TYPE: str = "bytetrack"
    MAX_TRACKED_OBJECTS: int = 20

    # AI Pipelines
    LANGFLOW_URL: str = "http://localhost:7860"
    CHROMADB_PATH: str = "./data/chromadb"
    VECTOR_COLLECTION: str = "fia_regulations"

    # Streaming
    VIDEO_STREAM_BUFFER: int = 30
    TELEMETRY_FREQ_HZ: int = 10
    COMMENTARY_INTERVAL_SEC: int = 8

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    OUTPUT_DIR: str = "./outputs"
    MAX_VIDEO_SIZE_MB: int = 500

    # Docling
    DOCLING_OUTPUT_DIR: str = "./data/docling_parsed"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
