const express = require('express')
const router = express.Router()
const db = require('../db')
const { peminjaman, anggota, eksemplarBuku, buku, pengaturanPerpustakaan } = require('../db/schema')
const { eq, and, gte, lte, desc } = require('drizzle-orm')
const { wajibAdmin } = require('./auth')
const { normalisasiTanggal } = require('../utils/validasi')

router.get('/', wajibAdmin, async (req, res) => {
  try {
    const dari = normalisasiTanggal(req.query.dari)
    const sampai = normalisasiTanggal(req.query.sampai)
    if (!dari || !sampai) {
      return res.status(400).json({ error: 'Rentang tanggal (dari & sampai) wajib diisi dengan format YYYY-MM-DD' })
    }
    if (dari > sampai) {
      return res.status(400).json({ error: 'Tanggal "dari" tidak boleh setelah tanggal "sampai"' })
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
          new Date(r.tanggalDikembalikan) > new Date(r.tanggalKembali) &&
          (r.denda || 0) > 0
      ).length,
      totalDenda: rows.reduce((sum, r) => sum + (r.denda || 0), 0),
    }

    const [infoPerpus] = await db.select().from(pengaturanPerpustakaan).limit(1)
    const infoPerpustakaan = {
      namaSekolah: infoPerpus?.namaSekolah || '',
      namaPerpustakaan: infoPerpus?.namaPerpustakaan || '',
      alamat: infoPerpus?.alamat || '',
      kepalaPerpustakaan: infoPerpus?.detail?.perpustakaan?.kepalaPerpustakaan || '',
      tahunAjaran: infoPerpus?.detail?.perpustakaan?.tahunAjaran || '',
    }

    res.json({ infoPerpustakaan, ringkasan, data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data laporan' })
  }
})

module.exports = router