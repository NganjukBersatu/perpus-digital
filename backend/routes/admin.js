const express = require('express')
const router = express.Router()

router.get('/admin/siswa', async (req, res) => {
  try {
    const daftarSiswa = await db.select().from(anggota) // sesuaikan dengan tabel kamu
    res.json(daftarSiswa)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data siswa' })
  }
})

module.exports = router