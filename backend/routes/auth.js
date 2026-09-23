const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { adminAkun, anggota } = require('../db/schema')
const { eq, and } = require('drizzle-orm')
const { loginLimiter } = require('../middleware/rateLimiter')

// JWT_SECRET wajib di-set lewat file .env, tidak boleh diam-diam
// pakai nilai bawaan yang keliatan di kode ini.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET belum di-set. Tambahkan JWT_SECRET=<string acak panjang> di file .env sebelum menjalankan server.'
  )
}

// POST login admin
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' })
    }

    const [akun] = await db.select().from(adminAkun).where(eq(adminAkun.username, username))
    if (!akun) {
      return res.status(401).json({ error: 'Username atau password salah' })
    }

    const cocok = await bcrypt.compare(password, akun.passwordHash)
    if (!cocok) {
      return res.status(401).json({ error: 'Username atau password salah' })
    }

    const token = jwt.sign({ id: akun.id, username: akun.username, role: 'admin' }, JWT_SECRET, {
      expiresIn: '8h',
    })

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
// Response menyertakan harusGantiPassword supaya frontend tahu harus
// mengarahkan guru ke halaman ganti password dulu atau tidak.
router.post('/guru/login', loginLimiter, async (req, res) => {
  try {
    const { nip, password } = req.body
    if (!nip || !password) {
      return res.status(400).json({ error: 'NIP dan password wajib diisi' })
    }

    const [guru] = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.nip, nip), eq(anggota.peran, 'guru')))

    if (!guru) {
      return res.status(401).json({ error: 'NIP atau password salah' })
    }

    if (!guru.password) {
      return res.status(401).json({ error: 'Akun belum memiliki password, hubungi admin' })
    }

    const cocok = await bcrypt.compare(password, guru.password)
    if (!cocok) {
      return res.status(401).json({ error: 'NIP atau password salah' })
    }

    const token = jwt.sign({ id: guru.id, nip: guru.nip, role: 'guru' }, JWT_SECRET, {
      expiresIn: '8h',
    })

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
router.post('/guru/lupa-password', async (req, res) => {
  try {
    const { nip, tanggalLahir } = req.body

    if (!nip || !tanggalLahir) {
      return res.status(400).json({ error: 'NIP dan tanggal lahir wajib diisi' })
    }

    const nipBersih = String(nip).trim()

    const [guru] = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.nip, nipBersih), eq(anggota.peran, 'guru')))

    if (!guru) {
      return res.status(401).json({ error: 'NIP atau tanggal lahir tidak sesuai' })
    }

    if (!guru.tanggalLahir) {
      return res.status(400).json({
        error: 'Data tanggal lahir belum lengkap di sistem. Silakan hubungi admin perpustakaan.',
      })
    }

    // guru.tanggalLahir dari database berbentuk 'YYYY-MM-DD' (kolom date),
    // sama seperti yang dikirim dari <input type="date"> di frontend.
    const tanggalLahirDb = String(guru.tanggalLahir).slice(0, 10)
    const tanggalLahirInput = String(tanggalLahir).slice(0, 10)

    if (tanggalLahirDb !== tanggalLahirInput) {
      return res.status(401).json({ error: 'NIP atau tanggal lahir tidak sesuai' })
    }

    const passwordBaruHash = await bcrypt.hash(guru.nip, 10)

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
// Menyimpan hasil verifikasi token ke DUA tempat:
// - req.user  : nama yang lebih jelas, dipakai kode baru (guru/ganti-password, dll)
// - req.admin : dipertahankan supaya route lain yang sudah ada (notifikasiGuru.js,
//               dan kemungkinan route lain) yang masih memanggil req.admin tetap jalan
function wajibLogin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Belum login' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    req.admin = payload
    next()
  } catch {
    res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' })
  }
}

// Khusus melindungi endpoint yang hanya boleh diakses guru yang sedang login
function wajibLoginGuru(req, res, next) {
  wajibLogin(req, res, () => {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ error: 'Endpoint ini khusus untuk guru' })
    }
    next()
  })
}

// POST ganti password guru
// Guru yang sedang login mengganti passwordnya sendiri.
// Dipanggil baik saat wajib ganti password pertama kali, maupun ganti
// password biasa di kemudian hari.
router.post('/guru/ganti-password', wajibLoginGuru, async (req, res) => {
  try {
    const { passwordBaru } = req.body

    if (!passwordBaru || String(passwordBaru).length < 8) {
      return res.status(400).json({ error: 'Password baru minimal 8 karakter' })
    }

    const hash = await bcrypt.hash(String(passwordBaru), 10)

    await db
      .update(anggota)
      .set({ password: hash, harusGantiPassword: false })
      .where(eq(anggota.id, req.user.id))

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengganti password' })
  }
})

module.exports = { router, wajibLogin, wajibLoginGuru }