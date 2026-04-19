"""Minimal smoke test harness runnable without pytest."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.engine import ShadowPulseEngine
from app.scoring import compute_distress_score
from app.models import (
    DistressSignals,
    LienPulse,
    SECPulse,
    SentimentPulse,
    TenantExposure,
    WARNPulse,
)


def test_scoring_bounds():
    signals = DistressSignals(
        sec_data=SECPulse(
            ticker="XXX",
            npl_current=100,
            npl_previous=50,
            npl_delta_pct=100.0,
            top_tenants=[TenantExposure(name="X", pct_abr=20)],
        ),
        warn=WARNPulse(warn_count=10, nearest_miles=0.5),
        lien=LienPulse(lien_status="filed", count=2),
        sentiment=SentimentPulse(vibe="critical", score=-0.7),
    )
    score, flags = compute_distress_score(signals)
    assert 0 <= score <= 100, f"score out of bounds: {score}"
    assert len(flags) <= 3
    print(f"  High-stress score: {score}, flags: {flags}")


def test_zero_signals():
    signals = DistressSignals(
        sec_data=SECPulse(ticker="YYY"),
        warn=WARNPulse(),
        lien=LienPulse(),
        sentiment=SentimentPulse(vibe="neutral", score=0.0),
    )
    score, flags = compute_distress_score(signals)
    assert score < 30, f"zero-signal score should be low, got {score}"
    print(f"  Zero score: {score}, flags: {flags}")


async def test_engine_builds_dataset():
    engine = ShadowPulseEngine()
    response = await engine.build_map_dataset()
    assert response.assets, "expected assets"
    assert all(0 <= a.distress_score <= 100 for a in response.assets)
    assert all(a.institutional_verdict for a in response.assets)
    print(f"  Engine produced {len(response.assets)} assets from {response.source}")
    sample = response.assets[0]
    print(f"  Top asset: {sample.asset_id} score={sample.distress_score}")
    print(f"  Verdict: {sample.institutional_verdict}")


def main():
    print("Running ShadowPulse smoke tests...")
    test_scoring_bounds()
    test_zero_signals()
    asyncio.run(test_engine_builds_dataset())
    print("OK")


if __name__ == "__main__":
    main()
