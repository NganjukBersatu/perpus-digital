const express = require('express')
const router = express.Router()
const db = require('../db')
const { kategori } = require('../db/schema')
const { eq, and, ilike } = require('drizzle-orm')
const { wajibLogin, wajibAdmin } = require('./auth')

// GET semua kategori (opsional filter ?q=...)
router.get('/', wajibLogin, async (req, res) => {
  try {
    const { q } = req.query
    const { sekolahId } = req.user
    const rows = await db.select().from(kategori)
      .where(q ? and(eq(kategori.sekolahId, sekolahId), ilike(kategori.nama, `%${q}%`)) : eq(kategori.sekolahId, sekolahId))
      .orderBy(kategori.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data kategori' })
  }
})

// POST tambah kategori baru
router.post('/', wajibAdmin, async (req, res) => {
  try {
    const { nama, deskripsi } = req.body
    if (typeof nama !== 'string' || !nama.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' })
    }

    const [baru] = await db.insert(kategori).values({ nama: nama.trim(), deskripsi, sekolahId: req.user.sekolahId }).returning()
    res.status(201).json(baru)
  } catch (err) {
    console.error(err)
    // kode 23505 = unique violation di Postgres (nama duplikat)
    if ((err?.cause?.code || err?.code) === '23505') {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' })
    }
    res.status(500).json({ error: 'Gagal menambah kategori' })
  }
})

// PUT edit kategori
router.put('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nama, deskripsi } = req.body
    if (typeof nama !== 'string' || !nama.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' })
    }

    const [updated] = await db
      .update(kategori)
      .set({ nama: nama.trim(), deskripsi })
      .where(and(eq(kategori.id, id), eq(kategori.sekolahId, req.user.sekolahId)))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Kategori tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    if ((err?.cause?.code || err?.code) === '23505') {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' })
    }
    res.status(500).json({ error: 'Gagal mengubah kategori' })
  }
})

// DELETE kategori
router.delete('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [deleted] = await db.delete(kategori)
      .where(and(eq(kategori.id, id), eq(kategori.sekolahId, req.user.sekolahId))).returning()
    if (!deleted) return res.status(404).json({ error: 'Kategori tidak ditemukan' })
    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    if ((err?.cause?.code || err?.code) === '23503') {
      return res.status(409).json({ error: 'Kategori tidak bisa dihapus karena masih dipakai oleh buku' })
    }
    res.status(500).json({ error: 'Gagal menghapus kategori' })
  }
})

module.exports = router