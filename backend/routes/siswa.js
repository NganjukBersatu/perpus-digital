const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { anggota, peminjaman, eksemplarBuku, buku } = require('../db/schema')
const { eq, and, ilike, desc } = require('drizzle-orm')

// GET semua siswa (opsional filter pencarian nama lewat ?q=...)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const conditions = [eq(anggota.peran, 'siswa')]
    if (q) conditions.push(ilike(anggota.nama, `%${q}%`))

    const rows = await db.select().from(anggota).where(and(...conditions)).orderBy(anggota.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data siswa' })
  }
})

// GET riwayat peminjaman milik satu siswa
router.get('/:id/riwayat', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const rows = await db
      .select({
        id: peminjaman.id,
        judul: buku.judul,
        tanggalPinjam: peminjaman.tanggalPinjam,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
      })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(eq(peminjaman.anggotaId, id))
      .orderBy(desc(peminjaman.id))

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil riwayat peminjaman' })
  }
})

// POST tambah siswa baru
router.post('/', async (req, res) => {
  try {
    const { nama, kelas } = req.body
    if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' })

    const [baru] = await db.insert(anggota).values({ nama, kelas, peran: 'siswa' }).returning()
    res.status(201).json(baru)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah siswa' })
  }
})

// PUT edit siswa
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nama, kelas } = req.body

    const [updated] = await db
      .update(anggota)
      .set({ nama, kelas })
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'siswa')))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah data siswa' })
  }
})

// DELETE siswa
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [deleted] = await db
      .delete(anggota)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'siswa')))
      .returning()

    if (!deleted) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus siswa, mungkin masih ada riwayat peminjaman yang terkait' })
  }
})

module.exports = router