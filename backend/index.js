require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { sql, desc, isNull, gte, lte, and, eq } = require("drizzle-orm")

const { db } = require("./db/client")
const { buku, eksemplarBuku, anggota, peminjaman } = require("./db/schema")

const pengembalianRoutes = require("./routes/pengembalian")

const app = express()
app.use(cors())
app.use(express.json())

app.use("/api/pengembalian", pengembalianRoutes)

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

// GET statistik ringkas untuk dashboard
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const totalBuku = await db.select({ count: sql`count(*)` }).from(buku)
    const totalAnggota = await db.select({ count: sql`count(*)` }).from(anggota)
    const totalDipinjam = await db
      .select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalKembali))

    res.json({
      totalBuku: totalBuku[0].count,
      totalAnggota: totalAnggota[0].count,
      bukuDipinjam: totalDipinjam[0].count,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil statistik" })
  }
})

// GET 5 peminjaman terbaru
app.get("/api/dashboard/peminjaman-terbaru", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(peminjaman)
      .orderBy(desc(peminjaman.id))
      .limit(5)

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data" })
  }
})

// GET semua peminjaman yang belum dikembalikan
app.get("/api/dashboard/peminjaman-belum-kembali", async (req, res) => {
  try {
    const data = await db
      .select()
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalKembali))

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data" })
  }
})

function getRangeConfig(range) {
  const now = new Date()
  const start = new Date(now)
  let groupBy = "day"

  if (range === "1minggu") {
    start.setDate(now.getDate() - 6)
    groupBy = "day"
  } else if (range === "1bulan") {
    start.setDate(now.getDate() - 29)
    groupBy = "day"
  } else if (range === "3bulan") {
    start.setMonth(now.getMonth() - 3)
    groupBy = "week"
  } else if (range === "1tahun") {
    start.setFullYear(now.getFullYear() - 1)
    groupBy = "month"
  } else {
    start.setMonth(now.getMonth() - 6)
    groupBy = "month"
  }

  start.setHours(0, 0, 0, 0)

  return { start, groupBy }
}

function buildLabels(start, groupBy) {
  const labels = []
  const cursor = new Date(start)
  const now = new Date()

  while (cursor <= now) {
    if (groupBy === "day") {
      labels.push(cursor.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }))
      cursor.setDate(cursor.getDate() + 1)
    } else if (groupBy === "week") {
      labels.push(cursor.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }))
      cursor.setDate(cursor.getDate() + 7)
    } else {
      labels.push(cursor.toLocaleDateString("id-ID", { month: "short" }))
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  return labels
}

app.get("/api/dashboard/statistik-peminjaman", async (req, res) => {
  try {
    const range = req.query.range || "6bulan"
    const { start, groupBy } = getRangeConfig(range)
    const labels = buildLabels(start, groupBy)

    const dipinjamRows = await db.execute(sql`
      select date_trunc(${groupBy}, tanggal_pinjam) as periode, count(*) as jumlah
      from peminjaman
      where tanggal_pinjam >= ${start.toISOString()}
      group by periode
      order by periode
    `)

    const dikembalikanRows = await db.execute(sql`
      select date_trunc(${groupBy}, tanggal_kembali) as periode, count(*) as jumlah
      from peminjaman
      where tanggal_kembali >= ${start.toISOString()} and tanggal_kembali <= now()
      group by periode
      order by periode
    `)

    function mapToLabels(rows) {
      const map = {}
      for (const row of rows.rows) {
        const key = new Date(row.periode).toDateString()
        map[key] = Number(row.jumlah)
      }

      const cursor = new Date(start)
      const now = new Date()
      const values = []

      while (cursor <= now) {
        const key = cursor.toDateString()
        values.push(map[key] || 0)

        if (groupBy === "day") cursor.setDate(cursor.getDate() + 1)
        else if (groupBy === "week") cursor.setDate(cursor.getDate() + 7)
        else cursor.setMonth(cursor.getMonth() + 1)
      }

      return values
    }

    res.json({
      labels,
      dipinjam: mapToLabels(dipinjamRows),
      dikembalikan: mapToLabels(dikembalikanRows),
      totalDipinjam: dipinjamRows.rows.reduce((a, r) => a + Number(r.jumlah), 0),
      totalDikembalikan: dikembalikanRows.rows.reduce((a, r) => a + Number(r.jumlah), 0)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil statistik peminjaman" })
  }
})

app.listen(3000, () => console.log("Backend jalan di http://localhost:3000"))