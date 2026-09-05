const express = require('express')
const router = express.Router()
const db = require('../db')
const { peminjaman, eksemplarBuku, anggota } = require('../db/schema')
const { eq, and } = require('drizzle-orm')

router.post('/', async (req, res) => {
  try {
    const { eksemplarId, nama, kelas, tanggalPinjam, tanggalKembali } = req.body

    let anggotaRecord = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.nama, nama), eq(anggota.kelas, kelas)))

    let anggotaId

    if (anggotaRecord.length === 0) {
      const inserted = await db
        .insert(anggota)
        .values({ nama, kelas })
        .returning({ id: anggota.id })

      anggotaId = inserted[0].id
    } else {
      anggotaId = anggotaRecord[0].id
    }

    await db.insert(peminjaman).values({
      eksemplarId,
      anggotaId,
      nama,
      kelas,
      tanggalPinjam,
      tanggalKembali
    })

    await db.update(eksemplarBuku)
      .set({ status: 'dipinjam' })
      .where(eq(eksemplarBuku.id, eksemplarId))

    res.status(201).json({ message: 'Peminjaman berhasil disimpan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menyimpan peminjaman' })
  }
})

module.exports = router