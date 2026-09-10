const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const { db } = require('../db/client')
const { adminAkun } = require('../db/schema')
const { eq } = require('drizzle-orm')
const { wajibLogin } = require('./auth')

// GET profil admin yang sedang login
router.get('/profil', wajibLogin, async (req, res) => {
  try {
    const [akun] = await db.select().from(adminAkun).where(eq(adminAkun.id, req.admin.id))
    if (!akun) return res.status(404).json({ error: 'Akun tidak ditemukan' })
    const { passwordHash, ...tanpaPassword } = akun
    res.json(tanpaPassword)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil profil' })
  }
})

// PUT update data profil (nama, email, telepon, jabatan, NIP/NIK)
router.put('/profil', wajibLogin, async (req, res) => {
  try {
    const { namaLengkap, email, telepon, jabatan, nipNik } = req.body
    const [updated] = await db
      .update(adminAkun)
      .set({ namaLengkap, email, telepon, jabatan, nipNik })
      .where(eq(adminAkun.id, req.admin.id))
      .returning()
    const { passwordHash, ...tanpaPassword } = updated
    res.json(tanpaPassword)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menyimpan profil' })
  }
})

// PUT ganti password
router.put('/password', wajibLogin, async (req, res) => {
  try {
    const { passwordLama, passwordBaru } = req.body
    if (!passwordLama || !passwordBaru) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi' })
    }
    if (passwordBaru.length < 8) {
      return res.status(400).json({ error: 'Password baru minimal 8 karakter' })
    }

    const [akun] = await db.select().from(adminAkun).where(eq(adminAkun.id, req.admin.id))
    const cocok = await bcrypt.compare(passwordLama, akun.passwordHash)
    if (!cocok) return res.status(401).json({ error: 'Password lama salah' })

    const passwordHash = await bcrypt.hash(passwordBaru, 10)
    await db.update(adminAkun).set({ passwordHash }).where(eq(adminAkun.id, req.admin.id))

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengganti password' })
  }
})

module.exports = router