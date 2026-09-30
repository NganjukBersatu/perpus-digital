# Perpus_Digital


Sistem perpustakaan sekolah berbasis web (responsif). Penjaga/admin memindai barcode buku lewat kamera untuk mencatat peminjaman, sedangkan siswa dan guru melihat katalog, pinjaman berjalan, dan riwayat dari HP masing-masing.

## Fitur

- Katalog buku dengan kategori dan ketersediaan (siswa & guru)
- Scan barcode buku via kamera, dengan input manual jika barcode tidak terbaca (admin & penjaga)
- Pencatatan peminjaman dan pengembalian
- Riwayat dan status pinjaman untuk siswa dan guru
- Dasbor admin: statistik, data buku, data anggota
- Ekspor data ke PDF dan Excel

## Teknologi

- Frontend (`frontend/`): Vue 3, Vite, Vue Router, Axios
- Scan barcode: html5-qrcode dan ZXing (via kamera)
- Ekspor data: jsPDF (PDF) dan SheetJS/xlsx (Excel)
- Backend (`backend/`): Node.js, Express 5, JWT, bcrypt
- Database: PostgreSQL dengan Drizzle ORM

## Struktur Folder

```
perpus-digital/
├── frontend/   # aplikasi Vue
└── backend/    # server API + skema database (backend/db)
```

## Menjalankan Secara Lokal

Prasyarat: PostgreSQL dan Node.js `^22.18.0` atau `>=24.12.0`.

1. Clone repo dan buat database PostgreSQL kosong.

2. Siapkan backend:

```bash
cd backend
cp .env.example .env      # lalu isi DATABASE_URL dan JWT_SECRET
npm install
npx drizzle-kit push      # membuat tabel sesuai skema
npm run dev               # pakai nodemon; untuk produksi: npm start
```

3. Siapkan frontend (terminal lain):

```bash
cd frontend
cp .env.example .env      # isi VITE_API_BASE_URL (contoh: http://localhost:3000/api)
npm install
npm run dev
```

Server dev frontend berjalan lewat HTTPS (sertifikat self-signed dari `@vitejs/plugin-basic-ssl`) karena akses kamera di HP mewajibkan HTTPS; terima peringatan sertifikat di browser saat pertama kali membuka. Untuk mencoba dari HP, akses frontend lewat IP jaringan lokal, dan pastikan `VITE_API_BASE_URL` menunjuk ke backend yang bisa dijangkau HP (IP lokal atau tunnel seperti ngrok).

## Environment Variables

| Variabel | Lokasi | Keterangan |
|---|---|---|
| `DATABASE_URL` | backend | URL koneksi PostgreSQL |
| `JWT_SECRET` | backend | Kunci rahasia token login |
| `VITE_API_BASE_URL` | frontend | Alamat API backend, termasuk `/api` (contoh: `http://localhost:3000/api`) |

## Tim

Shinta dan Yhusinda
