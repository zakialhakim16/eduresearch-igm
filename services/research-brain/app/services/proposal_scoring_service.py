from app.schemas.scoring import ProposalScoreRequest, ProposalScoreResponse, RubricScore


class ProposalScoringService:
    def score(self, payload: ProposalScoreRequest) -> ProposalScoreResponse:
        rubric = [
            self._score_problem_clarity(payload),
            self._score_method_readiness(payload),
            self._score_reference_strength(payload),
            self._score_contribution(payload),
            self._score_focus(payload),
        ]

        total_score = sum(item.score for item in rubric)
        max_score = sum(item.max_score for item in rubric)

        strengths = []
        weaknesses = []
        recommendations = []

        for item in rubric:
            if item.score >= item.max_score - 3:
                strengths.append(f"{item.name} sudah relatif kuat")
            else:
                weaknesses.append(f"{item.name} masih perlu diperkuat")
                recommendations.extend(item.notes[:2])

        if total_score >= 42:
            verdict = "Siap dibimbing ke tahap pendalaman"
        elif total_score >= 30:
            verdict = "Cukup baik, tetapi masih butuh penguatan"
        else:
            verdict = "Masih perlu revisi mendasar"

        return ProposalScoreResponse(
            total_score=total_score,
            max_score=max_score,
            verdict=verdict,
            rubric=rubric,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=list(dict.fromkeys(recommendations)),
        )

    def _score_problem_clarity(self, payload: ProposalScoreRequest) -> RubricScore:
        score = 0
        notes = []
        if payload.title:
            score += 4
        if payload.problem_statement and len(payload.problem_statement) > 120:
            score += 4
        else:
            notes.append("Perjelas latar belakang dan rumusan masalah dengan konteks yang lebih konkret.")
        if payload.objectives:
            score += 2
        else:
            notes.append("Tambahkan tujuan penelitian yang eksplisit.")
        return RubricScore(name="Kejelasan masalah", score=score, max_score=10, notes=notes)

    def _score_method_readiness(self, payload: ProposalScoreRequest) -> RubricScore:
        score = 0
        notes = []
        if len(payload.methods) >= 2:
            score += 6
        elif payload.methods:
            score += 3
            notes.append("Metode sudah ada, tetapi rincian alur, data, dan evaluasi masih perlu diperjelas.")
        else:
            notes.append("Tentukan metode inti, sumber data, dan teknik evaluasi penelitian.")
        if payload.keywords:
            score += 2
        if payload.abstract and "dataset" in payload.abstract.lower():
            score += 2
        return RubricScore(name="Kesiapan metode", score=score, max_score=10, notes=notes)

    def _score_reference_strength(self, payload: ProposalScoreRequest) -> RubricScore:
        score = 0
        notes = []
        ref_count = len(payload.references)
        if ref_count >= 10:
            score += 6
        elif ref_count >= 5:
            score += 4
            notes.append("Jumlah referensi sudah cukup, tetapi masih perlu ditambah paper inti yang lebih spesifik.")
        else:
            notes.append("Perbanyak referensi primer dan paper terbaru yang langsung terkait metode/topik.")
        if any(any(char.isdigit() for char in ref) and "20" in ref for ref in payload.references):
            score += 2
        else:
            notes.append("Pastikan ada referensi terbaru 3 sampai 5 tahun terakhir.")
        if any("doi" in ref.lower() for ref in payload.references):
            score += 2
        return RubricScore(name="Kekuatan referensi", score=score, max_score=10, notes=notes)

    def _score_contribution(self, payload: ProposalScoreRequest) -> RubricScore:
        score = 0
        notes = []
        if payload.expected_contribution and len(payload.expected_contribution) > 80:
            score += 7
        elif payload.expected_contribution:
            score += 4
            notes.append("Kontribusi sudah mulai terlihat, tetapi perlu dibedakan dari penelitian terdahulu.")
        else:
            notes.append("Tuliskan kontribusi yang spesifik untuk kampus, bidang, atau pengguna akhir.")
        if payload.problem_statement and payload.expected_contribution:
            score += 3
        return RubricScore(name="Kontribusi penelitian", score=score, max_score=10, notes=notes)

    def _score_focus(self, payload: ProposalScoreRequest) -> RubricScore:
        score = 0
        notes = []
        keyword_count = len(payload.keywords)
        if 3 <= keyword_count <= 7:
            score += 5
        else:
            notes.append("Rapikan kata kunci agar fokus pada 3 sampai 7 istilah inti.")
        if len(payload.title.split()) <= 18:
            score += 3
        else:
            notes.append("Judul terlalu panjang; pertimbangkan penyederhanaan.")
        if payload.abstract and len(payload.abstract) >= 150:
            score += 2
        return RubricScore(name="Fokus topik", score=score, max_score=10, notes=notes)
