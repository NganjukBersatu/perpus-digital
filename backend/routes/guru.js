const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { anggota } = require('../db/schema')
const { eq, ilike, and } = require('drizzle-orm')

// GET semua guru (opsional search nama)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query

    const rows = await db
      .select({
        id: anggota.id,
        nama: anggota.nama,
        nip: anggota.nip,
        mapel: anggota.mapel,
        peran: anggota.peran,
      })
      .from(anggota)
      .where(
        and(
          eq(anggota.peran, 'guru'),
          q ? ilike(anggota.nama, `%${q}%`) : undefined
        )
      )
      .orderBy(anggota.nama)

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data guru' })
  }
})

// POST tambah guru
router.post('/', async (req, res) => {
  try {
    const { nama, nip, mapel } = req.body
    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }

    const [baru] = await db
      .insert(anggota)
      .values({
        nama: String(nama).trim(),
        nip: nip || null,
        mapel: mapel || null,
        kelas: null,
        peran: 'guru',
      })
      .returning()

    res.status(201).json(baru)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah guru' })
  }
})

// PUT edit guru
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nama, nip, mapel } = req.body

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }

    const [updated] = await db
      .update(anggota)
      .set({
        nama: String(nama).trim(),
        nip: nip || null,
        mapel: mapel || null,
      })
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Guru tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah data guru' })
  }
})

// DELETE guru
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const [deleted] = await db
      .delete(anggota)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .returning()

    if (!deleted) return res.status(404).json({ error: 'Guru tidak ditemukan' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: 'Gagal menghapus guru (mungkin masih terkait peminjaman aktif)',
    })
  }
})

module.exports = router