const { Router } = require('express')
const { eq, isNull, and, sql, desc } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, buku, kategori, anggota } = require('../db/schema')
const { wajibLoginSiswa } = require('./authSiswa')

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

    const today = new Date()
    const hampirJatuhTempo = belumKembali.filter(row => {
      if (!row.tanggalKembali) return false
      const due = new Date(row.tanggalKembali)
      const diffDays = (due - today) / (1000 * 60 * 60 * 24)
      return diffDays <= 3 && diffDays >= 0
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
      kategori: kategori.nama
    })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .leftJoin(kategori, eq(buku.kategoriId, kategori.id))
      .where(and(eq(peminjaman.anggotaId, anggotaId), isNull(peminjaman.tanggalDikembalikan)))
      .orderBy(desc(peminjaman.id))

    res.json(data)
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

    const result = await db.update(peminjaman)
      .set({ tanggalDikembalikan: new Date().toISOString().slice(0, 10) })
      .where(and(eq(peminjaman.id, Number(id)), eq(peminjaman.anggotaId, anggotaId)))
      .returning()

    if (result.length === 0) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan atau bukan milik kamu' })
    }

    res.json({ message: 'Buku berhasil dikembalikan', data: result[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengembalikan buku' })
  }
})

// GET /dashboard-siswa/riwayat — semua riwayat peminjaman siswa (baik masih dipinjam maupun sudah dikembalikan)
router.get('/riwayat', wajibLoginSiswa, async (req, res) => {
  try {
    const anggotaId = req.siswa.id

    const data = await db.select({
      id: peminjaman.id,
      tanggalPinjam: peminjaman.tanggalPinjam,
      tanggalKembali: peminjaman.tanggalKembali,
      tanggalDikembalikan: peminjaman.tanggalDikembalikan,
      denda: peminjaman.denda,
      judul: buku.judul,
      penulis: buku.penulis,
      kategori: kategori.nama
    })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .leftJoin(kategori, eq(buku.kategoriId, kategori.id))
      .where(eq(peminjaman.anggotaId, anggotaId))
      .orderBy(desc(peminjaman.id))

    const today = new Date().toISOString().slice(0, 10)

    const hasil = data.map(row => {
      let status
      if (row.tanggalDikembalikan) {
        status = row.tanggalDikembalikan > row.tanggalKembali ? 'Terlambat' : 'Dikembalikan'
      } else if (row.tanggalKembali < today) {
        status = 'Terlambat'
      } else {
        status = 'Dipinjam'
      }
      return { ...row, status }
    })

    res.json(hasil)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil riwayat peminjaman' })
  }
})

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