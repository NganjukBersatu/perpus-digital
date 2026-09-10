const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { adminAkun } = require('../db/schema')
const { eq } = require('drizzle-orm')

const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_yang_acak_dan_rahasia'

// POST login
router.post('/login', async (req, res) => {
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

    const token = jwt.sign({ id: akun.id, username: akun.username }, JWT_SECRET, { expiresIn: '8h' })

    res.json({
      token,
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

// Middleware untuk lindungi endpoint yang butuh login
function wajibLogin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Belum login' })
  }
  const token = authHeader.split(' ')[1]
  try {
    req.admin = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' })
  }
}

module.exports = { router, wajibLogin }
