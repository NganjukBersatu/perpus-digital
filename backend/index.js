require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { sql, desc, isNull, gte, lte, and, eq, lt } = require("drizzle-orm")

const { db } = require("./db/client")
const { buku, eksemplarBuku, anggota, peminjaman } = require("./db/schema")

const pengembalianRoutes = require("./routes/pengembalian")
const bukuRoutes = require("./routes/buku")
const siswaRoutes = require("./routes/siswa")
const kelasRoutes = require("./routes/kelas")
const guruRoutes = require("./routes/guru")



const app = express()
app.use(cors())
app.use(express.json())

app.use("/api/pengembalian", pengembalianRoutes)
app.use("/api/buku", bukuRoutes)  
app.use("/api/siswa", siswaRoutes)  
app.use("/api/guru", guruRoutes)                   
app.use("/api", kelasRoutes)


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

    // Cek dulu apakah siswa dengan nama & kelas ini sudah terdaftar
    const anggotaLama = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(and(ilike(anggota.nama, nama), eq(anggota.kelas, kelas)))
      .limit(1)

    let anggotaId
    if (anggotaLama.length > 0) {
      anggotaId = anggotaLama[0].id
    } else {
      const anggotaBaru = await db
        .insert(anggota)
        .values({ nama, kelas, peran: "siswa" })
        .returning({ id: anggota.id })
      anggotaId = anggotaBaru[0].id
    }

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

// PATCH tandai peminjaman sebagai dikembalikan
app.patch("/api/peminjaman/:id/kembalikan", async (req, res) => {
  try {
    const { id } = req.params

    const rows = await db
      .select()
      .from(peminjaman)
      .where(eq(peminjaman.id, Number(id)))

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" })
    }

    const pinjam = rows[0]

    if (pinjam.tanggalDikembalikan) {
      return res.status(400).json({ message: "Buku ini sudah dikembalikan" })
    }

    const hariIni = new Date()
    const batas = new Date(pinjam.tanggalKembali)
    hariIni.setHours(0, 0, 0, 0)
    batas.setHours(0, 0, 0, 0)

    const selisihHari = Math.round((hariIni - batas) / (1000 * 60 * 60 * 24))
    const hariTerlambat = Math.max(0, selisihHari)
    const denda = hariTerlambat * 5000

    const updated = await db
      .update(peminjaman)
      .set({
        tanggalDikembalikan: hariIni.toISOString().split("T")[0],
        denda,
      })
      .where(eq(peminjaman.id, Number(id)))
      .returning()

    await db
      .update(eksemplarBuku)
      .set({ status: "tersedia" })
      .where(eq(eksemplarBuku.id, pinjam.eksemplarId))

    res.json(updated[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal memproses pengembalian" })
  }
})

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]

    const totalBuku = await db.select({ count: sql`count(*)` }).from(buku)
    const totalAnggota = await db.select({ count: sql`count(*)` }).from(anggota)

    const totalDipinjam = await db
      .select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalDikembalikan)) // fix: cek tanggalDikembalikan, bukan tanggalKembali

    const totalTerlambat = await db
      .select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(and(
        isNull(peminjaman.tanggalDikembalikan),
        lt(peminjaman.tanggalKembali, today)
      ))

    res.json({
      totalBuku: totalBuku[0].count,
      totalAnggota: totalAnggota[0].count,
      bukuDipinjam: totalDipinjam[0].count,
      terlambat: totalTerlambat[0].count,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil statistik" })
  }
})

// GET 5 peminjaman terbaru
app.get("/api/dashboard/peminjaman-terbaru", async (req, res) => {
  try {
    const { hari } = req.query
    let data

    if (hari) {
      const batasAwal = new Date()
      batasAwal.setDate(batasAwal.getDate() - Number(hari))
      batasAwal.setHours(0, 0, 0, 0)

      data = await db
        .select()
        .from(peminjaman)
        .where(gte(peminjaman.tanggalPinjam, batasAwal.toISOString().split("T")[0]))
        .orderBy(desc(peminjaman.id))
    } else {
      data = await db
        .select()
        .from(peminjaman)
        .orderBy(desc(peminjaman.id))
        .limit(5)
    }

    const today = new Date().toISOString().split("T")[0]

    const dataWithStatus = data.map((row) => {
      const sudahDikembalikan = !!row.tanggalDikembalikan
      let status
      if (sudahDikembalikan) {
        status = row.tanggalDikembalikan > row.tanggalKembali ? "Terlambat" : "Dikembalikan"
      } else if (row.tanggalKembali < today) {
        status = "Terlambat"
      } else {
        status = "Dipinjam"
      }
      return { ...row, status, sudahDikembalikan }
    })

    res.json(dataWithStatus)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data" })
  }
})

