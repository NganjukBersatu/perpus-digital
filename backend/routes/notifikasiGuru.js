// routes/notifikasiGuru.js
// Guru login lewat endpoint yang sama dengan admin (routes/auth.js),
// jadi middleware yang dipakai adalah `wajibLogin`, dan payload token
// ditaruh di req.admin (meski isinya guru: { id, nip, role: 'guru' }).

const { eq, and, isNull } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, buku } = require('../db/schema')

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

      const sekarang = new Date()
      sekarang.setHours(0, 0, 0, 0)

      const notifikasi = []

      for (const item of daftarPinjam) {
        const jatuhTempo = new Date(item.tanggalKembali)
        jatuhTempo.setHours(0, 0, 0, 0)

        const selisihHari = Math.round((jatuhTempo - sekarang) / (1000 * 60 * 60 * 24))
        const masaTenggang = item.masaTenggang || 0
        const hariTerlambatEfektif = -selisihHari - masaTenggang

        // catatan: dendaGuruAktif menentukan apakah guru memang dikenakan
        // denda saat terlambat (beberapa sekolah membebaskan guru dari denda)
        const dendaBerlaku = item.dendaGuruAktif !== false

        if (selisihHari < 0 && hariTerlambatEfektif > 0) {
          let pesan = `"${item.judul}" terlambat ${hariTerlambatEfektif} hari`

          if (dendaBerlaku) {
            let estimasiDenda = hariTerlambatEfektif * (item.nominalDendaPerHari || 0)
            if (item.dendaMaksimal > 0 && estimasiDenda > item.dendaMaksimal) {
              estimasiDenda = item.dendaMaksimal
            }
            pesan += `. Estimasi denda Rp${estimasiDenda.toLocaleString('id-ID')}`
          }

          notifikasi.push({
            id: `terlambat-${item.id}`,
            tipe: 'terlambat',
            judul: 'Buku terlambat dikembalikan',
            pesan
          })
        } else if (selisihHari < 0) {
          notifikasi.push({
            id: `tenggang-${item.id}`,
            tipe: 'jatuh_tempo',
            judul: 'Masih dalam masa tenggang',
            pesan: `"${item.judul}" sudah lewat jatuh tempo, segera kembalikan sebelum masa tenggang habis`
          })
        } else if (selisihHari <= 2) {
          notifikasi.push({
            id: `jatuh-tempo-${item.id}`,
            tipe: 'jatuh_tempo',
            judul: 'Buku hampir jatuh tempo',
            pesan: selisihHari === 0
              ? `"${item.judul}" harus dikembalikan hari ini`
              : `"${item.judul}" jatuh tempo dalam ${selisihHari} hari`
          })
        }

        if (dendaBerlaku && item.statusDenda === 'belum_dibayar' && Number(item.denda) > 0) {
          notifikasi.push({
            id: `denda-${item.id}`,
            tipe: 'terlambat',
            judul: 'Denda belum dibayar',
            pesan: `Denda untuk "${item.judul}" sebesar Rp${Number(item.denda).toLocaleString('id-ID')} belum dibayar`
          })
        }
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