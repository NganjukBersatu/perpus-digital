const express = require('express')
const router = express.Router()
const db = require('../db')
const { kategori } = require('../db/schema')
const { eq, ilike } = require('drizzle-orm')

// GET semua kategori (opsional filter ?q=...)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const rows = q
      ? await db.select().from(kategori).where(ilike(kategori.nama, `%${q}%`)).orderBy(kategori.id)
      : await db.select().from(kategori).orderBy(kategori.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data kategori' })
  }
})

// POST tambah kategori baru
router.post('/', async (req, res) => {
  try {
    const { nama, deskripsi } = req.body
    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' })
    }

    const [baru] = await db.insert(kategori).values({ nama: nama.trim(), deskripsi }).returning()
    res.status(201).json(baru)
  } catch (err) {
    console.error(err)
    // kode 23505 = unique violation di Postgres (nama duplikat)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' })
    }
    res.status(500).json({ error: 'Gagal menambah kategori' })
  }
})

// PUT edit kategori
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nama, deskripsi } = req.body
    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' })
    }

    const [updated] = await db
      .update(kategori)
      .set({ nama: nama.trim(), deskripsi })
      .where(eq(kategori.id, id))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Kategori tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan' })
    }
    res.status(500).json({ error: 'Gagal mengubah kategori' })
  }
})

// DELETE kategori
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [deleted] = await db.delete(kategori).where(eq(kategori.id, id)).returning()

    if (!deleted) return res.status(404).json({ error: 'Kategori tidak ditemukan' })
    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus kategori' })
  }
})

module.exports = router