const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, peminjaman, anggota } = require('../db/schema')
const { isNull, sql, desc } = require('drizzle-orm')

router.get('/stats', async (req, res) => {
  try {
    const totalBuku = await db.select({ count: sql`count(*)` }).from(buku)
    const totalAnggota = await db.select({ count: sql`count(*)` }).from(anggota)
    const totalDipinjam = await db.select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalKembali))

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

router.get('/peminjaman-terbaru', async (req, res) => {
  try {
    const data = await db.select()
      .from(peminjaman)
      .orderBy(desc(peminjaman.id))
      .limit(5)

    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
})

router.get('/peminjaman-belum-kembali', async (req, res) => {
  try {
    const data = await db.select()
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalKembali))

    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
})

module.exports = router