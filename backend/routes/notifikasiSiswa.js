// routes/notifikasiSiswa.js
const { ambilAturanNotifikasi, bangunNotifikasiPinjaman } = require('../helpers/aturanNotifikasi')
const { eq, and, isNull } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, buku } = require('../db/schema')

function pasangRouteNotifikasiSiswa(app, verifikasiToken) {

  app.get('/api/siswa/notifikasi', verifikasiToken, async (req, res) => {
    try {
      const anggotaId = req.siswa?.id
      if (!anggotaId) {
        return res.status(401).json({ message: 'Siswa tidak terautentikasi' })
      }

      const daftarPinjam = await db
        .select({
          id: peminjaman.id,
          judul: buku.judul,
          tanggalKembali: peminjaman.tanggalKembali,
          denda: peminjaman.denda,
          statusDenda: peminjaman.statusDenda,
          nominalDendaPerHari: peminjaman.nominalDendaPerHari,
          dendaMaksimal: peminjaman.dendaMaksimal,
          masaTenggang: peminjaman.masaTenggang,
        })
        .from(peminjaman)
        .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
        .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
        .where(
          and(
            eq(peminjaman.anggotaId, anggotaId),
            isNull(peminjaman.tanggalDikembalikan)
          )
        )

      const aturan = await ambilAturanNotifikasi()
      const notifikasi = []

      for (const item of daftarPinjam) {
        notifikasi.push(...bangunNotifikasiPinjaman(item, aturan))
      }

      res.json(notifikasi)
    } catch (err) {
      console.error('Gagal mengambil notifikasi siswa:', err)
      res.status(500).json({ message: 'Gagal mengambil notifikasi' })
    }
  })

  app.patch('/api/siswa/notifikasi/:id/baca', verifikasiToken, async (req, res) => {
    res.json({ ok: true })
  })
}

module.exports = { pasangRouteNotifikasiSiswa }