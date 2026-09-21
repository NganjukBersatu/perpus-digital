const { Router } = require('express')
const { eq, isNull, and, sql, desc } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, buku, kategori, anggota } = require('../db/schema')
const { wajibLoginSiswa } = require('./authSiswa')
const { hitungDenda, ambilPengaturanNotifikasi } = require('../utils/hitungDenda')
const { sinkronkanStokBuku } = require('./buku') 

const router = Router()

// GET /dashboard-siswa/stats
router.get('/stats', wajibLoginSiswa, async (req, res) => {
  try {
    const anggotaId = req.siswa.id

    const sedangDipinjam = await db.select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(and(eq(peminjaman.anggotaId, anggotaId), isNull(peminjaman.tanggalDikembalikan)))

    const sudahDikembalikan = await db.select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(and(eq(peminjaman.anggotaId, anggotaId), sql`${peminjaman.tanggalDikembalikan} is not null`))

    const belumKembali = await db.select({ tanggalKembali: peminjaman.tanggalKembali })
      .from(peminjaman)
      .where(and(eq(peminjaman.anggotaId, anggotaId), isNull(peminjaman.tanggalDikembalikan)))

    const pengaturanNotif = await ambilPengaturanNotifikasi(db)  
    const batasHari = pengaturanNotif.hariSebelumJatuhTempo ?? 3

    const today = new Date()
    today.setHours(0, 0, 0, 0) 

    const hampirJatuhTempo = belumKembali.filter(row => {
      if (!row.tanggalKembali) return false
      const due = new Date(row.tanggalKembali)
      due.setHours(0, 0, 0, 0) 
      const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24)) 
      return diffDays >= 0 && diffDays <= batasHari 
    }).length

    res.json({
      sedangDipinjam: Number(sedangDipinjam[0].count),
      sudahDikembalikan: Number(sudahDikembalikan[0].count),
      hampirJatuhTempo
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil statistik' })
  }
})

// GET /dashboard-siswa/peminjaman-aktif
router.get('/peminjaman-aktif', wajibLoginSiswa, async (req, res) => {
  try {
    const anggotaId = req.siswa.id

    const data = await db.select({
      id: peminjaman.id,
      tanggalPinjam: peminjaman.tanggalPinjam,
      tanggalKembali: peminjaman.tanggalKembali,
      judul: buku.judul,
      kategori: kategori.nama,
      nominalDendaPerHari: peminjaman.nominalDendaPerHari,
      dendaMaksimal: peminjaman.dendaMaksimal,
      masaTenggang: peminjaman.masaTenggang,   
    })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .leftJoin(kategori, eq(buku.kategoriId, kategori.id))
      .where(and(eq(peminjaman.anggotaId, anggotaId), isNull(peminjaman.tanggalDikembalikan)))
      .orderBy(desc(peminjaman.id))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const hasil = data.map(row => {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const hariTerlambat = Math.max(0, Math.round((today - batas) / (1000 * 60 * 60 * 24)))

      const masaTenggang = row.masaTenggang || 0
      const hariKenaDenda = Math.max(0, hariTerlambat - masaTenggang)

      let denda = 0
      if (hariKenaDenda > 0) {
        const tarif = row.nominalDendaPerHari || 0
        denda = hariKenaDenda * tarif
        if (row.dendaMaksimal > 0) {
          denda = Math.min(denda, row.dendaMaksimal)
        }
      }

      return { ...row, hariTerlambat, hariKenaDenda, denda } 
    })

    
    res.json(hasil)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data peminjaman' })
  }
})

