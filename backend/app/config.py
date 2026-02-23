"""
SmartCity Dash - Configuration Management
Loads all settings from .env file using pydantic-settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import json


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_key: str = Field(..., env="SUPABASE_KEY")

    # ── API Server ────────────────────────────────────────────────────────
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    environment: str = Field(default="development", env="ENVIRONMENT")

    # ── Mock AI Settings (until real YOLO model is ready) ─────────────────
    mock_ai_confidence_min: float = Field(default=0.75, env="MOCK_AI_CONFIDENCE_MIN")
    mock_ai_confidence_max: float = Field(default=0.98, env="MOCK_AI_CONFIDENCE_MAX")

    # ── CORS ──────────────────────────────────────────────────────────────
    cors_origins: str = Field(default='["*"]', env="CORS_ORIGINS")

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.cors_origins)
        except Exception:
            return ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global singleton
settings = Settings()
