from __future__ import annotations

from collections import defaultdict
import math
import re

from app.schemas.common import PaperResult
from app.schemas.recommend import RecommendPapersRequest
from app.services.openalex_service import OpenAlexPaper


TOKEN_RE = re.compile(r"[a-zA-Z0-9\-]+")


class RetrievalService:
    def build_recommendation_queries(self, payload: RecommendPapersRequest) -> list[str]:
        queries = [
            payload.title.strip(),
            " ".join(payload.keywords[:6]).strip(),
            " ".join([payload.title, *payload.methods[:3]]).strip(),
            " ".join([*payload.keywords[:4], *payload.methods[:3]]).strip(),
        ]
        deduped = []
        for query in queries:
            cleaned = re.sub(r"\s+", " ", query).strip()
            if cleaned and cleaned not in deduped:
                deduped.append(cleaned)
        return deduped[:4]

    def rank_papers(self, query: str, works: list[OpenAlexPaper], mode: str) -> list[PaperResult]:
        query_tokens = self._tokenize(query)
        ranked: list[PaperResult] = []

        for work in works:
            title_tokens = self._tokenize(work.title)
            abstract_tokens = self._tokenize(work.abstract or "")

            title_overlap = len(query_tokens & title_tokens)
            abstract_overlap = len(query_tokens & abstract_tokens)
            recency_bonus = max(0, (work.year or 2018) - 2019)
            citation_bonus = min(20, int(math.log1p(work.cited_by_count) * 4))
            oa_bonus = 4 if work.open_access else 0

            if mode == "semantic":
                score = (title_overlap * 14) + (abstract_overlap * 6) + recency_bonus + citation_bonus + oa_bonus
            else:
                phrase_bonus = 12 if query.lower() in (work.title or "").lower() else 0
                score = (
                    (title_overlap * 12)
                    + (abstract_overlap * 7)
                    + phrase_bonus
                    + recency_bonus
                    + citation_bonus
                    + oa_bonus
                )

            reasons = []
            if title_overlap:
                reasons.append(f"Judul cocok pada {title_overlap} token penting")
            if abstract_overlap:
                reasons.append(f"Abstrak relevan pada {abstract_overlap} token")
            if work.open_access:
                reasons.append("Open access")
            if work.year and work.year >= 2022:
                reasons.append("Publikasi relatif baru")
            if work.cited_by_count >= 20:
                reasons.append("Memiliki sitasi yang cukup kuat")

            ranked.append(
                PaperResult(
                    source_id=work.source_id,
                    doi=work.doi,
                    title=work.title,
                    year=work.year,
                    journal=work.journal,
                    authors=work.authors,
                    abstract=work.abstract,
                    url=work.url,
                    cited_by_count=work.cited_by_count,
                    open_access=work.open_access,
                    score=float(score),
                    match_reason=reasons,
                )
            )

        ranked.sort(key=lambda item: (item.score, item.cited_by_count, item.year or 0), reverse=True)
        return self._dedupe_by_source(ranked)

    def rank_recommendations(self, payload: RecommendPapersRequest, works: list[OpenAlexPaper]) -> list[PaperResult]:
        signals = " ".join(
            [payload.title, payload.abstract or "", *payload.keywords, *payload.methods, payload.document_type or ""]
        )
        base_ranked = self.rank_papers(signals, works, mode="hybrid")

        method_tokens = self._tokenize(" ".join(payload.methods))
        boosted = []
        for item in base_ranked:
            item_tokens = self._tokenize(" ".join(filter(None, [item.title, item.abstract or "", item.journal or ""])))
            method_overlap = len(method_tokens & item_tokens)
            if method_overlap:
                item.score += method_overlap * 10
                item.match_reason.append(f"Cocok dengan metode pada {method_overlap} sinyal")
            boosted.append(item)

        boosted.sort(key=lambda item: (item.score, item.cited_by_count, item.year or 0), reverse=True)
        return boosted

    def _dedupe_by_source(self, ranked: list[PaperResult]) -> list[PaperResult]:
        seen = set()
        unique = []
        for item in ranked:
            key = item.source_id or item.doi or item.title
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)
        return unique

    def _tokenize(self, text: str) -> set[str]:
        stop_words = {
            "dan",
            "yang",
            "untuk",
            "dengan",
            "pada",
            "dari",
            "the",
            "of",
            "in",
            "for",
            "using",
            "analysis",
        }
        return {
            token.lower()
            for token in TOKEN_RE.findall(text.lower())
            if len(token) >= 3 and token.lower() not in stop_words
        }
