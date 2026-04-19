"""Retail sentiment scraper.

Production would integrate with Google Places API / Yelp Fusion. For the
MVP we ship a pluggable scraper interface, a keyword-driven sentiment
engine, and a deterministic mock corpus so the War Map renders even when
API keys are absent.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Iterable, List, Tuple

from ..models import SentimentPulse

logger = logging.getLogger(__name__)

CRITICAL_KEYWORDS = {
    "closing": -0.35,
    "closed": -0.25,
    "abandoned": -0.45,
    "going out of business": -0.55,
    "broken elevators": -0.3,
    "broken escalators": -0.3,
    "reduced hours": -0.2,
    "ghost": -0.25,
    "empty": -0.15,
    "subleasing": -0.3,
    "for lease": -0.15,
}

POSITIVE_KEYWORDS = {
    "beautiful": 0.2,
    "vibrant": 0.3,
    "bustling": 0.35,
    "renovated": 0.2,
    "fantastic": 0.3,
}

# Seeded mock reviews - deterministic per asset based on sha256 buckets.
MOCK_CORPUS = [
    "Escalators have been broken for 3 weeks, no ETA from building management.",
    "Reduced hours on weekends, lobby feels half-empty.",
    "Several tenants quietly subleasing their floors.",
    "Third floor completely abandoned, feels like a ghost mall.",
    "Going out of business sales at 4 different stores.",
    "Macy's sub-floor already abandoned.",
    "Reduced hours, closes at 7pm on weekdays now.",
    "Lobby renovation taking longer than expected.",
    "Renovated lobby is beautiful and always bustling.",
    "Fantastic food hall, vibrant midday crowd.",
    "Broken elevators bank on the 30-45 floors, been 2 weeks.",
    "Reduced hours at lobby cafe, feels grim.",
    "Broken escalators and smells like mildew in the concourse.",
    "Half the storefronts have 'for lease' signs.",
]


class SentimentService:
    def __init__(self, *, seed_salt: str = "shadowpulse-v1") -> None:
        self._salt = seed_salt

    async def analyze(
        self, *, asset_id: str, address: str, reviews: Iterable[str] | None = None
    ) -> SentimentPulse:
        corpus = list(reviews) if reviews else self._sample_mock_corpus(asset_id, address)
        score, keywords = self._score(corpus)
        vibe = self._vibe(score)
        flagged = [r for r in corpus if self._has_flag(r)]
        return SentimentPulse(
            vibe=vibe,
            score=round(score, 3),
            flagged_reviews=flagged[:5],
            keywords=sorted(set(keywords)),
        )

    def _sample_mock_corpus(self, asset_id: str, address: str) -> List[str]:
        digest = hashlib.sha256(
            f"{self._salt}:{asset_id}:{address}".encode("utf-8")
        ).digest()
        bucket = digest[0] % 100
        if bucket < 25:
            indices = [0, 1, 2, 10, 11]
        elif bucket < 55:
            indices = [3, 4, 5, 6, 12, 13]
        elif bucket < 80:
            indices = [7, 8, 9]
        else:
            indices = [0, 3, 6, 9]
        return [MOCK_CORPUS[i] for i in indices]

    @staticmethod
    def _score(reviews: Iterable[str]) -> Tuple[float, List[str]]:
        score = 0.0
        count = 0
        found: List[str] = []
        for review in reviews:
            count += 1
            lower = review.lower()
            for kw, delta in CRITICAL_KEYWORDS.items():
                if kw in lower:
                    score += delta
                    found.append(kw)
            for kw, delta in POSITIVE_KEYWORDS.items():
                if kw in lower:
                    score += delta
        if count == 0:
            return 0.0, []
        avg = max(-1.0, min(1.0, score / count))
        return avg, found

    @staticmethod
    def _vibe(score: float) -> str:
        if score <= -0.5:
            return "critical"
        if score <= -0.25:
            return "negative"
        if score <= -0.05:
            return "cautionary"
        if score < 0.15:
            return "neutral"
        return "positive"

    @staticmethod
    def _has_flag(review: str) -> bool:
        lower = review.lower()
        return any(kw in lower for kw in CRITICAL_KEYWORDS)
