require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { sql, desc, isNull, gte, lte, and, eq, lt, ilike } = require("drizzle-orm")

const { db } = require("./db/client")
const { buku, eksemplarBuku, anggota, peminjaman } = require("./db/schema")
const { ambilPengaturanDenda, hitungDenda, ambilPengaturanNotifikasi } = require("./utils/hitungDenda")
const { tanggalHariIniLokal } = require("./utils/tanggal")

const { router: authRoutes } = require("./routes/auth")
const adminRoutes = require("./routes/admin")
const pengaturanRoutes = require("./routes/pengaturan")
const pengembalianRoutes = require("./routes/pengembalian")
const siswaRoutes = require("./routes/siswa")
const kelasRoutes = require("./routes/kelas")
const guruRoutes = require("./routes/guru")
const dataPeminjamanRoutes = require("./routes/dataPeminjaman")
const dendaRoutes = require("./routes/denda")
const kategoriRoutes = require("./routes/kategori")
const riwayatRoutes = require("./routes/riwayat")
const laporanRoutes = require("./routes/laporan")
const bukuRoutes = require("./routes/buku")
const { router: authSiswaRoutes, wajibLoginSiswa } = require("./routes/authSiswa")
const dashboardSiswaRoutes = require("./routes/dashboardSiswa")



