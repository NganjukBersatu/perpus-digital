const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, peminjaman, anggota } = require('../db/schema')
const { isNull, sql, desc } = require('drizzle-orm')
const { wajibAdmin } = require('./auth')

router.get('/stats', wajibAdmin, async (req, res) => {
  try {
    const { sekolahId } = req.user
    const totalBuku = await db.select({ count: sql`count(*)` }).from(buku)
      .where(eq(buku.sekolahId, sekolahId))
    const totalAnggota = await db
      .select({
        count: sql`count(distinct lower(btrim(${anggota.nama})))`.mapWith(Number)
      })
      .from(anggota)
      .where(and(eq(anggota.sekolahId, sekolahId), sql`${anggota.peran} in ('siswa', 'guru')`))
    const totalDipinjam = await db.select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(and(eq(peminjaman.sekolahId, sekolahId), isNull(peminjaman.tanggalDikembalikan)))

    res.json({
      totalBuku: totalBuku[0].count,
      totalAnggota: totalAnggota[0].count,
      bukuDipinjam: totalDipinjam[0].count
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil statistik' })
  }
})

router.get('/peminjaman-terbaru', wajibAdmin, async (req, res) => {
  try {
    const data = await db.select()
      .from(peminjaman)
      .where(eq(peminjaman.sekolahId, req.user.sekolahId))
      .orderBy(desc(peminjaman.id))
      .limit(5)

    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
})

router.get('/peminjaman-belum-kembali', wajibAdmin, async (req, res) => {
  try {
    const data = await db.select()
      .from(peminjaman)
      .where(and(eq(peminjaman.sekolahId, req.user.sekolahId), isNull(peminjaman.tanggalDikembalikan)))

    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
})

module.exports = router