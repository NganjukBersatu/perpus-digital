const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { anggota } = require('../db/schema')
const { eq, and } = require('drizzle-orm')

const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_yang_acak_dan_rahasia'

// POST login siswa (pakai NIS + tanggal lahir)
router.post('/login', async (req, res) => {
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
