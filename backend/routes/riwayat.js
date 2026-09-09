const express = require('express')
const router = express.Router()
const db = require('../db')
const { peminjaman, anggota, eksemplarBuku, buku } = require('../db/schema')
const { eq, desc } = require('drizzle-orm')

// GET semua riwayat aktivitas (pinjam, kembali, telat, bayar denda)
router.get('/', async (req, res) => {
  try {
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
        tanggalBayarDenda: peminjaman.tanggalBayarDenda,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(anggota.id, peminjaman.anggotaId))
      .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .orderBy(desc(peminjaman.id))

    // Ubah setiap baris peminjaman jadi 1-3 "event" aktivitas
    const events = []

    for (const r of rows) {
      if (r.tanggalPinjam) {
        events.push({
          id: `${r.id}-pinjam`,
          tipe: 'pinjam',
          tanggal: r.tanggalPinjam,
          nama: r.nama,
          kelas: r.kelas,
          judul: r.judul,
          keterangan: `meminjam "${r.judul}"`,
        })
      }

      if (r.tanggalDikembalikan) {
        const telat = r.tanggalKembali && new Date(r.tanggalDikembalikan) > new Date(r.tanggalKembali)
        events.push({
          id: `${r.id}-kembali`,
          tipe: telat ? 'telat' : 'kembali',
          tanggal: r.tanggalDikembalikan,
          nama: r.nama,
          kelas: r.kelas,
          judul: r.judul,
          keterangan: telat ? `terlambat mengembalikan "${r.judul}"` : `mengembalikan "${r.judul}"`,
        })
      }

      if (r.tanggalBayarDenda) {
        events.push({
          id: `${r.id}-denda`,
          tipe: 'denda',
          tanggal: r.tanggalBayarDenda,
          nama: r.nama,
          kelas: r.kelas,
          judul: r.judul,
          keterangan: `membayar denda Rp${r.denda ?? 0} untuk "${r.judul}"`,
        })
      }
    }

    // urutkan semua event dari yang terbaru
    events.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

    res.json(events)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil riwayat aktivitas' })
  }
})

module.exports = router