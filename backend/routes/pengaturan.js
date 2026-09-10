const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { pengaturanPerpustakaan } = require('../db/schema')
const { eq } = require('drizzle-orm')
const { wajibLogin } = require('./auth')

// GET pengaturan (tidak perlu login — dipakai juga untuk tampil di sidebar sebelum login)
router.get('/', async (req, res) => {
  try {
    const [data] = await db.select().from(pengaturanPerpustakaan).limit(1)
    res.json(data || { namaSekolah: '', namaPerpustakaan: '', alamat: '' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil pengaturan' })
  }
})

// PUT update pengaturan (wajib login)
router.put('/', wajibLogin, async (req, res) => {
  try {
    const { namaSekolah, namaPerpustakaan, alamat } = req.body
    const [existing] = await db.select().from(pengaturanPerpustakaan).limit(1)

    let updated
    if (existing) {
      ;[updated] = await db
        .update(pengaturanPerpustakaan)
        .set({ namaSekolah, namaPerpustakaan, alamat, updatedAt: new Date() })
        .where(eq(pengaturanPerpustakaan.id, existing.id))
        .returning()
    } else {
      ;[updated] = await db
        .insert(pengaturanPerpustakaan)
        .values({ namaSekolah, namaPerpustakaan, alamat })
        .returning()
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menyimpan pengaturan' })
  }
})

module.exports = router