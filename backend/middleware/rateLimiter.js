const rateLimit = require('express-rate-limit')

// Ambil angka dari .env; kalau kosong/tidak valid pakai nilai cadangan.
function angka(nilai, cadangan) {
  const n = parseInt(nilai, 10)
  return Number.isFinite(n) && n > 0 ? n : cadangan
}

// Login & lupa password.
// - Hanya percobaan GAGAL yang dihitung (skipSuccessfulRequests), jadi login
//   yang berhasil tidak menghabiskan jatah.
// - Batas default 10 per 15 menit per IP. Jangan terlalu kecil: di sekolah
//   banyak perangkat memakai satu IP publik yang sama (Wi-Fi sekolah), sehingga
//   batas 3 akan mengunci seluruh siswa sekaligus.
// - Atur lewat .env: LOGIN_MAX_GAGAL=10
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: angka(process.env.LOGIN_MAX_GAGAL, 10),
  skipSuccessfulRequests: true,
  message: { error: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Pendaftaran siswa mandiri (endpoint publik).
// Default 30 pendaftaran per jam per IP, supaya satu kelas yang mendaftar dari
// Wi-Fi sekolah tidak terblokir, tapi tetap membatasi spam.
// Atur lewat .env: DAFTAR_MAX_PER_JAM=30
const daftarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: angka(process.env.DAFTAR_MAX_PER_JAM, 30),
  message: { error: 'Terlalu banyak pendaftaran dari alamat ini, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { loginLimiter, daftarLimiter }