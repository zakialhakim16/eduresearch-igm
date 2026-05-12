# EduResearch AI — QA Checklist

Gunakan dokumen ini untuk uji manual sebelum demo lokal. Centang setiap item setelah diverifikasi.

## Alur demo lokal (urut)

1. [ ] Login
2. [ ] Buka Dashboard
3. [ ] Buka Dokumen Saya
4. [ ] Upload PDF
5. [ ] Klik **Baca Dokumen**
6. [ ] Klik **Buat Ringkasan**
7. [ ] Klik **Ambil Keyword**
8. [ ] Klik **Cari Paper**
9. [ ] Klik **Simpan Referensi** (pada salah satu rekomendasi)
10. [ ] Klik **Cek Kekuatan Referensi**
11. [ ] Klik **Mulai Bimbingan**
12. [ ] Chat: bertanya soal dokumen
13. [ ] Chat: bertanya soal referensi tersimpan
14. [ ] Buka Dashboard lagi
15. [ ] Klik entri **Riwayat Bimbingan** (sidebar)
16. [ ] Pastikan sesi lama terbuka (URL/session sesuai)
17. [ ] Buka halaman **References** (`/dashboard/references`)
18. [ ] Cari referensi manual (query + hasil)
19. [ ] Buka **Settings** (`/dashboard/settings`)
20. [ ] Klik **Logout** / **Keluar**
21. [ ] Pastikan kembali ke halaman login (dan sesi tidak mengakses dashboard)

Jika semua langkah di atas lolos, aplikasi dianggap siap demo lokal.

---

## Auth

- [ ] Register berhasil
- [ ] Login berhasil
- [ ] Logout berhasil
- [ ] Protected route redirect ke login

## Dashboard

- [ ] Sidebar tampil (desktop)
- [ ] Riwayat bimbingan tampil
- [ ] Dashboard mobile rapi (bottom nav, konten tidak tertutup bar)

## Documents

- [ ] Upload PDF berhasil
- [ ] Baca Dokumen berhasil
- [ ] Ringkasan AI berhasil
- [ ] Keyword berhasil
- [ ] Cari Paper berhasil
- [ ] Simpan Referensi berhasil
- [ ] Cek Kekuatan Referensi berhasil
- [ ] Mulai Bimbingan berhasil

## Chat

- [ ] Chat default berjalan
- [ ] Chat berbasis dokumen berjalan
- [ ] Chat membaca / merespons konteks referensi tersimpan (sesuai implementasi)
- [ ] Message tersimpan ke Supabase

## References

- [ ] Search OpenAlex berhasil
- [ ] Card paper tampil
- [ ] Link paper bisa dibuka

## Settings

- [ ] Profil akademik tampil (`public.users` tersedia)
- [ ] Info akun (email, ID) tampil
- [ ] Versi sistem tampil
- [ ] Logout dari halaman Settings berhasil
