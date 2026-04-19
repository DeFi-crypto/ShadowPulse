"""Weighted scoring algorithm for ShadowPulse distress signals.

FinalScore = (NPL Delta * 0.3)
           + (WARN Intensity * 0.2)
           + (Review Sentiment Decay * 0.2)
           + (Lien Presence * 0.2)
           + (Tenant Concentration Risk * 0.1)

Every sub-component is normalized to a 0..100 scale before weighting.
A filed Mechanic's Lien also adds an immediate +20 "alarm" modifier per
product spec (capped at 100).
"""

from __future__ import annotations

from typing import List, Tuple

from .models import (
    DistressAsset,
    DistressSignals,
    LienPulse,
    SECPulse,
    SentimentPulse,
    WARNPulse,
)


def _clip(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def score_npl_delta(sec: SECPulse) -> float:
    """Normalize NPL growth quarter-over-quarter to 0..100.

    Anchors: 0% delta -> 0; +50% delta -> 75; >= +100% -> 100.
    Negative deltas score 0.
    """
    delta = sec.npl_delta_pct
    if delta is None:
        return 0.0
    if delta <= 0:
        return 0.0
    if delta >= 100:
        return 100.0
    # Piecewise linear with concave bias
    return _clip(delta * 1.3)


def score_warn_intensity(warn: WARNPulse) -> float:
    """Blend raw WARN count with proximity.

    Counts >= 6 saturate at 100. If nearest layoff is < 1mi, boost 20%.
    """
    base = _clip(warn.warn_count * 15.0)
    if warn.nearest_miles is not None and warn.nearest_miles < 1.0:
        base = _clip(base * 1.2)
    return base


def score_sentiment_decay(sentiment: SentimentPulse) -> float:
    """Convert sentiment score (-1..1) into distress intensity 0..100.

    A score of -1 (most negative) -> 100, 0 (neutral) -> 50, +1 -> 0.
    Additional penalty per flagged critical keyword, capped at 100.
    """
    base = (1.0 - sentiment.score) * 50.0  # -1->100, 0->50, 1->0
    penalty = min(len(sentiment.keywords) * 5.0, 25.0)
    return _clip(base + penalty)


def score_lien_presence(lien: LienPulse) -> Tuple[float, float]:
    """Return (component_score, alarm_bonus).

    Per spec, a filed lien triggers an immediate +20 alarm bonus.
    Pending liens trigger +10.
    """
    if lien.lien_status == "filed":
        return (100.0, 20.0)
    if lien.lien_status == "pending":
        return (60.0, 10.0)
    return (0.0, 0.0)


def score_tenant_concentration(sec: SECPulse) -> float:
    """Herfindahl-style concentration on top 5 tenants.

    Top tenant > 15% ABR is a red line (100). Sum of top 5 > 40% contributes
    additional linear pressure.
    """
    if not sec.top_tenants:
        return 0.0
    tenants = sec.top_tenants[:5]
    top_share = max(t.pct_abr for t in tenants)
    top5_sum = sum(t.pct_abr for t in tenants)
    top_score = _clip((top_share / 20.0) * 100.0)
    sum_score = _clip(((top5_sum - 20.0) / 30.0) * 100.0) if top5_sum > 20 else 0.0
    return _clip(0.6 * top_score + 0.4 * sum_score)


def compute_distress_score(signals: DistressSignals) -> Tuple[float, List[str]]:
    """Return weighted score plus 3 most severe red flags."""
    npl = score_npl_delta(signals.sec_data)
    warn = score_warn_intensity(signals.warn)
    sentiment = score_sentiment_decay(signals.sentiment)
    lien_component, lien_alarm = score_lien_presence(signals.lien)
    tenants = score_tenant_concentration(signals.sec_data)

    weighted = (
        (npl * 0.30)
        + (warn * 0.20)
        + (sentiment * 0.20)
        + (lien_component * 0.20)
        + (tenants * 0.10)
    )
    final = _clip(weighted + lien_alarm)

    components = [
        ("NPL surge +{:.0f}% QoQ".format(signals.sec_data.npl_delta_pct or 0), npl),
        ("{} WARN notices within {:.1f}mi".format(
            signals.warn.warn_count,
            signals.warn.nearest_miles if signals.warn.nearest_miles is not None else 5.0,
        ), warn),
        ("Retail sentiment: {}".format(signals.sentiment.vibe), sentiment),
        ("Mechanic's lien: {}".format(signals.lien.lien_status), lien_component),
        ("Top tenant concentration {:.1f}% ABR".format(
            max((t.pct_abr for t in signals.sec_data.top_tenants), default=0.0)
        ), tenants),
    ]
    components.sort(key=lambda kv: kv[1], reverse=True)
    flags = [label for label, score in components[:3] if score > 0]
    return round(final, 2), flags


def apply_score(asset: DistressAsset) -> DistressAsset:
    score, flags = compute_distress_score(asset.signals)
    asset.distress_score = score
    asset.top_red_flags = flags
    return asset
