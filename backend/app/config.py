from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the ShadowPulse backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ShadowPulse"
    environment: str = Field(default="development")

    # External services
    sec_user_agent: str = Field(
        default="ShadowPulse Research research@shadowpulse.io",
        description="Required User-Agent for SEC EDGAR requests.",
    )
    openai_api_key: str | None = Field(default=None)
    openai_model: str = Field(default="gpt-4o-mini")
    mapbox_token: str | None = Field(default=None)

    # REITs to monitor
    reit_tickers: List[str] = Field(
        default_factory=lambda: ["SLG", "BXP", "VNO", "KRG", "MAC"]
    )

    # Behavioural flags
    use_live_data: bool = Field(default=False)
    mock_data_path: str = Field(default="app/data/mock_data.json")

    # Timeouts & rate limits
    http_timeout_seconds: float = 15.0
    sec_rate_limit_per_second: int = 9  # SEC EDGAR caps at 10/s


@lru_cache
def get_settings() -> Settings:
    return Settings()
