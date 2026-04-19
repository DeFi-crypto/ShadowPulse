"""FastAPI app wiring for ShadowPulse."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import Settings, get_settings
from .engine import ShadowPulseEngine
from .models import DistressAsset, MapDataResponse

logger = logging.getLogger(__name__)


class GeoFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class GeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoFeature]
    generated_at: str
    source: str


def create_app() -> FastAPI:
    app = FastAPI(
        title="ShadowPulse",
        description=(
            "Institutional commercial real estate distress monitor. "
            "Aggregates SEC 10-Q, WARN, lien, and sentiment pulses into a "
            "single 0-100 Distress Score."
        ),
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    engine = ShadowPulseEngine()

    @app.get("/api/health")
    async def health(settings: Settings = Depends(get_settings)) -> Dict[str, Any]:
        return {
            "status": "ok",
            "environment": settings.environment,
            "live": settings.use_live_data,
            "llm_enabled": engine.llm.enabled,
        }

    @app.get("/api/assets", response_model=MapDataResponse)
    async def list_assets(
        maturity: Optional[int] = Query(default=None, description="Debt maturity year"),
        category: Optional[str] = Query(
            default=None, description="operational | financial | hybrid"
        ),
        min_score: float = Query(default=0.0, ge=0.0, le=100.0),
        force_refresh: bool = False,
    ) -> MapDataResponse:
        dataset = await engine.build_map_dataset(force_refresh=force_refresh)
        assets = _filter(
            dataset.assets, maturity=maturity, category=category, min_score=min_score
        )
        return MapDataResponse(
            assets=assets,
            generated_at=dataset.generated_at,
            source=dataset.source,
        )

    @app.get("/api/assets/{asset_id}", response_model=DistressAsset)
    async def get_asset(asset_id: str) -> DistressAsset:
        dataset = await engine.build_map_dataset()
        for asset in dataset.assets:
            if asset.asset_id == asset_id:
                return asset
        raise HTTPException(status_code=404, detail="asset not found")

    @app.get("/api/map-data", response_model=GeoJSONResponse)
    async def map_data(
        maturity: Optional[int] = Query(default=None),
        category: Optional[str] = Query(default=None),
        min_score: float = Query(default=0.0, ge=0.0, le=100.0),
    ) -> GeoJSONResponse:
        """Mapbox-ready GeoJSON FeatureCollection."""
        dataset = await engine.build_map_dataset()
        assets = _filter(
            dataset.assets, maturity=maturity, category=category, min_score=min_score
        )
        features: List[GeoFeature] = []
        for asset in assets:
            features.append(
                GeoFeature(
                    geometry={
                        "type": "Point",
                        "coordinates": [asset.lng, asset.lat],
                    },
                    properties={
                        "asset_id": asset.asset_id,
                        "address": asset.address,
                        "owner_reit": asset.owner_reit,
                        "ticker": asset.ticker,
                        "asset_type": asset.asset_type,
                        "debt_maturity_year": asset.debt_maturity_year,
                        "distress_category": asset.distress_category,
                        "distress_score": asset.distress_score,
                        "top_red_flags": asset.top_red_flags,
                        "severity": _severity(asset.distress_score),
                    },
                )
            )
        return GeoJSONResponse(
            features=features,
            generated_at=dataset.generated_at,
            source=dataset.source,
        )

    return app


def _filter(
    assets: List[DistressAsset],
    *,
    maturity: Optional[int],
    category: Optional[str],
    min_score: float,
) -> List[DistressAsset]:
    result = []
    for asset in assets:
        if maturity is not None and asset.debt_maturity_year != maturity:
            continue
        if category and asset.distress_category != category:
            continue
        if asset.distress_score < min_score:
            continue
        result.append(asset)
    result.sort(key=lambda a: a.distress_score, reverse=True)
    return result


def _severity(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


app = create_app()
