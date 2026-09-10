const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, kategori } = require('../db/schema')
const { eq, ilike, and } = require('drizzle-orm')

// GET semua buku (join ke kategori untuk dapat nama kategorinya)
router.get('/', async (req, res) => {
  try {
    const { q, kategoriNama, status } = req.query
    const conditions = []
    if (q) conditions.push(ilike(buku.judul, `%${q}%`))
    if (status) conditions.push(eq(buku.status, status))

    const rows = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
        isbn: buku.isbn,
        stok: buku.stok,
        totalEksemplar: sql`count(${eksemplarBuku.id})`.mapWith(Number),
        tersedia: sql`count(${eksemplarBuku.id}) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
      })
      .from(buku)
      .leftJoin(kategori, eq(kategori.id, buku.kategoriId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(buku.id)

    const hasil = kategoriNama ? rows.filter((r) => r.kategori === kategoriNama) : rows
    res.json(hasil)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data buku' })
  }
})

// POST tambah buku baru
router.post('/', async (req, res) => {
  try {
    const { judul, penulis, kategoriId, isbn, stok, tersedia, lokasi, status } = req.body
    if (!judul || !penulis) {
      return res.status(400).json({ error: 'Judul dan penulis wajib diisi' })
    }

    const [baru] = await db
      .insert(buku)
      .values({
        judul,
        penulis,
        kategoriId: kategoriId || null,
        isbn,
        stok: Number(stok) || 0,
        tersedia: Number(tersedia) || 0,
        lokasi,
        status: status || 'Tersedia',
      })
      .returning()

    res.status(201).json(baru)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah buku' })
  }
})

// PUT edit buku
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { judul, penulis, kategoriId, isbn, stok, tersedia, lokasi, status } = req.body

    const [updated] = await db
      .update(buku)
      .set({
        judul,
        penulis,
        kategoriId: kategoriId || null,
        isbn,
        stok: Number(stok) || 0,
        tersedia: Number(tersedia) || 0,
        lokasi,
        status,
      })
      .where(eq(buku.id, id))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Buku tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah data buku' })
  }
})

// DELETE buku
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [deleted] = await db.delete(buku).where(eq(buku.id, id)).returning()

    if (!deleted) return res.status(404).json({ error: 'Buku tidak ditemukan' })
    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus buku' })
  }
})

module.exports = router