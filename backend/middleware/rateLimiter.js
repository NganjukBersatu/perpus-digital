const rateLimit = require('express-rate-limit')

// Maksimal 3 kali percobaan login per 15 menit, dihitung per IP.
// Setelah limit tercapai, semua percobaan berikutnya langsung ditolak
// tanpa mengecek password sama sekali, sampai window waktu berakhir.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 3,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { loginLimiter }