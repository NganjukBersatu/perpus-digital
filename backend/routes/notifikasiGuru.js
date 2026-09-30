// routes/notifikasiGuru.js
// Route ini dipasang dari index.js dengan middleware `wajibLoginGuru` (routes/auth.js),
// yang sudah memastikan token valid, role = 'guru', dan guru tidak sedang wajib ganti
// password. Payload token ada di req.user: { id, nip, role: 'guru', hgp }.

const { eq, and, isNull } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, buku } = require('../db/schema')
const { ambilAturanNotifikasi, bangunNotifikasiPinjaman } = require('../helpers/aturanNotifikasi')

function pasangRouteNotifikasiGuru(app, wajibLoginGuru) {

  app.get('/api/guru/notifikasi', wajibLoginGuru, async (req, res) => {
    try {
      const anggotaId = req.user.id

      const daftarPinjam = await db
        .select({
          id: peminjaman.id,
          judul: buku.judul,
          tanggalKembali: peminjaman.tanggalKembali,
          denda: peminjaman.denda,
          statusDenda: peminjaman.statusDenda,
          nominalDendaPerHari: peminjaman.nominalDendaPerHari,
          dendaMaksimal: peminjaman.dendaMaksimal,
          dendaGuruAktif: peminjaman.dendaGuruAktif,
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
        // Khusus guru: denda hanya berlaku kalau dendaGuruAktif === true
        const dendaBerlaku = item.dendaGuruAktif === true
        notifikasi.push(...bangunNotifikasiPinjaman(item, aturan, { dendaBerlaku }))
      }

      res.json(notifikasi)
    } catch (err) {
      console.error('Gagal mengambil notifikasi guru:', err)
      res.status(500).json({ message: 'Gagal mengambil notifikasi' })
    }
  })

  app.patch('/api/guru/notifikasi/:id/baca', wajibLoginGuru, async (req, res) => {
    res.json({ ok: true })
  })
}

module.exports = { pasangRouteNotifikasiGuru }