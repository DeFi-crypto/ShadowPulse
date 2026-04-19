"""Pydantic models for ShadowPulse."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class TenantExposure(BaseModel):
    name: str
    pct_abr: float = Field(..., description="Percent of annualized base rent")
    sector: Optional[str] = None


class SECPulse(BaseModel):
    ticker: str
    filing_date: Optional[str] = None
    npl_current: Optional[float] = None
    npl_previous: Optional[float] = None
    npl_delta_pct: Optional[float] = None
    acl_commercial: Optional[float] = None
    acl_commercial_previous: Optional[float] = None
    top_tenants: List[TenantExposure] = Field(default_factory=list)
    source_url: Optional[str] = None


class WARNPulse(BaseModel):
    warn_count: int = 0
    headlines: List[str] = Field(default_factory=list)
    nearest_miles: Optional[float] = None


class LienPulse(BaseModel):
    lien_status: Literal["clear", "pending", "filed"] = "clear"
    count: int = 0
    filings: List[str] = Field(default_factory=list)


class SentimentPulse(BaseModel):
    vibe: Literal["positive", "neutral", "cautionary", "negative", "critical"] = "neutral"
    score: float = 0.0  # -1..1 decay score
    flagged_reviews: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)


class DistressSignals(BaseModel):
    sec_data: SECPulse
    warn: WARNPulse
    lien: LienPulse
    sentiment: SentimentPulse


class DistressAsset(BaseModel):
    asset_id: str
    address: str
    city: str
    state: str
    lat: float
    lng: float
    owner_reit: str
    ticker: str
    asset_type: Literal["office", "retail", "mixed_use", "industrial"] = "office"
    debt_maturity_year: int = 2026
    distress_category: Literal["operational", "financial", "hybrid"] = "financial"
    distress_score: float = 0.0
    top_red_flags: List[str] = Field(default_factory=list)
    institutional_verdict: Optional[str] = None
    signals: DistressSignals


class MapDataResponse(BaseModel):
    assets: List[DistressAsset]
    generated_at: str
    source: Literal["live", "mock", "hybrid"] = "mock"
