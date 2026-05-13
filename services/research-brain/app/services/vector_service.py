class VectorService:
    """
    Tempat integrasi pgvector/embedding berikutnya.

    Untuk fase awal, service tetap berguna dengan retrieval heuristik.
    Saat Anda siap naik level, class ini bisa diisi:
    - generate embeddings
    - simpan vector ke Postgres
    - query nearest neighbors
    """

    def embed(self, text: str) -> list[float]:
        if not text:
            return []
        seed = sum(ord(ch) for ch in text[:64])
        return [((seed + i) % 100) / 100 for i in range(8)]
