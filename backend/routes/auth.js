const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { adminAkun, anggota } = require('../db/schema')
const { eq, and } = require('drizzle-orm')
const { loginLimiter } = require('../middleware/rateLimiter')
const { normalisasiTanggal } = require('../utils/validasi')

// JWT_SECRET wajib di-set lewat file .env, tidak boleh diam-diam
// pakai nilai bawaan yang keliatan di kode ini.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET belum di-set. Tambahkan JWT_SECRET=<string acak panjang> di file .env sebelum menjalankan server.'
  )
}
if (JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET minimal 32 karakter. Buat dengan: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  )
}

const SIGN_OPTS = { algorithm: 'HS256', expiresIn: '8h' }
const VERIFY_OPTS = { algorithms: ['HS256'] }
// hash palsu: dipakai supaya bcrypt.compare tetap berjalan walau akun tidak ada
// (waktu respons sama, sehingga username/NIP yang valid tidak bisa ditebak dari waktunya)
const HASH_PALSU = bcrypt.hashSync('hash-palsu-untuk-menyamakan-waktu', 10)

// POST login admin
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' })
    }

    const [akun] = await db.select().from(adminAkun).where(eq(adminAkun.username, username.trim()))
    // selalu jalankan bcrypt agar waktu respons sama, baik akun ada maupun tidak
    const cocok = await bcrypt.compare(password, akun ? akun.passwordHash : HASH_PALSU)
    if (!akun || !cocok) {
      return res.status(401).json({ error: 'Username atau password salah' })
    }

    const token = jwt.sign({ id: akun.id, username: akun.username, role: 'admin' }, JWT_SECRET, SIGN_OPTS)

    res.json({
      token,
      role: 'admin',
      nama: akun.namaLengkap,
      admin: {
        id: akun.id,
        username: akun.username,
        namaLengkap: akun.namaLengkap,
        email: akun.email,
        telepon: akun.telepon,
        jabatan: akun.jabatan,
        nipNik: akun.nipNik,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// POST login guru
// Password awal guru = NIP mereka sendiri (di-hash saat guru dibuat di routes/guru.js).
// Token membawa klaim `hgp` (harus ganti password). Selama hgp = true, semua endpoint
// guru selain /guru/ganti-password ditolak dengan 403 (kode HARUS_GANTI_PASSWORD),
// jadi kewajiban ganti password ditegakkan di server, bukan hanya di frontend.
router.post('/guru/login', loginLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const nipBersih = String(body.nip ?? '').trim()
    const { password } = body
    if (!nipBersih || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'NIP dan password wajib diisi' })
    }

    const [guru] = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.nip, nipBersih), eq(anggota.peran, 'guru')))

    // selalu jalankan bcrypt (lihat HASH_PALSU di atas)
    const cocok = await bcrypt.compare(password, guru?.password || HASH_PALSU)

    // satu pesan untuk semua kegagalan, termasuk akun yang belum punya password,
    // supaya NIP yang terdaftar tidak bisa ditebak dari pesan errornya
    if (!guru || !guru.password || !cocok) {
      return res.status(401).json({ error: 'NIP atau password salah' })
    }

    const token = jwt.sign(
      { id: guru.id, nip: guru.nip, role: 'guru', hgp: !!guru.harusGantiPassword },
      JWT_SECRET,
      SIGN_OPTS
    )

    res.json({
      token,
      role: 'guru',
      nama: guru.nama,
      guru: {
        id: guru.id,
        nip: guru.nip,
        nama: guru.nama,
        mapel: guru.mapel,
        harusGantiPassword: guru.harusGantiPassword,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// POST lupa password guru
// Verifikasi identitas pakai NIP + Tanggal Lahir (bukan password lama,
// karena tujuannya memang untuk kondisi lupa password). Kalau cocok,
// password guru direset kembali ke NIP-nya sendiri (di-hash ulang) dan
// harusGantiPassword diset true, supaya guru dipaksa membuat password
// baru begitu berhasil login lagi.
//
// Catatan keamanan: NIP bukan rahasia, dan tanggal lahir bukan bukti yang kuat.
// Rate limiter dipasang di sini dan semua kegagalan memakai satu pesan yang sama.
// Untuk keamanan lebih tinggi, ganti alur ini dengan reset oleh admin.
router.post('/guru/lupa-password', loginLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const nipBersih = String(body.nip ?? '').trim()
    const tgl = normalisasiTanggal(body.tanggalLahir)
    if (!nipBersih || !tgl) {
      return res.status(400).json({ error: 'NIP dan tanggal lahir wajib diisi (format tanggal YYYY-MM-DD)' })
    }

    const [guru] = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.nip, nipBersih), eq(anggota.peran, 'guru')))

    // satu respons untuk semua kegagalan: NIP tidak ada, tanggal lahir belum diisi, atau salah
    if (!guru || normalisasiTanggal(guru.tanggalLahir) !== tgl) {
      return res.status(401).json({ error: 'NIP atau tanggal lahir tidak sesuai' })
    }

    const passwordBaruHash = await bcrypt.hash(nipBersih, 10)

    await db
      .update(anggota)
      .set({ password: passwordBaruHash, harusGantiPassword: true })
      .where(eq(anggota.id, guru.id))

    res.json({
      success: true,
      message: 'Password berhasil direset. Silakan login kembali menggunakan NIP sebagai password.',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mereset password' })
  }
})

