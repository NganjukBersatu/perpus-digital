require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { eq } = require("drizzle-orm")

const { db } = require("./db/client")
const { buku, eksemplarBuku, anggota, peminjaman } = require("./db/schema")

const app = express()
app.use(cors())
app.use(express.json())

// GET data buku berdasarkan barcode
app.get("/api/eksemplar-buku/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params

    const result = await db
      .select({
        eksemplarId: eksemplarBuku.id,
        barcode: eksemplarBuku.barcode,
        status: eksemplarBuku.status,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
      })
      .from(eksemplarBuku)
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(eq(eksemplarBuku.barcode, barcode))

    if (result.length === 0) {
      return res.status(404).json({ message: "Buku tidak ditemukan" })
    }

    res.json(result[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Terjadi kesalahan server" })
  }
})

// POST simpan peminjaman baru
app.post("/api/peminjaman", async (req, res) => {
  try {
    const { eksemplarId, nama, kelas, tanggalPinjam, tanggalKembali } = req.body

    const anggotaBaru = await db
      .insert(anggota)
      .values({ nama, kelas })
      .returning({ id: anggota.id })

    const anggotaId = anggotaBaru[0].id

    await db.insert(peminjaman).values({
      nama,
      kelas,
      eksemplarId,
      anggotaId,
      tanggalPinjam,
      tanggalKembali,
    })

    await db
      .update(eksemplarBuku)
      .set({ status: "dipinjam" })
      .where(eq(eksemplarBuku.id, eksemplarId))

    res.status(201).json({ message: "Peminjaman berhasil disimpan" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal menyimpan peminjaman" })
  }
})

app.listen(3000, () => console.log("Backend jalan di http://localhost:3000"))