const app = express()
app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/auth/siswa", authSiswaRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/pengaturan", pengaturanRoutes)
app.use("/api/pengembalian", pengembalianRoutes)
app.use("/api/buku", bukuRoutes)
app.use("/api/siswa", siswaRoutes)
app.use("/api/guru", guruRoutes)
app.use("/api", kelasRoutes)
app.use("/api/data-peminjaman", dataPeminjamanRoutes)
app.use("/api/denda", dendaRoutes)
app.use("/api/kategori", kategoriRoutes)
app.use("/api/riwayat", riwayatRoutes)
app.use("/api/laporan", laporanRoutes)
app.use('/api/dashboard-siswa', require('./routes/dashboardSiswa'))
// app.use('/api/katalog-siswa', require('./routes/katalogSiswa'))

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
    const {
      eksemplarId,
      nama,
      kelas,
      tanggalPinjam,
      tanggalKembali,
      tipePeminjam,
      anggotaId,
    } = req.body

    let anggotaIdFinal

    if (tipePeminjam === "guru") {
      // Guru dipilih langsung dari dropdown daftar guru yang sudah ada,
      // jadi anggotaId sudah pasti valid — tidak perlu cari/insert baru.
      if (!anggotaId) {
        return res.status(400).json({ message: "Guru wajib dipilih dari daftar" })
      }
      anggotaIdFinal = anggotaId
    } else {
      // Mode siswa: cari siswa lama berdasarkan nama, kalau belum ada baru dibuat
      const anggotaLama = await db
        .select({ id: anggota.id })
        .from(anggota)
        .where(
          and(
            ilike(anggota.nama, nama),
            eq(anggota.peran, "siswa")
          )
        )
        .limit(1)

      if (anggotaLama.length > 0) {
        anggotaIdFinal = anggotaLama[0].id
      } else {
        const anggotaBaru = await db
          .insert(anggota)
          .values({ nama, kelas, peran: "siswa" })
          .returning({ id: anggota.id })
        anggotaIdFinal = anggotaBaru[0].id
      }
    }

    // ============================================================
    // [DIUBAH] Ambil pengaturan denda SAAT INI, lalu simpan nilainya
    // ke kolom snapshot di baris peminjaman. Ini yang membuat nominal
    // denda "terkunci" pada saat peminjaman, sehingga kalau admin
    // mengubah nominal nanti, peminjaman lama tetap pakai nominal lama.
    // ============================================================
    const pengaturanDenda = await ambilPengaturanDenda(db)

    await db.insert(peminjaman).values({
      nama,
      kelas,
      eksemplarId,
      anggotaId: anggotaIdFinal,
      tanggalPinjam,
      tanggalKembali,

      nominalDendaPerHari: pengaturanDenda.aktif ? pengaturanDenda.nominalPerHari : 0,
      dendaMaksimal: pengaturanDenda.aktif ? pengaturanDenda.dendaMaksimal : 0,
      dendaGuruAktif: pengaturanDenda.dendaGuruAktif ?? false,
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

    // join ke anggota supaya tahu peran (siswa/guru) — dipakai untuk cek toggle "denda untuk guru"
    const rows = await db
      .select({
        id: peminjaman.id,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
        eksemplarId: peminjaman.eksemplarId,
        peran: anggota.peran,
        // [BARU] ambil snapshot yang tersimpan di baris peminjaman
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
        dendaGuruAktif: peminjaman.dendaGuruAktif,
        masaTenggang: peminjaman.masaTenggang,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .where(eq(peminjaman.id, Number(id)))

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan" })
    }

    const pinjam = rows[0]

    if (pinjam.tanggalDikembalikan) {
      return res.status(400).json({ message: "Buku ini sudah dikembalikan" })
    }

    const tanggalDikembalikan = tanggalHariIniLokal()

    // ============================================================
    // [DIUBAH] Sebelumnya ambil dari pengaturan saat ini (real-time).
    // Sekarang pakai snapshot yang tersimpan di baris peminjaman,
    // sehingga nominal yang dipakai = nominal saat buku dipinjam.
    // ============================================================
    const pengaturanDenda = {
      aktif: pinjam.nominalDendaPerHari > 0,
      nominalPerHari: pinjam.nominalDendaPerHari,
      dendaMaksimal: pinjam.dendaMaksimal,
      dendaGuruAktif: pinjam.dendaGuruAktif ?? false,  
      masaTenggang: pinjam.masaTenggang ?? 0,
    }

    const { denda } = hitungDenda({
      tanggalKembali: pinjam.tanggalKembali,
      tanggalDikembalikan,
      peran: pinjam.peran,
      pengaturanDenda,
    })

    const updated = await db
      .update(peminjaman)
      .set({ tanggalDikembalikan, denda })
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
        const totalAnggota = await db
      .select({
        count: sql`count(distinct lower(btrim(${anggota.nama})))`.mapWith(Number)
      })
      .from(anggota)
      .where(sql`${anggota.peran} in ('siswa', 'guru')`)

    const totalDipinjam = await db
      .select({ count: sql`count(*)` })
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalDikembalikan))

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
        // [BARU] ambil snapshot dari peminjaman
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
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
        // ============================================================
        // [DIUBAH] Sebelumnya hardcode Rp2.000 (`* 2000`).
        // Sekarang pakai nominalDendaPerHari dari baris peminjaman,
        // dan hormati dendaMaksimal.
        // ============================================================
        const tarif = row.nominalDendaPerHari || 0
        denda = Math.abs(selisihHari) * tarif
        if (row.dendaMaksimal > 0) {
          denda = Math.min(denda, row.dendaMaksimal)
        }
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

// GET daftar kategori buku yang ada (untuk dropdown filter)
app.get("/api/buku/kategori", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      select distinct kategori
      from buku
      where kategori is not null and kategori <> ''
      order by kategori
    `)
    res.json(rows.rows.map((r) => r.kategori))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil kategori buku" })
  }
})

// GET buku terpopuler lengkap (dengan filter rentang waktu, kategori, dan pencarian judul)
app.get("/api/dashboard/buku-terpopuler-lengkap", async (req, res) => {
  try {
    const { range = "semua", kategori, search } = req.query

    let startDate = null
    const now = new Date()
    if (range === "1minggu") {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7)
    } else if (range === "1bulan") {
      startDate = new Date(now); startDate.setMonth(now.getMonth() - 1)
    } else if (range === "3bulan") {
      startDate = new Date(now); startDate.setMonth(now.getMonth() - 3)
    } else if (range === "tahunini") {
      startDate = new Date(now.getFullYear(), 0, 1)
    }
    // range === "semua" -> startDate tetap null, artinya tanpa batas waktu

    let query = sql`
      select b.judul as judul, b.kategori as kategori, count(p.id) as dipinjam
      from peminjaman p
      join eksemplar_buku e on e.id = p.eksemplar_id
      join buku b on b.id = e.buku_id
      where 1=1
    `

    if (startDate) {
      query = sql`${query} and p.tanggal_pinjam >= ${startDate.toISOString().split("T")[0]}`
    }
    if (kategori && kategori !== "Semua Kategori") {
      query = sql`${query} and b.kategori = ${kategori}`
    }
    if (search) {
      query = sql`${query} and b.judul ilike ${'%' + search + '%'}`
    }

    query = sql`${query} group by b.id, b.judul, b.kategori order by dipinjam desc`

    const rows = await db.execute(query)

    const data = rows.rows.map((r) => ({
      judul: r.judul,
      kategori: r.kategori || '-',
      dipinjam: Number(r.dipinjam),
    }))

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil buku terpopuler lengkap" })
  }
})

// GET pengingat - buku yang belum dikembalikan
app.get("/api/dashboard/pengingat", async (req, res) => {
  try {
    const pengaturanNotif = await ambilPengaturanNotifikasi(db)
    const pengaturanDenda = await ambilPengaturanDenda(db)

    const semuaBelumKembali = await db
      .select()
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalDikembalikan))
      .orderBy(peminjaman.tanggalKembali)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const daftar = []

    for (const row of semuaBelumKembali) {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const selisihHari = Math.round((batas - today) / 86400000)

      if (selisihHari < 0) {
        // sudah lewat jatuh tempo -> ini "notifikasi buku terlambat"
        if (!pengaturanNotif.notifikasiTerlambat) continue

        const hariTelat = Math.abs(selisihHari)
        // ============================================================
        // [DIUBAH] Pakai snapshot dari baris peminjaman, bukan pengaturan
        // saat ini. Kalau snapshot kosong (data lama), fallback ke
        // pengaturan saat ini.
        // ============================================================
        const tarif = row.nominalDendaPerHari ?? pengaturanDenda.nominalPerHari ?? 0
        const maks = row.dendaMaksimal ?? pengaturanDenda.dendaMaksimal ?? 0
        let denda = pengaturanDenda.aktif ? hariTelat * tarif : 0
        if (maks > 0) denda = Math.min(denda, maks)

        daftar.push({
          id: row.id,
          nama: row.nama,
          kelas: row.kelas,
          badge: `Telat ${hariTelat} hari`,
          color: "red",
          denda,
        })
      } else if (selisihHari <= (pengaturanNotif.hariSebelumJatuhTempo || 0)) {
        // masih dalam rentang "mau jatuh tempo" -> ini "pengingat sebelum jatuh tempo"
        if (!pengaturanNotif.pengingatJatuhTempo) continue

        daftar.push({
          id: row.id,
          nama: row.nama,
          kelas: row.kelas,
          badge: selisihHari === 0 ? "Jatuh tempo hari ini" : `${selisihHari} hari lagi`,
          color: selisihHari === 0 ? "orange" : "blue",
          denda: 0,
        })
      }
      // di luar rentang hariSebelumJatuhTempo dan belum terlambat -> tidak relevan, dilewati
    }

    const jatuhTempoHariIni = semuaBelumKembali.filter((row) => {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const selisihHari = Math.round((batas - today) / 86400000)
      return selisihHari === 0
    }).length

    res.json({
      daftar: daftar.slice(0, 5),
      totalJatuhTempoHariIni: jatuhTempoHariIni,
      tampilkanJatuhTempoHariIni: pengaturanNotif.notifikasiJatuhTempoHariIni,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil pengingat" })
  }
})

// GET notifikasi lonceng - ringkasan buku terlambat & jatuh tempo hari ini
app.get("/api/dashboard/notifikasi", async (req, res) => {
  try {
    const pengaturanNotif = await ambilPengaturanNotifikasi(db)
    const today = tanggalHariIniLokal()
    const waktuSekarang = new Date().toISOString()

    let jumlahTerlambat = 0
    if (pengaturanNotif.notifikasiTerlambat) {
      const terlambatRows = await db
        .select({ count: sql`count(*)` })
        .from(peminjaman)
        .where(and(
          isNull(peminjaman.tanggalDikembalikan),
          sql`${peminjaman.tanggalKembali}::date < ${today}::date`
        ))
      jumlahTerlambat = Number(terlambatRows[0].count)
    }

    let jumlahJatuhTempo = 0
    if (pengaturanNotif.notifikasiJatuhTempoHariIni) {
      const jatuhTempoRows = await db
        .select({ count: sql`count(*)` })
        .from(peminjaman)
        .where(and(
          isNull(peminjaman.tanggalDikembalikan),
          sql`${peminjaman.tanggalKembali}::date = ${today}::date`
        ))
      jumlahJatuhTempo = Number(jatuhTempoRows[0].count)
    }

    res.json({
      terlambat: {
        aktif: pengaturanNotif.notifikasiTerlambat,
        jumlah: jumlahTerlambat,
        waktu: waktuSekarang,
      },
      jatuhTempoHariIni: {
        aktif: pengaturanNotif.notifikasiJatuhTempoHariIni,
        jumlah: jumlahJatuhTempo,
        waktu: waktuSekarang,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil notifikasi" })
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

    // fix: klasifikasi siswa/guru sekarang pakai kolom "peran",
    // bukan menebak dari kosong-tidaknya kolom "kelas"
    const siswaRows = await db.execute(sql`
      select id, nama, kelas
      from anggota
      where nama ilike ${'%' + q + '%'} and peran = 'siswa'
      limit 5
    `)

    const guruRows = await db.execute(sql`
      select id, nama, kelas
      from anggota
      where nama ilike ${'%' + q + '%'} and peran = 'guru'
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