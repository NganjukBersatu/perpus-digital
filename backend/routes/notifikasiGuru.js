// routes/notifikasiGuru.js
// Guru login lewat endpoint yang sama dengan admin (routes/auth.js),
// jadi middleware yang dipakai adalah `wajibLogin`, dan payload token
// ditaruh di req.admin (meski isinya guru: { id, nip, role: 'guru' }).

const { eq, and, isNull } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, buku } = require('../db/schema')
const { ambilAturanNotifikasi, bangunNotifikasiPinjaman } = require('../helpers/aturanNotifikasi')

function pasangRouteNotifikasiGuru(app, wajibLogin) {

  app.get('/api/guru/notifikasi', wajibLogin, async (req, res) => {
    try {
      // req.admin di sini sebenarnya payload guru: { id, nip, role: 'guru' }
      if (req.admin.role !== 'guru') {
        return res.status(403).json({ message: 'Akses hanya untuk guru' })
      }

      const anggotaId = req.admin.id

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
        // ⬅️ Khusus guru: denda hanya berlaku kalau dendaGuruAktif === true
        const dendaBerlaku = item.dendaGuruAktif === true
        notifikasi.push(...bangunNotifikasiPinjaman(item, aturan, { dendaBerlaku }))
      }

      res.json(notifikasi)
    } catch (err) {
      console.error('Gagal mengambil notifikasi guru:', err)
      res.status(500).json({ message: 'Gagal mengambil notifikasi' })
    }
  })

  app.patch('/api/guru/notifikasi/:id/baca', wajibLogin, async (req, res) => {
    res.json({ ok: true })
  })
}

module.exports = { pasangRouteNotifikasiGuru }