// GET semua peminjaman yang belum dikembalikan
// GET semua peminjaman yang belum dikembalikan
app.get("/api/dashboard/peminjaman-belum-kembali", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: peminjaman.id,
        nama: peminjaman.nama,
        kelas: peminjaman.kelas,
        tanggalPinjam: peminjaman.tanggalPinjam,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
        denda: peminjaman.denda,
        judulBuku: buku.judul,
      })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(isNull(peminjaman.tanggalDikembalikan))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const data = rows.map((row) => {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const selisihHari = Math.round((batas - today) / (1000 * 60 * 60 * 24))

      let status
      let denda = 0
      let sisaHari

      if (selisihHari < 0) {
        status = "Terlambat"
        denda = Math.abs(selisihHari) * 5000
        sisaHari = `Telat ${Math.abs(selisihHari)} hari`
      } else if (selisihHari === 0) {
        status = "Dipinjam"
        sisaHari = "Jatuh tempo hari ini"
      } else {
        status = "Dipinjam"
        sisaHari = `${selisihHari} hari`
      }

      return {
        ...row,
        status,
        denda,
        sisaHari,
      }
    })

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data" })
  }
})

// GET buku terpopuler (paling sering dipinjam)
app.get("/api/dashboard/buku-terpopuler", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      select b.judul as judul, count(p.id) as dipinjam
      from peminjaman p
      join eksemplar_buku e on e.id = p.eksemplar_id
      join buku b on b.id = e.buku_id
      group by b.id, b.judul
      order by dipinjam desc
      limit 5
    `)

    const data = rows.rows.map((r) => ({
      judul: r.judul,
      dipinjam: Number(r.dipinjam),
    }))

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil buku terpopuler" })
  }
})

// GET pengingat - buku yang belum dikembalikan
app.get("/api/dashboard/pengingat", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalDikembalikan))
      .orderBy(peminjaman.tanggalKembali)
      .limit(5)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const data = rows.map((row) => {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const selisihHari = Math.round((batas - today) / (1000 * 60 * 60 * 24))

      let badge
      let color
      let denda = 0

      if (selisihHari < 0) {
        const hariTelat = Math.abs(selisihHari)
        denda = hariTelat * 5000
        badge = `Telat ${hariTelat} hari`
        color = "red"
      } else if (selisihHari === 0) {
        badge = "Jatuh tempo hari ini"
        color = "orange"
      } else {
        badge = `${selisihHari} hari lagi`
        color = "blue"
      }

      return {
        id: row.id,
        nama: row.nama,
        kelas: row.kelas,
        badge,
        color,
        denda,
      }
    })

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil pengingat" })
  }
})

// GET daftar semua buku beserta jumlah stok & tersedia
app.get("/api/buku", async (req, res) => {
  try {
    const { search } = req.query

    let query = sql`
      select
        b.id,
        b.judul,
        b.penulis,
        b.isbn,
        count(e.id) as stok,
        count(e.id) filter (where e.status = 'tersedia') as tersedia
      from buku b
      left join eksemplar_buku e on e.buku_id = b.id
    `

    if (search) {
      query = sql`${query} where b.judul ilike ${'%' + search + '%'} or b.isbn ilike ${'%' + search + '%'} or b.penulis ilike ${'%' + search + '%'}`
    }

    query = sql`${query} group by b.id order by b.judul`

    const result = await db.execute(query)

    const data = result.rows.map((row) => {
      const stok = Number(row.stok)
      const tersedia = Number(row.tersedia)
      let status
      if (tersedia === 0) status = "Habis"
      else if (tersedia <= stok * 0.3) status = "Stok Menipis"
      else status = "Tersedia"

      return {
        id: row.id,
        judul: row.judul,
        penulis: row.penulis,
        isbn: row.isbn,
        stok,
        tersedia,
        status,
      }
    })

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil data buku" })
  }
})

// GET pencarian gabungan (buku, siswa, guru, ISBN)
app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim()
    if (!q) {
      return res.json({ buku: [], siswa: [], guru: [] })
    }

    const bukuRows = await db.execute(sql`
      select id, judul, penulis, isbn
      from buku
      where judul ilike ${'%' + q + '%'} or isbn ilike ${'%' + q + '%'}
      limit 5
    `)

    const siswaRows = await db.execute(sql`
      select id, nama, kelas
      from anggota
      where nama ilike ${'%' + q + '%'} and kelas is not null and kelas != ''
      limit 5
    `)

    const guruRows = await db.execute(sql`
      select id, nama, kelas
      from anggota
      where nama ilike ${'%' + q + '%'} and (kelas is null or kelas = '')
      limit 5
    `)

    res.json({
      buku: bukuRows.rows,
      siswa: siswaRows.rows,
      guru: guruRows.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal melakukan pencarian" })
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
      select date_trunc(${groupBy}, tanggal_dikembalikan) as periode, count(*) as jumlah
      from peminjaman
      where tanggal_dikembalikan >= ${start.toISOString()} and tanggal_dikembalikan <= now()
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