const { Router } = require("express")
const { asc } = require("drizzle-orm")
const db = require("../db/index") // sesuaikan path file koneksi drizzle kamu
const { kelas } = require("../db/schema")

const router = Router()

router.get("/kelas", async (req, res) => {
  try {
    const rows = await db
      .select({ namaKelas: kelas.namaKelas })
      .from(kelas)
      .orderBy(asc(kelas.namaKelas))

    const daftarKelas = rows.map((row) => row.namaKelas)

    res.json(daftarKelas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data kelas" })
  }
})

module.exports = router