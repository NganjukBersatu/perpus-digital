const express = require('express')
const router = express.Router()
const db = require('../db')
const { peminjaman, anggota, eksemplarBuku, buku } = require('../db/schema')
const { eq, and, gte, lte, desc } = require('drizzle-orm')

router.get('/', async (req, res) => {
  try {
    const { dari, sampai } = req.query
    if (!dari || !sampai) {
      return res.status(400).json({ error: 'Rentang tanggal (dari & sampai) wajib diisi' })
    }

    const rows = await db
      .select({
        id: peminjaman.id,
        nama: anggota.nama,
        kelas: anggota.kelas,
        judul: buku.judul,
        tanggalPinjam: peminjaman.tanggalPinjam,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
        denda: peminjaman.denda,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(anggota.id, peminjaman.anggotaId))
      .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(and(gte(peminjaman.tanggalPinjam, dari), lte(peminjaman.tanggalPinjam, sampai)))
      .orderBy(desc(peminjaman.tanggalPinjam))

    const ringkasan = {
      totalPeminjaman: rows.length,
      totalPengembalian: rows.filter((r) => r.tanggalDikembalikan).length,
      totalTerlambat: rows.filter(
        (r) => r.tanggalDikembalikan && r.tanggalKembali &&
          new Date(r.tanggalDikembalikan) > new Date(r.tanggalKembali)
      ).length,
      totalDenda: rows.reduce((sum, r) => sum + (r.denda || 0), 0),
    }

    res.json({ ringkasan, data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data laporan' })
  }
})

module.exports = router