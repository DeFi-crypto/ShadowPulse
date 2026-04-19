"""Vercel serverless entrypoint for the ShadowPulse FastAPI backend.

Vercel's `@vercel/python` runtime discovers a WSGI/ASGI `app` exported
from files under `api/`. We re-export the existing FastAPI instance from
`app.main` so the same code powers local uvicorn and the Vercel
serverless function.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make the sibling `app/` package importable when Vercel runs this file.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402

__all__ = ["app"]
