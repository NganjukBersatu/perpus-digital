const express = require("express")
const { eq, and, or, isNull } = require("drizzle-orm")
const { db } = require("../db/client")
const { sekolah, kelas, anggota } = require("../db/schema")
const { sekolahIdDari } = require("../utils/sekolah")

const router = express.Router()

const kodeError = (e) => e.code || e.cause?.code

// Ambil id sekolah dari data login. Kalau tidak ada dan database hanya punya
// satu sekolah, pakai sekolah itu.
async function ambilSekolahId(req) {
  const dariLogin = sekolahIdDari(req)
  if (dariLogin) return Number(dariLogin)
  const semua = await db.select({ id: sekolah.id }).from(sekolah).limit(2)
  return semua.length === 1 ? semua[0].id : null
}

router.use(async (req, res, next) => {
  try {
    const sid = await ambilSekolahId(req)
    if (!sid) return res.status(400).json({ message: "Sekolah tidak dikenali" })
    req.sekolahId = sid
    next()
  } catch (err) {
    next(err)
  }
})

// Kondisi anggota yang memakai nama kelas tertentu
// (anggota lama bisa punya sekolahId kosong, jadi ikut dihitung)
function anggotaDenganKelas(sid, namaKelas) {
  return and(
    eq(anggota.kelas, namaKelas),
    or(eq(anggota.sekolahId, sid), isNull(anggota.sekolahId))
  )
}

// GET semua kelas
router.get("/", async (req, res) => {
  try {
    const data = await db.select().from(kelas)
      .where(eq(kelas.sekolahId, req.sekolahId))
      .orderBy(kelas.namaKelas)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data kelas" })
  }
})

// POST tambah kelas
router.post("/", async (req, res) => {
  try {
    const nama = String(req.body?.namaKelas || "").trim()
    if (!nama) return res.status(400).json({ message: "Nama kelas wajib diisi" })
    if (nama.length > 50) return res.status(400).json({ message: "Nama kelas maksimal 50 karakter" })

    const [baru] = await db.insert(kelas)
      .values({ sekolahId: req.sekolahId, namaKelas: nama })
      .returning()
    res.status(201).json(baru)
  } catch (err) {
    if (kodeError(err) === "23505") return res.status(409).json({ message: "Nama kelas sudah ada" })
    console.error(err)
    res.status(500).json({ message: "Gagal menambah kelas" })
  }
})

// PUT ubah nama kelas (nama kelas di data anggota ikut diubah)
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" })

    const nama = String(req.body?.namaKelas || "").trim()
    if (!nama) return res.status(400).json({ message: "Nama kelas wajib diisi" })
    if (nama.length > 50) return res.status(400).json({ message: "Nama kelas maksimal 50 karakter" })

    const sid = req.sekolahId
    const [lama] = await db.select().from(kelas)
      .where(and(eq(kelas.id, id), eq(kelas.sekolahId, sid)))
    if (!lama) return res.status(404).json({ message: "Kelas tidak ditemukan" })

    await db.transaction(async (tx) => {
      await tx.update(kelas).set({ namaKelas: nama }).where(eq(kelas.id, id))
      await tx.update(anggota).set({ kelas: nama })
        .where(anggotaDenganKelas(sid, lama.namaKelas))
    })
    res.json({ ok: true })
  } catch (err) {
    if (kodeError(err) === "23505") return res.status(409).json({ message: "Nama kelas sudah ada" })
    console.error(err)
    res.status(500).json({ message: "Gagal mengubah kelas" })
  }
})

// DELETE hapus kelas (ditolak kalau masih dipakai anggota)
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" })

    const sid = req.sekolahId
    const [k] = await db.select().from(kelas)
      .where(and(eq(kelas.id, id), eq(kelas.sekolahId, sid)))
    if (!k) return res.status(404).json({ message: "Kelas tidak ditemukan" })

    const dipakai = await db.select({ id: anggota.id }).from(anggota)
      .where(anggotaDenganKelas(sid, k.namaKelas)).limit(1)
    if (dipakai.length) {
      return res.status(409).json({ message: "Kelas masih dipakai data siswa, tidak bisa dihapus" })
    }

    await db.delete(kelas).where(eq(kelas.id, id))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal menghapus kelas" })
  }
})

module.exports = router