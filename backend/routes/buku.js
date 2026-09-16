const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, kategori, eksemplarBuku } = require('../db/schema')
const { eq, ilike, and, sql } = require('drizzle-orm')

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
        lokasi: buku.lokasi,
        status: buku.status,
        kategori: kategori.nama,
        totalEksemplar: sql`count(${eksemplarBuku.id})`.mapWith(Number),
        tersedia: sql`count(${eksemplarBuku.id}) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
      })
      .from(buku)
      .leftJoin(kategori, eq(kategori.id, buku.kategoriId))
      .leftJoin(eksemplarBuku, eq(eksemplarBuku.bukuId, buku.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(buku.id, kategori.nama)
      .orderBy(buku.id)

    const hasil = kategoriNama ? rows.filter((r) => r.kategori === kategoriNama) : rows
    res.json(hasil)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data buku' })
  }
})

// POST tambah buku baru
// Kalau body request menyertakan "barcode", setelah buku berhasil
// dibuat, sekalian insert 1 baris eksemplar dengan barcode tersebut.
// Kalau "barcode" tidak dikirim, perilaku tetap seperti semula (tidak
// membuat eksemplar apa pun).
router.post('/', async (req, res) => {
  try {
    const { judul, penulis, kategoriId, isbn, stok, tersedia, lokasi, status, barcode } = req.body
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

    // Buat eksemplar otomatis kalau barcode dikirim
    let eksemplarBaru = null
    if (barcode) {
      const [eksemplar] = await db
        .insert(eksemplarBuku)
        .values({
          bukuId: baru.id,
          barcode,
          status: 'tersedia',
        })
        .returning()
      eksemplarBaru = eksemplar
    }

    res.status(201).json({ ...baru, eksemplar: eksemplarBaru })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah buku' })
  }
})

// POST tambah eksemplar baru ke buku yang SUDAH ADA (bukan bikin buku baru).
// Dipakai saat hasil scan tidak ketemu, tapi judul bukunya sebenarnya
// sudah terdaftar (kasus barcode bawaan penerbit yang sama untuk
// beberapa kopi fisik dari judul yang sama).
router.post('/:id/eksemplar', async (req, res) => {
  try {
    const bukuId = Number(req.params.id)
    const { barcode } = req.body

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode wajib diisi' })
    }

    const [bukuAda] = await db.select().from(buku).where(eq(buku.id, bukuId))
    if (!bukuAda) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' })
    }

    // Insert dulu pakai barcode SEMENTARA yang sudah pasti unik
    // (ditempeli timestamp), supaya tidak bentrok dengan barcode
    // eksemplar lain dari buku yang sama. Setelah dapat id-nya,
    // baru diganti ke format final "barcode-id".
    const barcodeSementara = `${barcode}-tmp-${Date.now()}`

    const [eksemplar] = await db
      .insert(eksemplarBuku)
      .values({ bukuId, barcode: barcodeSementara, status: 'tersedia' })
      .returning()

    const barcodeUnik = `${barcode}-${eksemplar.id}`

    const [updated] = await db
      .update(eksemplarBuku)
      .set({ barcode: barcodeUnik })
      .where(eq(eksemplarBuku.id, eksemplar.id))
      .returning()

    res.status(201).json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah eksemplar' })
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

    const eksemplarTerkait = await db
      .select({ id: eksemplarBuku.id })
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, id))

    if (eksemplarTerkait.length > 0) {
      return res.status(400).json({
        error: `Buku tidak bisa dihapus karena masih memiliki ${eksemplarTerkait.length} eksemplar terdaftar. Hapus dulu eksemplarnya, atau hubungi admin sistem.`
      })
    }

    const [deleted] = await db.delete(buku).where(eq(buku.id, id)).returning()

    if (!deleted) return res.status(404).json({ error: 'Buku tidak ditemukan' })
    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus buku' })
  }
})

module.exports = router