const express = require('express')
const router = express.Router()
const db = require('../db')
const { eksemplarBuku, buku } = require('../db/schema')
const { eq, ilike } = require('drizzle-orm')

router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params

    const cocok = await db
      .select({
        eksemplarId: eksemplarBuku.id,
        bukuId: eksemplarBuku.bukuId,
        status: eksemplarBuku.status,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
      })
      .from(eksemplarBuku)
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(ilike(eksemplarBuku.barcode, `${barcode}%`))

    if (cocok.length === 0) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }

    const bukuId = cocok[0].bukuId

    const semuaEksemplar = await db
      .select({
        id: eksemplarBuku.id,
        barcode: eksemplarBuku.barcode,
        status: eksemplarBuku.status,
      })
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, bukuId))
      .orderBy(eksemplarBuku.id)

    const dipilih = cocok.find((r) => r.status === 'tersedia') || cocok[0]

    res.json({
      eksemplarId: dipilih.eksemplarId,
      bukuId,
      status: dipilih.status,
      judul: dipilih.judul,
      penulis: dipilih.penulis,
      penerbit: dipilih.penerbit,
      eksemplarList: semuaEksemplar,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Terjadi kesalahan' })
  }
})

module.exports = router