from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import get_settings


@dataclass
class OpenAlexPaper:
    source_id: str | None
    doi: str | None
    title: str
    year: int | None
    journal: str | None
    authors: list[str]
    abstract: str | None
    url: str | None
    cited_by_count: int
    open_access: bool


class OpenAlexService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def search_works(self, query: str, per_page: int = 10) -> list[OpenAlexPaper]:
        params = {
            "search": query,
            "per-page": str(per_page),
            "mailto": self.settings.openalex_mailto,
            "sort": "relevance_score:desc",
        }
        timeout = self.settings.request_timeout_seconds

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(f"{self.settings.openalex_base_url}/works", params=params)
            response.raise_for_status()
            payload = response.json()

        results = []
        for item in payload.get("results", []):
            authors = [
                authorship.get("author", {}).get("display_name")
                for authorship in item.get("authorships", [])
                if authorship.get("author", {}).get("display_name")
            ]
            results.append(
                OpenAlexPaper(
                    source_id=item.get("id"),
                    doi=item.get("doi"),
                    title=item.get("title") or "Tanpa judul",
                    year=item.get("publication_year"),
                    journal=(item.get("primary_location") or {}).get("source", {}).get("display_name"),
                    authors=authors[:6],
                    abstract=self._abstract_from_inverted_index(item.get("abstract_inverted_index")),
                    url=(item.get("open_access") or {}).get("oa_url")
                    or (item.get("primary_location") or {}).get("landing_page_url")
                    or item.get("doi"),
                    cited_by_count=item.get("cited_by_count", 0) or 0,
                    open_access=(item.get("open_access") or {}).get("is_oa", False) or False,
                )
            )
        return results

    @staticmethod
    def _abstract_from_inverted_index(index: dict[str, list[int]] | None) -> str | None:
        if not index:
            return None

        positioned_words = []
        for word, positions in index.items():
            for position in positions:
                positioned_words.append((position, word))

        return " ".join(word for _, word in sorted(positioned_words))