// PATCH /dashboard-siswa/kembalikan/:id
router.patch('/kembalikan/:id', wajibLoginSiswa, async (req, res) => {
  try {
    const anggotaId = req.siswa.id
    const { id } = req.params
    const today = new Date().toISOString().slice(0, 10)

    // Ambil data peminjaman + snapshot denda + peran
    const [row] = await db
      .select({
        id: peminjaman.id,
        tanggalKembali: peminjaman.tanggalKembali,
        eksemplarId: peminjaman.eksemplarId,
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
        dendaGuruAktif: peminjaman.dendaGuruAktif,
        masaTenggang: peminjaman.masaTenggang,
        peran: anggota.peran,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .where(and(
        eq(peminjaman.id, Number(id)),
        eq(peminjaman.anggotaId, anggotaId),
        isNull(peminjaman.tanggalDikembalikan)
      ))

    if (!row) {
      return res.status(404).json({ 
        message: 'Data peminjaman tidak ditemukan atau sudah dikembalikan' 
      })
    }

    // Hitung denda pakai snapshot yang tersimpan saat pinjam
    const pengaturanDenda = {
      aktif: (row.nominalDendaPerHari || 0) > 0,
      nominalPerHari: row.nominalDendaPerHari || 0,
      dendaMaksimal: row.dendaMaksimal || 0,
      dendaGuruAktif: row.dendaGuruAktif ?? false,
      masaTenggang: row.masaTenggang ?? 0,
    }

    const { denda } = hitungDenda({
      tanggalKembali: row.tanggalKembali,
      tanggalDikembalikan: today,
      peran: row.peran,
      pengaturanDenda,
    })

    // Update peminjaman
    const [updated] = await db
      .update(peminjaman)
      .set({ 
        tanggalDikembalikan: today, 
        denda 
      })
      .where(eq(peminjaman.id, row.id))
      .returning()

    // Kembalikan status eksemplar menjadi tersedia
    await db
      .update(eksemplarBuku)
      .set({ status: 'tersedia' })
      .where(eq(eksemplarBuku.id, row.eksemplarId))

    const [{ bukuId: bukuIdDikembalikan }] = await db
      .select({ bukuId: eksemplarBuku.bukuId })
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.id, row.eksemplarId))
    await sinkronkanStokBuku(bukuIdDikembalikan)

    res.json({ 
      message: 'Buku berhasil dikembalikan', 
      data: updated,
      denda 
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengembalikan buku' })
  }
})

// GET /dashboard-siswa/riwayat — semua riwayat peminjaman siswa
// GET /dashboard-siswa/riwayat — semua riwayat peminjaman siswa
router.get('/riwayat', wajibLoginSiswa, async (req, res) => {
  try {
    const anggotaId = req.siswa.id

    const data = await db.select({
      id: peminjaman.id,
      tanggalPinjam: peminjaman.tanggalPinjam,
      tanggalKembali: peminjaman.tanggalKembali,
      tanggalDikembalikan: peminjaman.tanggalDikembalikan,
      denda: peminjaman.denda,
      statusDenda: peminjaman.statusDenda,
      judul: buku.judul,
      penulis: buku.penulis,
      kategori: kategori.nama,
      masaTenggang: peminjaman.masaTenggang,
    })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .leftJoin(kategori, eq(buku.kategoriId, kategori.id))
      .where(eq(peminjaman.anggotaId, anggotaId))
      .orderBy(desc(peminjaman.id))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const hasil = data.map(row => {
      const masaTenggang = row.masaTenggang || 0
      let status

      if (row.tanggalDikembalikan) {
        // Sudah dikembalikan → hitung apakah telat > masa tenggang
        const due = new Date(row.tanggalKembali)
        const kembali = new Date(row.tanggalDikembalikan)
        due.setHours(0, 0, 0, 0)
        kembali.setHours(0, 0, 0, 0)
        const telat = Math.max(0, Math.round((kembali - due) / (1000 * 60 * 60 * 24)))
        status = telat > masaTenggang ? 'Terlambat' : 'Dikembalikan'
      } else {
        const due = new Date(row.tanggalKembali)
        due.setHours(0, 0, 0, 0)
        const telat = Math.max(0, Math.round((today - due) / (1000 * 60 * 60 * 24)))

        if (telat > masaTenggang) {
          status = 'Terlambat'
        } else if (telat > 0) {
          status = 'Masa Tenggang'
        } else {
          status = 'Dipinjam'
        }
      }
      return { ...row, status }
    })

    res.json(hasil)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil riwayat peminjaman' })
  }
})

// GET /dashboard-siswa/profil
router.get('/profil', wajibLoginSiswa, async (req, res) => {
  try {
    const [siswa] = await db
      .select({
        id: anggota.id,
        nama: anggota.nama,
        nis: anggota.nis,
        kelas: anggota.kelas,
        tanggalLahir: anggota.tanggalLahir,
        peran: anggota.peran
      })
      .from(anggota)
      .where(eq(anggota.id, req.siswa.id))

    if (!siswa) {
      return res.status(404).json({
        message: 'Data siswa tidak ditemukan'
      })
    }

    res.json(siswa)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      message: 'Gagal mengambil profil siswa'
    })
  }
})

module.exports = router