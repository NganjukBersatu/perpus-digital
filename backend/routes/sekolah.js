const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { sekolah } = require('../db/schema')
const { eq } = require('drizzle-orm')

router.get('/publik', async (req, res) => {
  try {
    const data = await db
      .select({ id: sekolah.id, nama: sekolah.nama, logoUrl: sekolah.logoUrl })
      .from(sekolah)
      .where(eq(sekolah.aktif, true))
      .orderBy(sekolah.nama)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil daftar sekolah' })
  }
})

module.exports = router