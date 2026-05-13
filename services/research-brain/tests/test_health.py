from app.services.proposal_scoring_service import ProposalScoringService
from app.schemas.scoring import ProposalScoreRequest
from app.services.topic_classifier_service import TopicClassifierService
from app.schemas.classify import TopicClassifyRequest


def test_proposal_scoring_returns_reasonable_total():
    service = ProposalScoringService()
    result = service.score(
        ProposalScoreRequest(
            title="Deteksi Phishing Website Menggunakan SVM dan Chi-Square",
            abstract="Penelitian ini membahas klasifikasi phishing website menggunakan dataset dan evaluasi model.",
            problem_statement="Serangan phishing terus meningkat dan sistem deteksi yang akurat dibutuhkan di lingkungan kampus.",
            objectives=["Membangun model klasifikasi", "Mengevaluasi performa model"],
            methods=["support vector machine", "chi-square", "stratified k-fold"],
            references=["Paper A DOI:10.1000/xyz123", "Paper B 2024", "Paper C 2023", "Paper D 2022", "Paper E 2021"],
            keywords=["phishing", "svm", "feature selection"],
            expected_contribution="Memberikan model deteksi awal yang dapat dipakai sebagai referensi sistem keamanan kampus.",
        )
    )
    assert result.total_score >= 30


def test_topic_classifier_detects_cybersecurity():
    service = TopicClassifierService()
    result = service.classify(
        TopicClassifyRequest(
            title="Klasifikasi Phishing Website dengan Support Vector Machine",
            keywords=["phishing", "svm", "cybersecurity"],
            methods=["classification"],
        )
    )
    assert result.primary_topic in {"Cybersecurity", "AI dan Data Science"}
