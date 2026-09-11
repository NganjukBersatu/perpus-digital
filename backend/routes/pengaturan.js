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
    res.json(data || {
      namaSekolah: '',
      namaPerpustakaan: '',
      alamat: '',
      detail: null
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil pengaturan' })
  }
})

router.put('/', wajibLogin, async (req, res) => {
  try {
    const { namaSekolah, namaPerpustakaan, alamat, detail } = req.body
    const [existing] = await db.select().from(pengaturanPerpustakaan).limit(1)

    const values = {
      namaSekolah: namaSekolah || '',
      namaPerpustakaan: namaPerpustakaan || '',
      alamat: alamat || '',
      detail: detail || null,
      updatedAt: new Date()
    }

    let updated
    if (existing) {
      ;[updated] = await db
        .update(pengaturanPerpustakaan)
        .set(values)
        .where(eq(pengaturanPerpustakaan.id, existing.id))
        .returning()
    } else {
      ;[updated] = await db.insert(pengaturanPerpustakaan).values(values).returning()
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menyimpan pengaturan' })
  }
})

module.exports = router