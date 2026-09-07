const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { buku, eksemplarBuku } = require('../db/schema')
const { eq, ilike, sql } = require('drizzle-orm')

// Helper: buat barcode dari ISBN + nomor urut
// Contoh: 9786020633478-01, 9786020633478-02
// Kalau ISBN kosong → BK-{idBuku}-01
function buatBarcode(isbn, bukuId, nomorUrut) {
  const urut = String(nomorUrut).padStart(2, '0')
  if (isbn && String(isbn).trim()) {
    return `${String(isbn).trim()}-${urut}`
  }
  return `BK-${bukuId}-${urut}`
}

// GET semua buku + jumlah eksemplar & yang tersedia
router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const rows = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
        isbn: buku.isbn,
        totalEksemplar: sql`count(${eksemplarBuku.id})`.mapWith(Number),
        tersedia: sql`count(${eksemplarBuku.id}) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
      })
      .from(buku)
      .leftJoin(eksemplarBuku, eq(eksemplarBuku.bukuId, buku.id))
      .where(q ? ilike(buku.judul, `%${q}%`) : undefined)
      .groupBy(buku.id)
      .orderBy(buku.id)

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data buku' })
  }
})

// GET detail satu buku (termasuk daftar eksemplarnya)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [item] = await db.select().from(buku).where(eq(buku.id, id))
    if (!item) return res.status(404).json({ error: 'Buku tidak ditemukan' })

    const eksemplar = await db
      .select()
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, id))
      .orderBy(eksemplarBuku.id)

    res.json({ ...item, eksemplar })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil detail buku' })
  }
})

// POST tambah buku baru + generate eksemplar + barcode
router.post('/', async (req, res) => {
  try {
    const { judul, penulis, penerbit, isbn, jumlahEksemplar } = req.body
    if (!judul) return res.status(400).json({ error: 'Judul wajib diisi' })

    const [newBuku] = await db
      .insert(buku)
      .values({ judul, penulis, penerbit, isbn })
      .returning()

    const jumlah = Math.max(0, Number(jumlahEksemplar) || 0)
    const daftarEksemplar = []

    for (let i = 1; i <= jumlah; i++) {
      const barcode = buatBarcode(isbn, newBuku.id, i)
      const [eks] = await db
        .insert(eksemplarBuku)
        .values({
          bukuId: newBuku.id,
          barcode,
          status: 'tersedia',
        })
        .returning()
      daftarEksemplar.push(eks)
    }

    // Kembalikan buku + daftar barcode yang baru dibuat
    res.status(201).json({
      ...newBuku,
      eksemplar: daftarEksemplar,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah buku' })
  }
})

// PUT edit data buku (judul, penulis, dll — tidak ubah jumlah eksemplar)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { judul, penulis, penerbit, isbn } = req.body

    const [updated] = await db
      .update(buku)
      .set({ judul, penulis, penerbit, isbn })
      .where(eq(buku.id, id))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Buku tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah buku' })
  }
})

// POST tambah eksemplar ke buku yang sudah ada
router.post('/:id/eksemplar', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const jumlah = Math.max(1, Number(req.body.jumlah) || 1)

    const [item] = await db.select().from(buku).where(eq(buku.id, id))
    if (!item) return res.status(404).json({ error: 'Buku tidak ditemukan' })

    // Hitung nomor urut berikutnya
    const existing = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, id))

    let nextNomor = (existing[0]?.count || 0) + 1
    const daftarBaru = []

    for (let i = 0; i < jumlah; i++) {
      const barcode = buatBarcode(item.isbn, id, nextNomor)
      const [eks] = await db
        .insert(eksemplarBuku)
        .values({
          bukuId: id,
          barcode,
          status: 'tersedia',
        })
        .returning()
      daftarBaru.push(eks)
      nextNomor++
    }

    res.status(201).json({ eksemplar: daftarBaru })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah eksemplar' })
  }
})

// DELETE buku
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await db.delete(eksemplarBuku).where(eq(eksemplarBuku.bukuId, id))
    const [deleted] = await db.delete(buku).where(eq(buku.id, id)).returning()
    if (!deleted) return res.status(404).json({ error: 'Buku tidak ditemukan' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: 'Gagal menghapus buku (mungkin masih ada peminjaman aktif yang terkait)',
    })
  }
})

module.exports = router