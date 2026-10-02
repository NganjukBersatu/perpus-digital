const { Router } = require("express")
const { asc, eq } = require("drizzle-orm")
const db = require("../db/index") // sesuaikan path file koneksi drizzle kamu
const { kelas } = require("../db/schema")
const { opsionalLogin } = require("./auth")
const { sekolahIdDari, ambilSekolahAktif } = require("../utils/sekolah")

const router = Router()

router.get("/kelas", opsionalLogin, async (req, res) => {
  try {
    const sekolahId = sekolahIdDari(req)
    if (!sekolahId) return res.status(400).json({ message: "sekolahId wajib diisi" })
    if (!req.user?.sekolahId && !(await ambilSekolahAktif(sekolahId))) {
      return res.status(404).json({ message: "Sekolah tidak ditemukan" })
    }
    const rows = await db
      .select({ namaKelas: kelas.namaKelas })
      .from(kelas)
      .where(eq(kelas.sekolahId, sekolahId))
      .orderBy(asc(kelas.namaKelas))

    const daftarKelas = rows.map((row) => row.namaKelas)

    res.json(daftarKelas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data kelas" })
  }
})

module.exports = router