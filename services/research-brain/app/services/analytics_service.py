from collections import Counter

from app.schemas.analytics import CountBucket, ResearchMapRequest, ResearchMapResponse
from app.services.topic_classifier_service import TopicClassifierService
from app.schemas.classify import TopicClassifyRequest


class AnalyticsService:
    def build_map(self, payload: ResearchMapRequest) -> ResearchMapResponse:
        topic_counter = Counter()
        method_counter = Counter()
        keyword_counter = Counter()
        year_counter = Counter()
        classifier = TopicClassifierService()

        for item in payload.items:
            topic = item.topic
            if not topic:
                topic = classifier.classify(
                    TopicClassifyRequest(
                        title=item.title,
                        keywords=item.keywords,
                        methods=item.methods,
                    )
                ).primary_topic

            topic_counter[topic] += 1
            method_counter.update(item.methods)
            keyword_counter.update(item.keywords)
            if item.year:
                year_counter[str(item.year)] += 1

        return ResearchMapResponse(
            total_items=len(payload.items),
            top_topics=self._to_buckets(topic_counter),
            top_methods=self._to_buckets(method_counter),
            top_keywords=self._to_buckets(keyword_counter),
            year_distribution=self._to_buckets(year_counter),
        )

    def _to_buckets(self, counter: Counter) -> list[CountBucket]:
        return [CountBucket(key=key, count=count) for key, count in counter.most_common(8)]
