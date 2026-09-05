const express = require('express')
const router = express.Router()
const db = require('../db')
const { eksemplarBuku, buku } = require('../db/schema')
const { eq } = require('drizzle-orm')

router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params

    const result = await db
      .select({
        eksemplarId: eksemplarBuku.id,
        status: eksemplarBuku.status,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit
      })
      .from(eksemplarBuku)
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(eq(eksemplarBuku.barcode, barcode))

    if (result.length === 0) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }

    res.json(result[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Terjadi kesalahan' })
  }
})

module.exports = router