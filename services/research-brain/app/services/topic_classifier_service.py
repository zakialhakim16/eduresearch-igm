from collections import defaultdict

from app.schemas.classify import TopicClassifyRequest, TopicClassifyResponse


TOPIC_RULES = {
    "AI dan Data Science": ["machine learning", "deep learning", "data mining", "classification", "svm", "cnn"],
    "Cybersecurity": ["phishing", "malware", "intrusion", "cyber", "security", "forensics"],
    "Sistem Informasi": ["information system", "erp", "dashboard", "decision support", "website"],
    "Pendidikan Digital": ["education", "learning", "student", "classroom", "kampus", "lms"],
    "Kesehatan Digital": ["health", "medical", "diagnosis", "hospital", "patient"],
}


class TopicClassifierService:
    def classify(self, payload: TopicClassifyRequest) -> TopicClassifyResponse:
        haystack = " ".join([payload.title, payload.abstract or "", *payload.keywords, *payload.methods]).lower()
        scores = defaultdict(int)
        matched = defaultdict(list)

        for topic, keywords in TOPIC_RULES.items():
            for keyword in keywords:
                if keyword in haystack:
                    scores[topic] += 1
                    matched[topic].append(keyword)

        if not scores:
            return TopicClassifyResponse(
                primary_topic="Topik Umum Riset Kampus",
                confidence=0.25,
                matched_keywords=[],
                alternative_topics=["AI dan Data Science", "Sistem Informasi"],
            )

        ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        primary_topic, primary_score = ordered[0]
        total = sum(scores.values())
        confidence = round(primary_score / total, 2) if total else 0.0
        alternatives = [topic for topic, _ in ordered[1:3]]

        return TopicClassifyResponse(
            primary_topic=primary_topic,
            confidence=confidence,
            matched_keywords=matched[primary_topic],
            alternative_topics=alternatives,
        )
