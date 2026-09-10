const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')          
const { anggota } = require('../db/schema')
const { eq } = require('drizzle-orm')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

router.post('/login', async (req, res) => {
  const { role } = req.body

  try {
    if (role === 'siswa') {
      const { nis, tanggalLahir } = req.body
      const user = await db.select().from(anggota).where(eq(anggota.nis, nis))

      if (!user[0] || user[0].tanggalLahir !== tanggalLahir) {
        return res.status(401).json({ message: 'NIS atau tanggal lahir salah' })
      }

      const token = jwt.sign({ id: user[0].id, role: 'siswa' }, JWT_SECRET, { expiresIn: '1d' })
      return res.json({ token, role: 'siswa', nama: user[0].nama })
    }

    if (role === 'guru' || role === 'admin') {
      const { nip, username, password } = req.body
      const identifier = role === 'guru' ? nip : username
      const field = role === 'guru' ? anggota.nip : anggota.username

      const user = await db.select().from(anggota).where(eq(field, identifier))

      if (!user[0]) {
        return res.status(401).json({ message: 'Akun tidak ditemukan' })
      }

      const valid = await bcrypt.compare(password, user[0].passwordHash)
      if (!valid) {
        return res.status(401).json({ message: 'Password salah' })
      }

      const token = jwt.sign({ id: user[0].id, role }, JWT_SECRET, { expiresIn: '1d' })
      return res.json({ token, role, nama: user[0].nama })
    }

    return res.status(400).json({ message: 'Role tidak valid' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
})

module.exports = router