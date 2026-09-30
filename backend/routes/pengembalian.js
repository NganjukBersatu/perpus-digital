const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, anggota, buku } = require('../db/schema')
const { prosesPengembalian } = require('../utils/pengembalian')
const { ErrorBisnis } = require('../utils/errorBisnis')
const { tanggalHariIniLokal } = require('../utils/tanggal')
const { sinkronkanStokBuku } = require('./buku')
const { eq, and, isNotNull, gte, lte, or, ilike, sql, desc } = require('drizzle-orm')

// GET /api/pengembalian?search=&status=&start=&end=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { search = '', status = 'Semua', start, end } = req.query
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 100)
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const offset = (page - 1) * limit

    const conditions = [isNotNull(peminjaman.tanggalDikembalikan)]

    if (search) {
      conditions.push(
        or(
          ilike(anggota.nama, `%${search}%`),
          ilike(buku.judul, `%${search}%`),
          ilike(buku.isbn, `%${search}%`),
          ilike(eksemplarBuku.barcode, `%${search}%`)  
        )
      )
    }

    if (start) {
      conditions.push(gte(peminjaman.tanggalDikembalikan, start))
    }
    if (end) {
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
        barcodeEksemplar: eksemplarBuku.barcode, 
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(and(...conditions))
      .orderBy(desc(peminjaman.tanggalDikembalikan), desc(peminjaman.id))
      .limit(limit)
      .offset(offset)

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
    const today = tanggalHariIniLokal()

    const result = await db
      .select({
        totalDikembalikan: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} is not null)`.mapWith(Number),
        hariIni: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} = ${today})`.mapWith(Number),
        tepatWaktu: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} <= ${peminjaman.tanggalKembali})`.mapWith(Number),
        terlambat: sql`count(*) filter (where ${peminjaman.tanggalDikembalikan} > ${peminjaman.tanggalKembali})`.mapWith(Number),
        // ============================================================
        // [DIHAPUS] Baris ini menyebabkan error SQL karena kolom
        // nominal_denda_per_hari & denda_maksimal bukan aggregate,
        // tapi tidak ada di GROUP BY. Summary tidak butuh kolom ini.
        // ============================================================
        // nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        // dendaMaksimal: peminjaman.dendaMaksimal,
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
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID tidak valid' })

    const { denda, bukuId } = await prosesPengembalian(id)
    if (bukuId) await sinkronkanStokBuku(bukuId)

    res.json({ message: 'Buku berhasil dikembalikan', denda })
  } catch (err) {
    if (err instanceof ErrorBisnis) return res.status(err.status).json({ message: err.message })
    console.error(err)
    res.status(500).json({ message: 'Gagal memproses pengembalian' })
  }
})

module.exports = router