"""Mockable Mechanic's Lien detector.

A real implementation would query each county recorder's portal (often
behind CAPTCHAs and paid APIs such as PropertyRadar, DataTree, ACRIS for
NYC, etc.). This module ships a deterministic mock that seeds its answer
off of an address hash so UI testing remains stable across runs, but
exposes a public :meth:`detect` API so the real integration can slot in.
"""

from __future__ import annotations

import hashlib
from typing import List

from ..models import LienPulse

# Realistic construction plaintiffs seeded into the mock generator.
_CONSTRUCTION_COMPANIES = [
    "Turner Construction",
    "Skanska USA Civil NE",
    "Tishman Construction",
    "Five Star Electric",
    "Permasteelisa North America",
    "Atlantic Glass & Mirror",
]


class LienService:
    def __init__(self, *, seed_salt: str = "shadowpulse-v1") -> None:
        self._salt = seed_salt

    async def detect(self, *, asset_id: str, address: str) -> LienPulse:
        """Pseudo-deterministic lien detection keyed on asset_id+address.

        ~40% of assets return a filed lien, ~15% pending, remainder clear.
        """
        digest = hashlib.sha256(
            f"{self._salt}:{asset_id}:{address}".encode("utf-8")
        ).digest()
        bucket = digest[0] % 100
        count_nibble = digest[1] % 3 + 1

        if bucket < 40:
            filings = self._synth_filings(digest, count=count_nibble)
            return LienPulse(
                lien_status="filed",
                count=len(filings),
                filings=filings,
            )
        if bucket < 55:
            filings = self._synth_filings(digest, count=1, pending=True)
            return LienPulse(
                lien_status="pending",
                count=1,
                filings=filings,
            )
        return LienPulse(lien_status="clear", count=0, filings=[])

    @staticmethod
    def _synth_filings(digest: bytes, *, count: int, pending: bool = False) -> List[str]:
        filings: List[str] = []
        for i in range(count):
            company = _CONSTRUCTION_COMPANIES[digest[2 + i] % len(_CONSTRUCTION_COMPANIES)]
            amount = 50_000 + ((digest[5 + i] * 17_000) % 3_500_000)
            suffix = " (pending adjudication)" if pending else ""
            filings.append(
                f"{company} - ${amount/1_000:.0f}K mechanic's lien{suffix}"
            )
        return filings
