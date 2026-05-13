from __future__ import annotations

import httpx

from app.core.config import get_settings


class CrossrefService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def lookup_doi(self, doi: str) -> dict:
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.get(f"{self.settings.crossref_base_url}/works/{doi}")
            response.raise_for_status()
            return response.json()
