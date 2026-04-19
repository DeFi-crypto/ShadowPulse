"""OpenAI-backed LLM helper with graceful degradation.

Every method accepts a structured prompt and returns JSON when possible.
If no API key is configured or the SDK call fails, the service falls back
to a deterministic heuristic so the backend remains fully operational.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from ..config import get_settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Optional[Any] = None
        if self.settings.openai_api_key:
            try:
                from openai import AsyncOpenAI

                self._client = AsyncOpenAI(api_key=self.settings.openai_api_key)
            except Exception as exc:
                logger.warning("OpenAI SDK unavailable: %s", exc)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def extract_sec_metrics(self, ticker: str, filing_text: str) -> Dict[str, Any]:
        """Extract NPL, ACL, and top 5 tenants from a 10-Q document."""
        schema_hint = {
            "npl_current": "number | null",
            "npl_previous": "number | null",
            "acl_commercial": "number | null",
            "acl_commercial_previous": "number | null",
            "top_tenants": [{"name": "string", "pct_abr": "number", "sector": "string"}],
            "filing_date": "YYYY-MM-DD | null",
        }
        if not self.enabled:
            return {}
        prompt = (
            "You are a financial forensics analyst. Extract JSON matching this schema "
            f"from the 10-Q excerpt for {ticker}. Return only valid JSON.\n\n"
            f"SCHEMA:\n{json.dumps(schema_hint)}\n\n"
            "Rules:\n"
            "- npl_current / npl_previous: 'Non-Performing Loans' in USD (current vs prior quarter).\n"
            "- acl_commercial: 'Allowance for Credit Losses' for Commercial segment only.\n"
            "- top_tenants: Top 5 by % of annualized base rent (ABR).\n"
            "- If a field is absent return null.\n\n"
            f"FILING_EXCERPT:\n{filing_text[:18000]}"
        )
        try:
            response = await self._client.chat.completions.create(  # type: ignore[union-attr]
                model=self.settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.0,
            )
            return json.loads(response.choices[0].message.content or "{}")
        except Exception as exc:
            logger.warning("LLM extraction failed for %s: %s", ticker, exc)
            return {}

    async def institutional_verdict(
        self,
        *,
        reit_name: str,
        address: str,
        distress_score: float,
        red_flags: List[str],
        signals_summary: Dict[str, Any],
    ) -> str:
        """Generate the 'SELL/SHORT' style verdict."""
        if not self.enabled:
            return self._heuristic_verdict(
                reit_name, distress_score, red_flags, signals_summary
            )
        prompt = (
            "You are an institutional real-estate short-seller writing a 2-3 sentence "
            "verdict. Start with 'BUY', 'HOLD', 'SELL', or 'SHORT'. Be crisp, "
            "evidence-driven, no hedging.\n\n"
            f"ASSET: {address}\nOWNER: {reit_name}\n"
            f"DISTRESS_SCORE: {distress_score}/100\n"
            f"TOP_RED_FLAGS: {red_flags}\n"
            f"SIGNALS: {json.dumps(signals_summary)[:4000]}\n"
        )
        try:
            response = await self._client.chat.completions.create(  # type: ignore[union-attr]
                model=self.settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("LLM verdict failed: %s", exc)
            return self._heuristic_verdict(
                reit_name, distress_score, red_flags, signals_summary
            )

    @staticmethod
    def _heuristic_verdict(
        reit_name: str,
        distress_score: float,
        red_flags: List[str],
        signals_summary: Dict[str, Any],
    ) -> str:
        if distress_score >= 75:
            action = "SHORT"
            thesis = (
                "Imminent default risk. Multiple coincident distress signals indicate "
                "balance-sheet stress that CMBS lenders cannot ignore."
            )
        elif distress_score >= 55:
            action = "SELL"
            thesis = (
                "Deteriorating fundamentals with rising NPL trajectory and tenant risk. "
                "Expect multiple compression as refinancing risk prices in."
            )
        elif distress_score >= 35:
            action = "HOLD"
            thesis = (
                "Mixed signals. Operational softness is contained for now but warrants "
                "quarterly re-evaluation."
            )
        else:
            action = "BUY"
            thesis = (
                "Clean balance sheet, stable tenant mix. Limited downside catalysts in "
                "the near term."
            )
        flags_str = "; ".join(red_flags[:3]) or "no material red flags"
        return (
            f"{action} Recommendation: {reit_name} @ score {distress_score}/100. "
            f"{thesis} Drivers: {flags_str}."
        )