// Middleware untuk lindungi endpoint yang butuh login.
function wajibLogin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Belum login' })
  }
  let payload
  try {
    payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET, VERIFY_OPTS)
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' })
  }
  req.user = payload
  // Alias lama, dipertahankan sementara untuk route lain yang belum saya lihat
  // (guru.js, laporan.js, dll). Hapus setelah `grep -rn "req\.admin" routes/` kosong.
  req.admin = payload
  next() // di luar try, jadi error hilir tidak salah dilaporkan sebagai 401
}

function buatWajibGuru({ izinkanHarusGanti = false } = {}) {
  return (req, res, next) => {
    wajibLogin(req, res, () => {
      if (req.user.role !== 'guru') {
        return res.status(403).json({ error: 'Endpoint ini khusus untuk guru' })
      }
      if (req.user.hgp && !izinkanHarusGanti) {
        return res.status(403).json({
          error: 'Anda harus mengganti password terlebih dahulu',
          kode: 'HARUS_GANTI_PASSWORD',
        })
      }
      next()
    })
  }
}
const wajibLoginGuru = buatWajibGuru()
const wajibLoginGuruBolehGanti = buatWajibGuru({ izinkanHarusGanti: true })

function wajibAdmin(req, res, next) {
  wajibLogin(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Endpoint ini khusus untuk admin' })
    }
    next()
  })
}

// POST ganti password guru
// Guru yang sedang login mengganti passwordnya sendiri.
// Dipanggil baik saat wajib ganti password pertama kali, maupun ganti
// password biasa di kemudian hari.
router.post('/guru/ganti-password', wajibLoginGuruBolehGanti, async (req, res) => {
  try {
    const { passwordBaru } = req.body || {}
    if (typeof passwordBaru !== 'string' || passwordBaru.length < 8 || Buffer.byteLength(passwordBaru) > 72) {
      return res.status(400).json({ error: 'Password baru harus 8–72 karakter' })
    }
    if (passwordBaru === String(req.user.nip)) {
      return res.status(400).json({ error: 'Password baru tidak boleh sama dengan NIP' })
    }

    const hash = await bcrypt.hash(passwordBaru, 10)
    await db
      .update(anggota)
      .set({ password: hash, harusGantiPassword: false })
      .where(eq(anggota.id, req.user.id))

    // token lama masih membawa hgp:true, jadi terbitkan token baru
    const token = jwt.sign(
      { id: req.user.id, nip: req.user.nip, role: 'guru', hgp: false },
      JWT_SECRET,
      SIGN_OPTS
    )
    res.json({ success: true, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengganti password' })
  }
})

module.exports = { router, wajibLogin, wajibLoginGuru, wajibLoginGuruBolehGanti, wajibAdmin }