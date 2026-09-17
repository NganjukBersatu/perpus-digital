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

// GET info perpustakaan ringkas (untuk header aplikasi & kop laporan)
router.get('/publik', async (req, res) => {
  try {
    const [row] = await db.select().from(pengaturanPerpustakaan).limit(1)

    if (!row) {
      return res.json({
        namaPerpustakaan: 'Perpustakaan',
        namaSekolah: '',
        alamat: '',
        telepon: '',
        email: '',
        kepalaPerpustakaan: '',
        tahunAjaran: '',
      })
    }

    const detail = row.detail?.perpustakaan || {}

    res.json({
      namaPerpustakaan: detail.namaPerpustakaan || row.namaPerpustakaan || 'Perpustakaan',
      namaSekolah: detail.namaSekolah || row.namaSekolah || '',
      alamat: detail.alamat || row.alamat || '',
      telepon: detail.telepon || '',
      email: detail.email || '',
      kepalaPerpustakaan: detail.kepalaPerpustakaan || '',
      tahunAjaran: detail.tahunAjaran || '',
      deskripsi: detail.deskripsi || '',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil info perpustakaan' })
  }
})

module.exports = router