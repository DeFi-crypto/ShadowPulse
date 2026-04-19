"""High-level orchestration: fan-out signal collection, run scoring, cache.

The service exposes a single :meth:`build_map_dataset` coroutine that the
REST layer calls. It enforces the async fan-out requirement and the mock
fallback requirement from the product spec.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

from .config import get_settings
from .models import (
    DistressAsset,
    DistressSignals,
    LienPulse,
    MapDataResponse,
    SECPulse,
    SentimentPulse,
    TenantExposure,
    WARNPulse,
)
from .scoring import apply_score
from .services import LLMService, LienService, SECService, SentimentService, WARNService

logger = logging.getLogger(__name__)


class ShadowPulseEngine:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.llm = LLMService()
        self.sec = SECService(llm=self.llm)
        self.warn = WARNService()
        self.lien = LienService()
        self.sentiment = SentimentService()
        self._cache: Optional[MapDataResponse] = None

    async def build_map_dataset(self, *, force_refresh: bool = False) -> MapDataResponse:
        if self._cache and not force_refresh:
            return self._cache

        mock = self._load_mock()
        seed_assets: List[Dict[str, Any]] = mock["assets"]

        live_source = False
        sec_index: Dict[str, SECPulse] = {}
        if self.settings.use_live_data:
            try:
                sec_index = await self._fetch_sec_batch(self.settings.reit_tickers)
                live_source = bool(sec_index)
            except Exception as exc:
                logger.warning("Live SEC fetch failed, falling back to mock: %s", exc)
                sec_index = {}

        async with httpx.AsyncClient(
            timeout=self.settings.http_timeout_seconds
        ) as client:
            enriched = await asyncio.gather(
                *(
                    self._enrich_asset(seed, client=client, sec_index=sec_index)
                    for seed in seed_assets
                )
            )

        verdicts = await asyncio.gather(
            *(self._verdict(asset) for asset in enriched)
        )
        for asset, verdict in zip(enriched, verdicts):
            asset.institutional_verdict = verdict

        response = MapDataResponse(
            assets=enriched,
            generated_at=datetime.now(timezone.utc).isoformat(),
            source="live" if live_source else "mock",
        )
        self._cache = response
        return response

    async def _fetch_sec_batch(self, tickers: List[str]) -> Dict[str, SECPulse]:
        async with httpx.AsyncClient(
            timeout=self.settings.http_timeout_seconds
        ) as client:
            pulses = await asyncio.gather(
                *(self.sec.fetch_latest_10q(t, client) for t in tickers),
                return_exceptions=True,
            )
        result: Dict[str, SECPulse] = {}
        for ticker, pulse in zip(tickers, pulses):
            if isinstance(pulse, SECPulse) and pulse.top_tenants:
                result[ticker.upper()] = pulse
        return result

    async def _enrich_asset(
        self,
        seed: Dict[str, Any],
        *,
        client: httpx.AsyncClient,
        sec_index: Dict[str, SECPulse],
    ) -> DistressAsset:
        ticker = seed["ticker"].upper()
        sec_pulse = sec_index.get(ticker) or self._sec_from_seed(seed)
        warn_pulse, lien_pulse, sentiment_pulse = await asyncio.gather(
            self._warn_pulse(seed, client),
            self._lien_pulse(seed),
            self._sentiment_pulse(seed),
        )
        signals = DistressSignals(
            sec_data=sec_pulse,
            warn=warn_pulse,
            lien=lien_pulse,
            sentiment=sentiment_pulse,
        )
        asset = DistressAsset(
            asset_id=seed["asset_id"],
            address=seed["address"],
            city=seed["city"],
            state=seed["state"],
            lat=seed["lat"],
            lng=seed["lng"],
            owner_reit=seed["owner_reit"],
            ticker=ticker,
            asset_type=seed.get("asset_type", "office"),
            debt_maturity_year=seed.get("debt_maturity_year", 2026),
            distress_category=seed.get("distress_category", "financial"),
            signals=signals,
        )
        return apply_score(asset)

    async def _warn_pulse(
        self, seed: Dict[str, Any], client: httpx.AsyncClient
    ) -> WARNPulse:
        if "warn" in seed and not self.settings.use_live_data:
            return WARNPulse(**seed["warn"])
        try:
            pulse = await self.warn.nearby(
                lat=seed["lat"],
                lng=seed["lng"],
                state=seed["state"],
                client=client,
            )
            if pulse.warn_count == 0 and "warn" in seed:
                return WARNPulse(**seed["warn"])
            return pulse
        except Exception as exc:
            logger.info("WARN enrich failed for %s: %s", seed["asset_id"], exc)
            if "warn" in seed:
                return WARNPulse(**seed["warn"])
            return WARNPulse()

    async def _lien_pulse(self, seed: Dict[str, Any]) -> LienPulse:
        if "lien" in seed and not self.settings.use_live_data:
            return LienPulse(**seed["lien"])
        return await self.lien.detect(
            asset_id=seed["asset_id"], address=seed["address"]
        )

    async def _sentiment_pulse(self, seed: Dict[str, Any]) -> SentimentPulse:
        if "sentiment" in seed and not self.settings.use_live_data:
            return SentimentPulse(**seed["sentiment"])
        return await self.sentiment.analyze(
            asset_id=seed["asset_id"], address=seed["address"]
        )

    @staticmethod
    def _sec_from_seed(seed: Dict[str, Any]) -> SECPulse:
        raw = seed.get("sec_data") or {}
        tenants = [TenantExposure(**t) for t in raw.get("top_tenants", [])]
        npl_delta = raw.get("npl_delta_pct")
        if npl_delta is None and raw.get("npl_current") and raw.get("npl_previous"):
            npl_delta = (
                (raw["npl_current"] - raw["npl_previous"]) / raw["npl_previous"] * 100.0
            )
        return SECPulse(
            ticker=raw.get("ticker", seed["ticker"]),
            filing_date=raw.get("filing_date"),
            npl_current=raw.get("npl_current"),
            npl_previous=raw.get("npl_previous"),
            npl_delta_pct=npl_delta,
            acl_commercial=raw.get("acl_commercial"),
            acl_commercial_previous=raw.get("acl_commercial_previous"),
            top_tenants=tenants,
            source_url=raw.get("source_url"),
        )

    async def _verdict(self, asset: DistressAsset) -> str:
        summary = {
            "npl_delta_pct": asset.signals.sec_data.npl_delta_pct,
            "acl_commercial": asset.signals.sec_data.acl_commercial,
            "warn_count": asset.signals.warn.warn_count,
            "lien_status": asset.signals.lien.lien_status,
            "sentiment_vibe": asset.signals.sentiment.vibe,
            "top_tenant": (
                asset.signals.sec_data.top_tenants[0].dict()
                if asset.signals.sec_data.top_tenants
                else None
            ),
        }
        return await self.llm.institutional_verdict(
            reit_name=asset.owner_reit,
            address=asset.address,
            distress_score=asset.distress_score,
            red_flags=asset.top_red_flags,
            signals_summary=summary,
        )

    def _load_mock(self) -> Dict[str, Any]:
        path = Path(self.settings.mock_data_path)
        if not path.is_absolute():
            path = Path(__file__).parent.parent / path
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
