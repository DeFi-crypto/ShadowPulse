"""SEC EDGAR 10-Q parser.

Fetches the most recent 10-Q for a ticker via the EDGAR JSON API, pulls a
subset of the filing HTML, and delegates extraction of NPL / ACL / top
tenant data to :class:`LLMService`. If any step fails (rate limit, parse
error, missing API key), an empty :class:`SECPulse` is returned so the
caller can fall back to mock data.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

import httpx

from ..config import get_settings
from ..models import SECPulse, TenantExposure
from .llm_service import LLMService

logger = logging.getLogger(__name__)

# Hard-coded CIK map keeps us independent of the ticker->CIK lookup endpoint,
# which itself has aggressive rate limits. Extend as needed.
CIK_MAP: Dict[str, str] = {
    "SLG": "1040971",
    "BXP": "1037540",
    "VNO": "899689",
    "KRG": "1286043",
    "MAC": "912242",
}


class SECService:
    def __init__(self, llm: Optional[LLMService] = None) -> None:
        self.settings = get_settings()
        self.llm = llm or LLMService()
        self._semaphore = asyncio.Semaphore(self.settings.sec_rate_limit_per_second)

    async def fetch_latest_10q(
        self, ticker: str, client: httpx.AsyncClient
    ) -> SECPulse:
        cik = CIK_MAP.get(ticker.upper())
        if not cik:
            return SECPulse(ticker=ticker)
        headers = {"User-Agent": self.settings.sec_user_agent}
        submissions_url = f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json"
        try:
            async with self._semaphore:
                resp = await client.get(submissions_url, headers=headers)
            if resp.status_code != 200:
                logger.warning("SEC submissions %s -> %s", ticker, resp.status_code)
                return SECPulse(ticker=ticker)
            data = resp.json()
            filing = self._pick_latest_10q(data)
            if not filing:
                return SECPulse(ticker=ticker)
            accession = filing["accessionNumber"].replace("-", "")
            primary_doc = filing["primaryDocument"]
            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/"
                f"{accession}/{primary_doc}"
            )
            async with self._semaphore:
                doc_resp = await client.get(filing_url, headers=headers)
            if doc_resp.status_code != 200:
                return SECPulse(
                    ticker=ticker,
                    filing_date=filing.get("filingDate"),
                    source_url=filing_url,
                )
            extracted = await self.llm.extract_sec_metrics(ticker, doc_resp.text)
            return self._build_pulse(
                ticker=ticker,
                filing_date=filing.get("filingDate"),
                source_url=filing_url,
                extracted=extracted,
            )
        except Exception as exc:
            logger.warning("SEC fetch failed for %s: %s", ticker, exc)
            return SECPulse(ticker=ticker)

    @staticmethod
    def _pick_latest_10q(submissions: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        recent = submissions.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        for idx, form in enumerate(forms):
            if form == "10-Q":
                return {
                    "accessionNumber": recent["accessionNumber"][idx],
                    "primaryDocument": recent["primaryDocument"][idx],
                    "filingDate": recent["filingDate"][idx],
                }
        return None

    @staticmethod
    def _build_pulse(
        *,
        ticker: str,
        filing_date: Optional[str],
        source_url: Optional[str],
        extracted: Dict[str, Any],
    ) -> SECPulse:
        npl_current = extracted.get("npl_current")
        npl_previous = extracted.get("npl_previous")
        delta_pct: Optional[float] = None
        if npl_current and npl_previous and npl_previous > 0:
            delta_pct = ((npl_current - npl_previous) / npl_previous) * 100.0
        tenants = [
            TenantExposure(**t)
            for t in (extracted.get("top_tenants") or [])
            if isinstance(t, dict) and t.get("name") and t.get("pct_abr") is not None
        ]
        return SECPulse(
            ticker=ticker,
            filing_date=extracted.get("filing_date") or filing_date,
            npl_current=npl_current,
            npl_previous=npl_previous,
            npl_delta_pct=delta_pct,
            acl_commercial=extracted.get("acl_commercial"),
            acl_commercial_previous=extracted.get("acl_commercial_previous"),
            top_tenants=tenants,
            source_url=source_url,
        )
