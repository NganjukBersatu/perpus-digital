const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { anggota } = require('../db/schema')
const { eq, and } = require('drizzle-orm')
const { loginLimiter } = require('../middleware/rateLimiter')

const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_yang_acak_dan_rahasia'

// POST login siswa (pakai NIS + tanggal lahir)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { nis, tanggalLahir } = req.body
    if (!nis || !tanggalLahir) {
      return res.status(400).json({ error: 'NIS dan tanggal lahir wajib diisi' })
    }

    const [siswa] = await db
      .select()
      .from(anggota)
      .where(and(
        eq(anggota.nis, nis),
        eq(anggota.tanggalLahir, tanggalLahir),
        eq(anggota.peran, 'siswa')
      ))

    if (!siswa) {
      return res.status(401).json({ error: 'NIS atau tanggal lahir salah' })
    }

    const token = jwt.sign({ id: siswa.id, peran: 'siswa' }, JWT_SECRET, { expiresIn: '8h' })

    res.json({
      token,
      role: 'siswa',
      siswa: {
        id: siswa.id,
        nama: siswa.nama,
        kelas: siswa.kelas,
        nis: siswa.nis,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// POST daftar siswa (self-register)
// Siswa mengisi datanya sendiri (Nama, NIS, Kelas, Tanggal Lahir) tanpa
// perlu didaftarkan admin lebih dulu. Tidak ada verifikasi silang ke
// data resmi sekolah — NIS di sini cuma perlu UNIK, belum tentu benar
// secara administratif. Cocok untuk skala aplikasi internal sekolah.
router.post('/daftar', async (req, res) => {
  try {
    const { nama, nis, kelas, tanggalLahir } = req.body

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }
    if (!nis || !String(nis).trim()) {
      return res.status(400).json({ error: 'NIS wajib diisi' })
    }
    if (!kelas) {
      return res.status(400).json({ error: 'Kelas wajib dipilih' })
    }
    if (!tanggalLahir) {
      return res.status(400).json({ error: 'Tanggal lahir wajib diisi' })
    }

    const nisBersih = String(nis).trim()

    const [nisSudahAda] = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(eq(anggota.nis, nisBersih))
      .limit(1)

    if (nisSudahAda) {
      return res.status(409).json({ error: 'NIS ini sudah terdaftar. Silakan langsung login.' })
    }

    const [baru] = await db
      .insert(anggota)
      .values({
        nama: String(nama).trim(),
        nis: nisBersih,
        kelas: String(kelas).trim(),
        tanggalLahir,
        peran: 'siswa',
      })
      .returning()

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil. Silakan login menggunakan NIS dan tanggal lahir Anda.',
      siswa: {
        id: baru.id,
        nama: baru.nama,
        nis: baru.nis,
        kelas: baru.kelas,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mendaftar' })
  }
})

// Middleware untuk lindungi endpoint yang butuh login siswa
function wajibLoginSiswa(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Belum login' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.peran !== 'siswa') {
      return res.status(403).json({ error: 'Akses ditolak' })
    }
    req.siswa = payload
    next()
  } catch {
    res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' })
  }
}

module.exports = { router, wajibLoginSiswa }
