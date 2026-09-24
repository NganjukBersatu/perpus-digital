const express = require('express')
const router = express.Router()
const db = require('../db')   
const { peminjaman, eksemplarBuku, anggota, buku } = require('../db/schema')
const { eq, and, gte, lte, or, ilike, sql } = require('drizzle-orm')
const { wajibLogin } = require('./auth')
const { tanggalHariIniLokal } = require('../utils/tanggal')
const { normalisasiTanggal } = require('../utils/validasi')

// GET /api/data-peminjaman?search=&status=&start=&end=&anggotaId=
// Menampilkan SEMUA transaksi peminjaman: yang masih dipinjam, tepat waktu, maupun terlambat.
// anggotaId (opsional): filter hanya peminjaman milik anggota tertentu (dipakai di dashboard guru/siswa).
// Belum ada pagination/limit dulu — semua data yang cocok filter langsung dikirim.
router.get('/', wajibLogin, async (req, res) => {
  try {
    // Guru yang belum ganti password tidak boleh memakai endpoint ini
    if (req.user.role === 'guru' && req.user.hgp) {
      return res.status(403).json({
        error: 'Anda harus mengganti password terlebih dahulu',
        kode: 'HARUS_GANTI_PASSWORD',
      })
    }

    const { search = '', status = 'Semua', start, end, anggotaId } = req.query

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
      const mulai = normalisasiTanggal(start)
      const selesai = normalisasiTanggal(end)
      if (!mulai || !selesai) {
        return res.status(400).json({ message: 'Format tanggal harus YYYY-MM-DD' })
      }
      conditions.push(gte(peminjaman.tanggalPinjam, mulai))
      conditions.push(lte(peminjaman.tanggalPinjam, selesai))
    }

    // Admin boleh melihat semua data atau memfilter anggota mana pun.
    // Non-admin (guru/siswa) SELALU dibatasi ke datanya sendiri, apa pun isi ?anggotaId=.
    if (req.user.role !== 'admin') {
      conditions.push(eq(peminjaman.anggotaId, Number(req.user.id)))
    } else if (anggotaId) {
      conditions.push(eq(peminjaman.anggotaId, Number(anggotaId)))
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
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
        dendaGuruAktif: peminjaman.dendaGuruAktif,
        masaTenggang: peminjaman.masaTenggang,    
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${peminjaman.id} desc`)

    const today = tanggalHariIniLokal()

    // status & keterlambatan dihitung di sini, bukan kolom asli di database
    const dataLengkap = rows.map((r) => {
      let statusHitung
      let keterlambatan = '-'
      let denda = r.denda || 0

      if (r.tanggalDikembalikan) {
        const telat = Math.max(
          0,
          Math.round((new Date(r.tanggalDikembalikan) - new Date(r.batasKembali)) / 86400000)
        )
        statusHitung = telat > 0 ? 'Terlambat' : 'Tepat Waktu'
        if (telat > 0) keterlambatan = `${telat} hari`
        // sudah dikembalikan -> denda sudah final, pakai kolom r.denda apa adanya
      } else if (r.batasKembali < today) {
        const telat = Math.round((new Date(today) - new Date(r.batasKembali)) / 86400000)
        statusHitung = 'Terlambat'
        keterlambatan = `${telat} hari`

        // kurangi masa tenggang
        const masaTenggang = r.masaTenggang || 0
        const hariKenaDenda = Math.max(0, telat - masaTenggang)

        // belum dikembalikan tapi sudah lewat jatuh tempo -> hitung denda berjalan (estimasi)
        const dendaDinonaktifkanUntukGuru = r.peranPeminjam === 'guru' && !r.dendaGuruAktif
        if (dendaDinonaktifkanUntukGuru) {
          denda = 0
        } else {
          const tarif = r.nominalDendaPerHari || 0
          denda = hariKenaDenda * tarif
          if (r.dendaMaksimal > 0) {
            denda = Math.min(denda, r.dendaMaksimal)
          }
        }
      } else {
        statusHitung = 'Dipinjam'
        denda = 0
      }

      return { ...r, status: statusHitung, keterlambatan, denda }
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