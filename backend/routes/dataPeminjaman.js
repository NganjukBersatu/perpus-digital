const express = require('express')
const router = express.Router()
const db = require('../db')   
const { peminjaman, eksemplarBuku, anggota, buku } = require('../db/schema')
const { eq, and, gte, lte, or, ilike, sql } = require('drizzle-orm')

// GET /api/data-peminjaman?search=&status=&start=&end=
// Menampilkan SEMUA transaksi peminjaman: yang masih dipinjam, tepat waktu, maupun terlambat.
// Belum ada pagination/limit dulu — semua data yang cocok filter langsung dikirim.
router.get('/', async (req, res) => {
  try {
    const { search = '', status = 'Semua', start, end } = req.query

    const conditions = []

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
      conditions.push(gte(peminjaman.tanggalPinjam, start))
      conditions.push(lte(peminjaman.tanggalPinjam, end))
    }

    const rows = await db
      .select({
        id: peminjaman.id,
        namaPeminjam: anggota.nama,
        kelasPeminjam: anggota.kelas,
        peranPeminjam: anggota.peran,
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
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${peminjaman.id} desc`)

    const today = new Date().toISOString().slice(0, 10)

    // status & keterlambatan dihitung di sini, bukan kolom asli di database
    const dataLengkap = rows.map((r) => {
      let statusHitung
      let keterlambatan = '-'

      if (r.tanggalDikembalikan) {
        const telat = Math.max(
          0,
          Math.round((new Date(r.tanggalDikembalikan) - new Date(r.batasKembali)) / 86400000)
        )
        statusHitung = telat > 0 ? 'Terlambat' : 'Tepat Waktu'
        if (telat > 0) keterlambatan = `${telat} hari`
      } else if (r.batasKembali < today) {
        const telat = Math.round((new Date(today) - new Date(r.batasKembali)) / 86400000)
        statusHitung = 'Terlambat'
        keterlambatan = `${telat} hari`
      } else {
        statusHitung = 'Dipinjam'
      }

      return { ...r, status: statusHitung, keterlambatan }
    })

    const data =
      status && status !== 'Semua' ? dataLengkap.filter((r) => r.status === status) : dataLengkap

    res.json({ data, total: data.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data peminjaman' })
  }
})

module.exports = router