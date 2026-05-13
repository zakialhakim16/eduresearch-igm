from fastapi.testclient import TestClient

from app.main import app
from app.services.openalex_service import OpenAlexPaper, OpenAlexService


client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_classify_topic_fallback_endpoint():
    response = client.post(
        '/classify/topic',
        json={
            'title': 'Kajian Awal Pola Narasi Lokal dalam Arsip Komunitas',
            'keywords': [],
            'methods': [],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['primary_topic'] == 'Topik Umum Riset Kampus'
    assert payload['confidence'] == 0.25


def test_score_proposal_endpoint():
    response = client.post(
        '/score/proposal',
        json={
            'title': 'Analisis Dashboard Akademik untuk Monitoring Riset Mahasiswa',
            'abstract': 'Penelitian ini membahas dashboard akademik berbasis dataset untuk monitoring riset mahasiswa.',
            'problem_statement': 'Proses monitoring riset mahasiswa belum memiliki pemetaan yang konsisten sehingga dosen sulit melihat perkembangan topik, metode, dan referensi yang dipakai mahasiswa secara cepat.',
            'objectives': ['Membangun dashboard', 'Mengevaluasi kebutuhan informasi'],
            'methods': ['dashboard', 'user evaluation'],
            'references': ['Paper A DOI:10.1000/demo', 'Paper B 2024', 'Paper C 2023', 'Paper D 2022', 'Paper E 2021'],
            'keywords': ['dashboard', 'academic monitoring', 'research analytics'],
            'expected_contribution': 'Memberikan peta monitoring riset yang dapat membantu dosen melihat pola topik dan kebutuhan bimbingan mahasiswa secara lebih cepat.',
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['total_score'] > 0
    assert payload['max_score'] == 50
    assert payload['rubric']


def test_recommend_papers_endpoint_with_mocked_openalex(monkeypatch):
    async def fake_search_works(self, query: str, per_page: int = 10):
        return [
            OpenAlexPaper(
                source_id='https://openalex.org/W1',
                doi='https://doi.org/10.1000/demo',
                title='Research Analytics Dashboard for Higher Education',
                year=2024,
                journal='Journal of Academic Analytics',
                authors=['A. Researcher'],
                abstract='A dashboard for student research analytics and monitoring.',
                url='https://example.test/paper',
                cited_by_count=12,
                open_access=True,
            )
        ]

    monkeypatch.setattr(OpenAlexService, 'search_works', fake_search_works)

    response = client.post(
        '/recommend/papers',
        json={
            'title': 'Research analytics dashboard for student supervision',
            'abstract': 'Dashboard untuk memantau riset mahasiswa.',
            'keywords': ['research analytics', 'dashboard'],
            'methods': ['dashboard'],
            'document_type': 'proposal',
            'limit': 5,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['total'] >= 1
    assert payload['results'][0]['source_id'] == 'https://openalex.org/W1'
