const express = require('express')
const router = express.Router()
const db = require('../db')
const { peminjaman, eksemplarBuku, anggota, buku } = require('../db/schema')
const { eq, and, isNotNull, isNull, gte, lte, or, ilike, sql } = require('drizzle-orm')

const DENDA_PER_HARI = 1000 // Rp1.000/hari, sesuaikan kalau beda

// GET /api/pengembalian?search=&status=&start=&end=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { search = '', status = 'Semua', start, end, page = 1, limit = 5 } = req.query
    const offset = (page - 1) * limit

    const conditions = [isNotNull(peminjaman.tanggalDikembalikan)]

    if (search) {
      conditions.push(
        or(
          ilike(anggota.nama, `%${search}%`),
          ilike(buku.judul, `%${search}%`),
          ilike(buku.isbn, `%${search}%`)
        )
      )
    }

    if (start && end) {
      conditions.push(gte(peminjaman.tanggalDikembalikan, start))
      conditions.push(lte(peminjaman.tanggalDikembalikan, end))
    }

    if (status === 'Tepat Waktu') {
      conditions.push(sql`${peminjaman.tanggalDikembalikan} <= ${peminjaman.tanggalKembali}`)
    } else if (status === 'Terlambat') {
      conditions.push(sql`${peminjaman.tanggalDikembalikan} > ${peminjaman.tanggalKembali}`)
    }

    const rows = await db
      .select({
        id: peminjaman.id,
        namaPeminjam: anggota.nama,
        kelasPeminjam: anggota.kelas,
        judulBuku: buku.judul,
        penulisBuku: buku.penulis,
        tanggalPinjam: peminjaman.tanggalPinjam,
        batasKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
        denda: peminjaman.denda,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(and(...conditions))
      .limit(Number(limit))
      .offset(Number(offset))

    // tambahkan status & keterlambatan (dihitung, tidak disimpan di DB)
    const data = rows.map((r) => {
      const telat = Math.max(
        0,
        Math.round((new Date(r.tanggalDikembalikan) - new Date(r.batasKembali)) / 86400000)
      )
      return {
        ...r,
        status: telat > 0 ? 'Terlambat' : 'Tepat Waktu',
        keterlambatan: telat > 0 ? `${telat} hari` : '-',
      }
    })

    const [{ count: total }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(and(...conditions))

    res.json({ data, total })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data pengembalian' })
  }
})

// GET /api/pengembalian/summary  -> untuk 4 card di atas
router.get('/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const result = await db
      .select({
        totalDikembalikan: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} is not null)`.mapWith(Number),
        hariIni: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} = ${today})`.mapWith(Number),
        tepatWaktu: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} <= ${peminjaman.tanggalKembali})`.mapWith(Number),
        terlambat: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} > ${peminjaman.tanggalKembali})`.mapWith(Number),
      })
      .from(peminjaman)
      .where(isNotNull(peminjaman.tanggalDikembalikan))

    res.json(result[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil ringkasan' })
  }
})

// PATCH /api/pengembalian/:id  -> proses "buku dikembalikan"
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const today = new Date().toISOString().slice(0, 10)

    const [row] = await db.select().from(peminjaman).where(eq(peminjaman.id, id))
    if (!row) return res.status(404).json({ message: 'Data tidak ditemukan' })

    const telatHari = Math.max(
      0,
      Math.round((new Date(today) - new Date(row.tanggalKembali)) / 86400000)
    )
    const denda = telatHari * DENDA_PER_HARI

    await db
      .update(peminjaman)
      .set({ tanggalDikembalikan: today, denda })
      .where(eq(peminjaman.id, id))

    await db
      .update(eksemplarBuku)
      .set({ status: 'tersedia' })
      .where(eq(eksemplarBuku.id, row.eksemplarId))

    res.json({ message: 'Buku berhasil dikembalikan', denda })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal memproses pengembalian' })
  }
})

module.exports = router