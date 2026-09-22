const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, kategori, eksemplarBuku } = require('../db/schema')
const { eq, ilike, and, sql } = require('drizzle-orm')

// Helper: hitung ulang stok & tersedia untuk 1 buku, lalu simpan ke tabel buku
async function sinkronkanStokBuku(bukuId) {
  const [hasil] = await db
    .select({
      stok: sql`count(*)`.mapWith(Number),
      tersedia: sql`count(*) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
    })
    .from(eksemplarBuku)
    .where(eq(eksemplarBuku.bukuId, bukuId))

  await db
    .update(buku)
    .set({
      stok: hasil?.stok ?? 0,
      tersedia: hasil?.tersedia ?? 0,
    })
    .where(eq(buku.id, bukuId))
}

// GET semua buku
// stok & tersedia dihitung LIVE dari tabel eksemplar_buku
// supaya tidak pernah "bohong" walaupun kolom manual di tabel buku belum disinkronkan.
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
        kategoriId: buku.kategoriId,
        isbn: buku.isbn,
        lokasi: buku.lokasi,
        status: buku.status,
        kategori: kategori.nama,
        stok: sql`count(${eksemplarBuku.id})`.mapWith(Number),
        tersedia: sql`count(${eksemplarBuku.id}) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
        barcode: sql`min(${eksemplarBuku.barcode})`,
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
// Ada 3 skenario:
//   1. Body menyertakan "barcode" → bikin buku + 1 eksemplar dengan barcode itu.
//   2. Body menyertakan "jumlahEksemplar" → bikin buku + N eksemplar dengan
//      barcode auto-generate (pakai prefix kalau dikirim, fallback ke BKU-{id}).
//   3. Tidak ada keduanya → bikin buku saja tanpa eksemplar.
router.post('/', async (req, res) => {
  try {
    const {
      judul, penulis, kategoriId, isbn, stok, tersedia, lokasi, status,
      barcode,
      jumlahEksemplar,
      prefixEksemplar,
    } = req.body

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

    // Buat eksemplar otomatis kalau barcode dikirim (skenario 1)
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

      await sinkronkanStokBuku(baru.id)
    } else if (Number(jumlahEksemplar) > 0) {
      // Buku tanpa barcode fisik (mis. buku pelajaran/koleksi lama).
      // Sistem tetap perlu baris eksemplar (karena tabel peminjaman
      // wajib merujuk ke eksemplar), jadi dibuatkan kode otomatis
      // dengan format PREFIX-001, PREFIX-002, dst.
      // Kalau prefix tidak diisi, fallback ke BKU-{id}-001, BKU-{id}-002.
      const jumlah = Number(jumlahEksemplar)
      const prefix = (prefixEksemplar || `BKU-${baru.id}`).toUpperCase().trim()

      const nilaiEksemplar = Array.from({ length: jumlah }, (_, i) => ({
        bukuId: baru.id,
        barcode: `${prefix}-${String(i + 1).padStart(3, '0')}`,
        status: 'tersedia',
      }))
      await db.insert(eksemplarBuku).values(nilaiEksemplar)
      await sinkronkanStokBuku(baru.id)
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

    // Cek apakah barcode sudah dipakai eksemplar lain
    const [existing] = await db
      .select()
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.barcode, barcode))

    let barcodeFinal = barcode

    if (existing) {
      // Barcode sudah ada (biasanya barcode bawaan penerbit yang sama
      // untuk beberapa kopi). Tambahkan suffix nomor urut untuk buku ini.
      const [hitung] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(eksemplarBuku)
        .where(eq(eksemplarBuku.bukuId, bukuId))

      const nomorBerikut = (hitung?.count || 0) + 1
      barcodeFinal = `${barcode}-${String(nomorBerikut).padStart(3, '0')}`
    }

    const [eksemplar] = await db
      .insert(eksemplarBuku)
      .values({ bukuId, barcode: barcodeFinal, status: 'tersedia' })
      .returning()

    await sinkronkanStokBuku(bukuId)

    res.status(201).json(eksemplar)
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Barcode sudah dipakai eksemplar lain' })
    }
    res.status(500).json({ error: 'Gagal menambah eksemplar' })
  }
})

// GET data buku untuk mulai peminjaman lewat pencarian JUDUL manual
// (dipakai di tab "Manual" ScanBukuPage.vue, setelah admin pilih
// salah satu hasil pencarian judul).
router.get('/:id/untuk-pinjam', async (req, res) => {
  try {
    const bukuId = Number(req.params.id)

    const [bukuData] = await db.select().from(buku).where(eq(buku.id, bukuId))
    if (!bukuData) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }

    const eksemplarRows = await db
      .select()
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, bukuId))
      .orderBy(eksemplarBuku.id)

    if (eksemplarRows.length === 0) {
      return res.status(404).json({ message: 'Buku ditemukan tapi belum ada eksemplar' })
    }

    const eksemplarTerpilih =
      eksemplarRows.find((ek) => ek.status === 'tersedia') || eksemplarRows[0]

    res.json({
      bukuId: bukuData.id,
      judul: bukuData.judul,
      penulis: bukuData.penulis,
      penerbit: bukuData.penerbit,
      status: eksemplarTerpilih.status,
      eksemplarId: eksemplarTerpilih.id,
      eksemplarList: eksemplarRows.map((ek) => ({
        id: ek.id,
        status: ek.status,
        barcode: ek.barcode,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
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
// - Menolak hapus kalau masih ada eksemplar yang SEDANG DIPINJAM.
// - Kalau eksemplar hanya "tersedia" (tidak sedang dipinjam), ikut terhapus
//   otomatis karena FK onDelete: cascade di schema.
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const [bukuAda] = await db.select().from(buku).where(eq(buku.id, id))
    if (!bukuAda) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' })
    }

    // Cek eksemplar yang statusnya "dipinjam"
    const eksemplarDipinjam = await db
      .select({ id: eksemplarBuku.id, barcode: eksemplarBuku.barcode })
      .from(eksemplarBuku)
      .where(and(
        eq(eksemplarBuku.bukuId, id),
        eq(eksemplarBuku.status, 'dipinjam')
      ))

    if (eksemplarDipinjam.length > 0) {
      return res.status(400).json({
        error: `Buku tidak bisa dihapus karena ada ${eksemplarDipinjam.length} eksemplar yang sedang dipinjam.`,
        eksemplarDipinjam,
      })
    }

    // FK cascade akan otomatis menghapus eksemplar yang tidak dipinjam
    const [deleted] = await db.delete(buku).where(eq(buku.id, id)).returning()

    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus buku' })
  }
})

module.exports = router