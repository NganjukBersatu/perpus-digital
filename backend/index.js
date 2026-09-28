require("dotenv").config()

// Semua perhitungan tanggal (new Date(), setHours, dsb.) mengikuti WIB,
// apa pun zona waktu server. Bisa ditimpa lewat .env (TZ=...).
process.env.TZ = process.env.TZ || "Asia/Jakarta"

const express = require("express")
const cors = require("cors")
const { sql, desc, isNull, gte, and, eq, lt, ilike, inArray } = require("drizzle-orm")

const { db, closeDb } = require("./db/client")
const { buku, eksemplarBuku, anggota, peminjaman } = require("./db/schema")
const { ambilPengaturanDenda, hitungDenda, ambilPengaturanNotifikasi, ambilPengaturanPeminjaman } = require("./utils/hitungDenda")
const { sinkronkanStokBuku } = require("./routes/buku")
const { tanggalHariIniLokal } = require("./utils/tanggal")
const { normalisasiTanggal, escapeLike } = require("./utils/validasi")
const { ErrorBisnis } = require("./utils/errorBisnis")
const { prosesPengembalian } = require("./utils/pengembalian")

const { router: authRoutes, wajibLoginGuru, wajibAdmin } = require("./routes/auth")
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
const bukuIsbnRoutes = require("./routes/bukuIsbn")
const { router: authSiswaRoutes, wajibLoginSiswa } = require("./routes/authSiswa")
const dashboardSiswaRoutes = require("./routes/dashboardSiswa")
const { pasangRouteNotifikasiSiswa } = require("./routes/notifikasiSiswa")
const { pasangRouteNotifikasiGuru } = require("./routes/notifikasiGuru")


const app = express()

// Aktifkan hanya kalau backend berada di belakang reverse proxy (nginx, Cloudflare, dll).
// Contoh di .env: TRUST_PROXY=1 (percaya 1 lapis proxy).
// Tanpa ini, rate limiter melihat IP proxy, bukan IP pengguna yang sebenarnya.
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY
  app.set("trust proxy", /^\d+$/.test(v) ? Number(v) : v)
}

// Di production isi CORS_ORIGIN di .env, mis. CORS_ORIGIN=https://perpus.sekolah.sch.id
// (boleh lebih dari satu, pisahkan dengan koma). Kalau kosong, semua origin diizinkan.
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : true,
}))
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/auth/siswa", authSiswaRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/pengaturan", pengaturanRoutes)
app.use("/api/pengembalian", wajibAdmin, pengembalianRoutes)

// Route notifikasi didaftarkan SEBELUM router /api/siswa dan /api/guru, supaya
// path spesifiknya (/notifikasi) tidak tertangkap route lain di router tersebut
// (mis. GET /:id) atau middleware admin di dalamnya.
pasangRouteNotifikasiSiswa(app, wajibLoginSiswa)
pasangRouteNotifikasiGuru(app, wajibLoginGuru)

// Cek: kalau routes/buku.js punya route GET '/:id', route /kategori di bawah
// tidak akan pernah terpanggil. Lihat catatan di dekat app.get("/api/buku/kategori").
app.use("/api/buku", bukuRoutes)
app.use("/api/buku", bukuIsbnRoutes)
app.use("/api/siswa", siswaRoutes)
app.use("/api/guru", guruRoutes)
app.use("/api", kelasRoutes)
app.use("/api/data-peminjaman", dataPeminjamanRoutes)
app.use("/api/denda", dendaRoutes)
app.use("/api/kategori", kategoriRoutes)
app.use("/api/riwayat", riwayatRoutes)
app.use("/api/laporan", laporanRoutes)
app.use("/api/dashboard-siswa", dashboardSiswaRoutes)
// app.use('/api/katalog-siswa', require('./routes/katalogSiswa'))

// route admin di index.js: wajib login sebagai admin
app.use("/api/peminjaman", wajibAdmin)
app.use("/api/dashboard", wajibAdmin)
app.use("/api/eksemplar-buku", wajibAdmin)
app.use("/api/search", wajibAdmin)

// GET data buku berdasarkan barcode
// Pencarian memakai awalan (prefix): scan "978123" akan cocok dengan "978123-01",
// "978123-02", dst. Kalau ada barcode yang persis sama, itu yang diprioritaskan.
app.get("/api/eksemplar-buku/:barcode", async (req, res) => {
  try {
    const barcode = String(req.params.barcode || "").trim()
    if (!barcode) {
      return res.status(400).json({ message: "Barcode wajib diisi" })
    }

    const cocok = await db
      .select({
        eksemplarId: eksemplarBuku.id,
        bukuId: eksemplarBuku.bukuId,
        barcode: eksemplarBuku.barcode,
        status: eksemplarBuku.status,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
      })
      .from(eksemplarBuku)
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(ilike(eksemplarBuku.barcode, `${escapeLike(barcode)}%`))
      .orderBy(eksemplarBuku.id)

    if (cocok.length === 0) {
      return res.status(404).json({ message: "Buku tidak ditemukan" })
    }

    const persis = cocok.find((r) => String(r.barcode).toLowerCase() === barcode.toLowerCase())
    const bukuId = (persis || cocok[0]).bukuId

    // hanya pertimbangkan eksemplar dari buku yang sama
    const kandidat = cocok.filter((r) => r.bukuId === bukuId)
    const dipilih =
      (persis && persis.status === "tersedia" ? persis : null) ||
      kandidat.find((r) => r.status === "tersedia") ||
      persis ||
      kandidat[0]

    const semuaEksemplar = await db
      .select({
        id: eksemplarBuku.id,
        barcode: eksemplarBuku.barcode,
        status: eksemplarBuku.status,
      })
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, bukuId))
      .orderBy(eksemplarBuku.id)

    res.json({
      eksemplarId: dipilih.eksemplarId,
      bukuId,
      status: dipilih.status,
      judul: dipilih.judul,
      penulis: dipilih.penulis,
      penerbit: dipilih.penerbit,
      eksemplarList: semuaEksemplar,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Terjadi kesalahan" })
  }
})

// POST simpan peminjaman baru
app.post("/api/peminjaman", async (req, res) => {
  try {
    const { eksemplarId, nama, kelas, tanggalPinjam, tanggalKembali, tipePeminjam, anggotaId } = req.body || {}

    // ---------- validasi input ----------
    const idEksemplar = Number(eksemplarId)
    if (!Number.isInteger(idEksemplar)) {
      return res.status(400).json({ message: "eksemplarId tidak valid" })
    }
    const tglPinjam = normalisasiTanggal(tanggalPinjam)
    if (!tglPinjam) {
      return res.status(400).json({ message: "Tanggal pinjam tidak valid (format YYYY-MM-DD)" })
    }

    const peranPeminjam = tipePeminjam === "guru" ? "guru" : "siswa"
    const namaBersih = String(nama || "").trim()
    const kelasBersih = String(kelas || "").trim()

    if (peranPeminjam === "guru") {
      if (!Number.isInteger(Number(anggotaId))) {
        return res.status(400).json({ message: "Guru wajib dipilih dari daftar" })
      }
    } else if (!namaBersih || !kelasBersih) {
      return res.status(400).json({ message: "Nama dan kelas wajib diisi" })
    }

    const pengaturanPinjam = await ambilPengaturanPeminjaman(db)
    const pengaturanDenda = await ambilPengaturanDenda(db)

    // ---------- tanggal kembali (UTC supaya tidak geser hari) ----------
    let tanggalKembaliFinal
    if (tanggalKembali && String(tanggalKembali).trim()) {
      tanggalKembaliFinal = normalisasiTanggal(tanggalKembali)
      if (!tanggalKembaliFinal) {
        return res.status(400).json({ message: "Tanggal kembali tidak valid (format YYYY-MM-DD)" })
      }
      if (tanggalKembaliFinal < tglPinjam) {
        return res.status(400).json({ message: "Tanggal kembali tidak boleh sebelum tanggal pinjam" })
      }
    } else {
      const durasi = peranPeminjam === "guru" ? pengaturanPinjam.durasiGuru : pengaturanPinjam.durasiSiswa
      const d = new Date(tglPinjam + "T00:00:00Z")
      d.setUTCDate(d.getUTCDate() + Number(durasi))
      tanggalKembaliFinal = d.toISOString().slice(0, 10)
    }

    // ---------- semua perubahan data dalam SATU transaksi ----------
    const hasil = await db.transaction(async (tx) => {
      // 1) klaim eksemplar secara atomik: hanya berhasil kalau masih 'tersedia'
      const [ek] = await tx
        .update(eksemplarBuku)
        .set({ status: "dipinjam" })
        .where(and(eq(eksemplarBuku.id, idEksemplar), eq(eksemplarBuku.status, "tersedia")))
        .returning({ bukuId: eksemplarBuku.bukuId })
      if (!ek) throw new ErrorBisnis(409, "Eksemplar tidak ditemukan atau sedang tidak tersedia")

      // 2) stok minimal (dihitung setelah eksemplar ini diklaim, jadi +1)
      const [{ stokTersedia }] = await tx
        .select({ stokTersedia: sql`count(*)`.mapWith(Number) })
        .from(eksemplarBuku)
        .where(and(eq(eksemplarBuku.bukuId, ek.bukuId), eq(eksemplarBuku.status, "tersedia")))
      const stokSebelum = stokTersedia + 1
      if (stokSebelum <= pengaturanPinjam.minStokPinjam) {
        throw new ErrorBisnis(
          400,
          `Stok tersedia (${stokSebelum}) sudah mencapai batas minimal (${pengaturanPinjam.minStokPinjam}), tidak bisa dipinjamkan`
        )
      }

      // 3) tentukan peminjam
      let idPeminjam, namaFinal, kelasFinal, semuaId
      if (peranPeminjam === "guru") {
        const [g] = await tx
          .select({ id: anggota.id, nama: anggota.nama, kelas: anggota.kelas })
          .from(anggota)
          .where(and(eq(anggota.id, Number(anggotaId)), eq(anggota.peran, "guru")))
        if (!g) throw new ErrorBisnis(400, "Guru tidak ditemukan")
        idPeminjam = g.id
        namaFinal = g.nama
        kelasFinal = g.kelas
        semuaId = [g.id]
      } else {
        const lama = await tx
          .select({ id: anggota.id })
          .from(anggota)
          .where(
            and(
              sql`lower(btrim(${anggota.nama})) = lower(${namaBersih})`,
              eq(anggota.kelas, kelasBersih),
              eq(anggota.peran, "siswa")
            )
          )
        if (lama.length > 0) {
          idPeminjam = lama[0].id
          semuaId = lama.map((a) => a.id)
        } else {
          const [baru] = await tx
            .insert(anggota)
            .values({ nama: namaBersih, kelas: kelasBersih, peran: "siswa" })
            .returning({ id: anggota.id })
          idPeminjam = baru.id
          semuaId = [baru.id]
        }
        namaFinal = namaBersih
        kelasFinal = kelasBersih
      }

      // 4) batas jumlah pinjam
      const [{ jumlahAktif }] = await tx
        .select({ jumlahAktif: sql`count(*)`.mapWith(Number) })
        .from(peminjaman)
        .where(and(inArray(peminjaman.anggotaId, semuaId), isNull(peminjaman.tanggalDikembalikan)))
      const maxBuku = peranPeminjam === "guru" ? pengaturanPinjam.maxBukuGuru : pengaturanPinjam.maxBukuSiswa
      if (jumlahAktif >= maxBuku) {
        throw new ErrorBisnis(400, `Batas pinjam tercapai (maks ${maxBuku} buku)`)
      }

      // 5) simpan peminjaman
      await tx.insert(peminjaman).values({
        nama: namaFinal,
        kelas: kelasFinal,
        eksemplarId: idEksemplar,
        anggotaId: idPeminjam,
        tanggalPinjam: tglPinjam,
        tanggalKembali: tanggalKembaliFinal,
        nominalDendaPerHari: pengaturanDenda.aktif
          ? (peranPeminjam === "guru" ? pengaturanDenda.nominalPerHariGuru : pengaturanDenda.nominalPerHariSiswa)
          : 0,
        dendaMaksimal: pengaturanDenda.aktif
          ? (peranPeminjam === "guru" ? pengaturanDenda.dendaMaksimalGuru : pengaturanDenda.dendaMaksimalSiswa)
          : 0,
        dendaGuruAktif: pengaturanDenda.dendaGuruAktif ?? false,
        masaTenggang: pengaturanDenda.masaTenggang ?? 0,
      })

      return { bukuId: ek.bukuId }
    })

    await sinkronkanStokBuku(hasil.bukuId)
    res.status(201).json({ message: "Peminjaman berhasil disimpan" })
  } catch (err) {
    if (err instanceof ErrorBisnis) return res.status(err.status).json({ message: err.message })
    console.error(err)
    res.status(500).json({ message: "Gagal menyimpan peminjaman" })
  }
})

// PATCH tandai peminjaman sebagai dikembalikan
app.patch("/api/peminjaman/:id/kembalikan", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" })

    const { updated, bukuId } = await prosesPengembalian(id)
    if (bukuId) await sinkronkanStokBuku(bukuId)

    res.json(updated)
  } catch (err) {
    if (err instanceof ErrorBisnis) return res.status(err.status).json({ message: err.message })
    console.error(err)
    res.status(500).json({ message: "Gagal memproses pengembalian" })
  }
})

app.patch("/api/peminjaman/:id/perpanjang", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" })

    const pengaturanPinjam = await ambilPengaturanPeminjaman(db)

    if (!pengaturanPinjam.bolehPerpanjang) {
      return res.status(400).json({ message: "Perpanjangan peminjaman tidak diizinkan" })
    }

    const [pinjam] = await db.select().from(peminjaman).where(eq(peminjaman.id, id))
    if (!pinjam) return res.status(404).json({ message: "Data peminjaman tidak ditemukan" })
    if (pinjam.tanggalDikembalikan) {
      return res.status(400).json({ message: "Buku ini sudah dikembalikan, tidak bisa diperpanjang" })
    }
    if ((pinjam.jumlahPerpanjangan || 0) >= pengaturanPinjam.maxPerpanjang) {
      return res.status(400).json({ message: `Sudah mencapai batas maksimal ${pengaturanPinjam.maxPerpanjang}x perpanjangan` })
    }

    const tglLama = normalisasiTanggal(pinjam.tanggalKembali)
    if (!tglLama) {
      throw new Error(`tanggalKembali tidak valid untuk peminjaman ${id}`)
    }

    // Perpanjangan setelah jatuh tempo akan memundurkan tanggal kembali dan otomatis
    // mengecilkan/menghapus denda. Hapus blok if ini kalau kebijakan sekolah
    // memang mengizinkan perpanjangan untuk buku yang sudah telat.
    if (tglLama < tanggalHariIniLokal()) {
      return res.status(400).json({
        message: "Peminjaman sudah melewati jatuh tempo, tidak bisa diperpanjang. Proses pengembaliannya dulu.",
      })
    }

    const tglBaru = new Date(tglLama + "T00:00:00Z")
    tglBaru.setUTCDate(tglBaru.getUTCDate() + Number(pengaturanPinjam.durasiPerpanjang))

    const [updated] = await db.update(peminjaman)
      .set({
        tanggalKembali: tglBaru.toISOString().slice(0, 10),
        jumlahPerpanjangan: (pinjam.jumlahPerpanjangan || 0) + 1,
      })
      .where(and(eq(peminjaman.id, id), isNull(peminjaman.tanggalDikembalikan)))
      .returning()

    if (!updated) {
      return res.status(400).json({ message: "Buku ini sudah dikembalikan, tidak bisa diperpanjang" })
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal memperpanjang peminjaman" })
  }
})

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const today = tanggalHariIniLokal()

    const totalBuku = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(buku)
    const totalAnggota = await db
      .select({
        count: sql`count(distinct lower(btrim(${anggota.nama})))`.mapWith(Number)
      })
      .from(anggota)
      .where(sql`${anggota.peran} in ('siswa', 'guru')`)

    const totalDipinjam = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(peminjaman)
      .where(isNull(peminjaman.tanggalDikembalikan))

    const totalTerlambat = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
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

    if (hari && Number.isFinite(Number(hari))) {
      const batasAwal = new Date()
      batasAwal.setDate(batasAwal.getDate() - Number(hari))
      batasAwal.setHours(0, 0, 0, 0)

      data = await db
        .select()
        .from(peminjaman)
        .where(gte(peminjaman.tanggalPinjam, formatTanggalISO(batasAwal)))
        .orderBy(desc(peminjaman.id))
    } else {
      data = await db
        .select()
        .from(peminjaman)
        .orderBy(desc(peminjaman.id))
        .limit(5)
    }

    const today = tanggalHariIniLokal()

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
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
        dendaGuruAktif: peminjaman.dendaGuruAktif,
        masaTenggang: peminjaman.masaTenggang,
        peran: anggota.peran,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(anggota.id, peminjaman.anggotaId))
      .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(isNull(peminjaman.tanggalDikembalikan))

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const hariIniStr = tanggalHariIniLokal()

    const data = rows.map((row) => {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const selisihHari = Math.round((batas - today) / (1000 * 60 * 60 * 24))

      let status
      let denda = 0
      let sisaHari

      if (selisihHari < 0) {
        status = "Terlambat"

        const hariTelat = Math.abs(selisihHari)
        const masaTenggang = row.masaTenggang || 0
        const hariKenaDenda = Math.max(0, hariTelat - masaTenggang)

        // pakai hitungDenda supaya sama persis dengan yang dikenakan saat pengembalian
        // (termasuk aturan denda guru)
        denda = hitungDenda({
          tanggalKembali: row.tanggalKembali,
          tanggalDikembalikan: hariIniStr,
          peran: row.peran,
          pengaturanDenda: {
            aktif: (row.nominalDendaPerHari || 0) > 0,
            nominalPerHari: row.nominalDendaPerHari || 0,
            dendaMaksimal: row.dendaMaksimal || 0,
            dendaGuruAktif: row.dendaGuruAktif ?? false,
            masaTenggang: row.masaTenggang ?? 0,
          },
        }).denda

        sisaHari = hariKenaDenda > 0
          ? `Telat ${hariTelat} hari`
          : `Masih masa tenggang (${hariTelat}/${masaTenggang} hari)`
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
// CATATAN: router bukuRoutes sudah didaftarkan di atas. Jalankan
//   grep -n "router.get" routes/buku.js routes/bukuIsbn.js
// Kalau ada router.get('/:id') atau router.get('/'), pindahkan handler ini ke
// SEBELUM app.use("/api/buku", bukuRoutes), atau ke dalam routes/buku.js,
// kalau tidak handler ini tidak akan pernah terpanggil.
app.get("/api/buku/kategori", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      select nama
      from kategori
      where nama is not null and nama <> ''
      order by nama
    `)
    res.json(rows.rows.map((r) => r.nama))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil kategori buku" })
  }
})

// GET buku terpopuler lengkap (dengan filter rentang waktu, kategori, dan pencarian judul)
app.get("/api/dashboard/buku-terpopuler-lengkap", async (req, res) => {
  try {
    const { range = "semua", kategori } = req.query
    const search = String(req.query.search ?? "").trim()

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

    let query = sql`
      select b.judul as judul, k.nama as kategori, count(p.id) as dipinjam
      from peminjaman p
      join eksemplar_buku e on e.id = p.eksemplar_id
      join buku b on b.id = e.buku_id
      left join kategori k on k.id = b.kategori_id
      where 1=1
    `

    if (startDate) {
      query = sql`${query} and p.tanggal_pinjam >= ${formatTanggalISO(startDate)}`
    }
    if (kategori && kategori !== "Semua Kategori") {
      query = sql`${query} and k.nama = ${String(kategori)}`
    }
    if (search) {
      query = sql`${query} and b.judul ilike ${"%" + escapeLike(search) + "%"}`
    }

    query = sql`${query} group by b.id, b.judul, k.nama order by dipinjam desc`

    const rows = await db.execute(query)

    const data = rows.rows.map((r) => ({
      judul: r.judul,
      kategori: r.kategori || "-",
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

    const semuaBelumKembali = await db
      .select({
        id: peminjaman.id,
        nama: peminjaman.nama,
        kelas: peminjaman.kelas,
        tanggalKembali: peminjaman.tanggalKembali,
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
        dendaGuruAktif: peminjaman.dendaGuruAktif,
        masaTenggang: peminjaman.masaTenggang,
        peran: anggota.peran,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .where(isNull(peminjaman.tanggalDikembalikan))
      .orderBy(peminjaman.tanggalKembali)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const hariIniStr = tanggalHariIniLokal()

    const daftar = []

    for (const row of semuaBelumKembali) {
      const batas = new Date(row.tanggalKembali)
      batas.setHours(0, 0, 0, 0)
      const selisihHari = Math.round((batas - today) / 86400000)

      if (selisihHari < 0) {
        if (!pengaturanNotif.notifikasiTerlambat) continue

        const hariTelat = Math.abs(selisihHari)
        const masaTenggang = row.masaTenggang ?? 0
        const hariKenaDenda = Math.max(0, hariTelat - masaTenggang)

        // pakai snapshot denda milik peminjaman + hitungDenda, sama seperti saat pengembalian
        const { denda } = hitungDenda({
          tanggalKembali: row.tanggalKembali,
          tanggalDikembalikan: hariIniStr,
          peran: row.peran,
          pengaturanDenda: {
            aktif: (row.nominalDendaPerHari || 0) > 0,
            nominalPerHari: row.nominalDendaPerHari || 0,
            dendaMaksimal: row.dendaMaksimal || 0,
            dendaGuruAktif: row.dendaGuruAktif ?? false,
            masaTenggang: row.masaTenggang ?? 0,
          },
        })

        daftar.push({
          id: row.id,
          nama: row.nama,
          kelas: row.kelas,
          badge: hariKenaDenda > 0
            ? `Telat ${hariTelat} hari`
            : `Masih masa tenggang (${hariTelat}/${masaTenggang} hari)`,
          color: hariKenaDenda > 0 ? "red" : "orange",
          denda,
        })
      } else if (selisihHari <= (pengaturanNotif.hariSebelumJatuhTempo || 0)) {
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
    const search = String(req.query.search ?? "").trim()

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
      const pola = "%" + escapeLike(search) + "%"
      query = sql`${query} where b.judul ilike ${pola} or b.isbn ilike ${pola} or b.penulis ilike ${pola}`
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
    const q = String(req.query.q ?? "").trim()
    if (!q) {
      return res.json({ buku: [], siswa: [], guru: [] })
    }
    const pola = "%" + escapeLike(q) + "%"

    const bukuRows = await db.execute(sql`
      select id, judul, penulis, isbn
      from buku
      where judul ilike ${pola} or isbn ilike ${pola}
      limit 5
    `)

    const siswaRows = await db.execute(sql`
      select id, nama, kelas
      from anggota
      where nama ilike ${pola} and peran = 'siswa'
      limit 5
    `)

    const guruRows = await db.execute(sql`
      select id, nama, kelas
      from anggota
      where nama ilike ${pola} and peran = 'guru'
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

function formatTanggalISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatLabel(d, groupBy) {
  if (groupBy === "month") {
    return d.toLocaleDateString("id-ID", { month: "short" })
  }
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

function getRangeConfig(range) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  let groupBy = "day"

  if (range === "1minggu") {
    start.setDate(start.getDate() - 6)
  } else if (range === "1bulan") {
    start.setDate(start.getDate() - 29)
  } else if (range === "3bulan") {
    start.setDate(start.getDate() - 89)
  } else if (range === "1tahun") {
    // 12 bulan kalender, dimulai dari tanggal 1 (menghindari loncat bulan di tanggal 29-31)
    start.setDate(1)
    start.setMonth(start.getMonth() - 11)
    groupBy = "month"
  } else {
    start.setDate(start.getDate() - 181)
    groupBy = "week"
  }

  return { start, now, groupBy }
}

function buildBuckets(start, now, groupBy) {
  const buckets = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  if (groupBy === "month") cursor.setDate(1)

  while (cursor <= now) {
    buckets.push({
      key: formatTanggalISO(cursor),
      label: formatLabel(cursor, groupBy),
    })

    if (groupBy === "day") cursor.setDate(cursor.getDate() + 1)
    else if (groupBy === "week") cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1) // aman karena tanggal selalu 1
  }

  return buckets
}

app.get("/api/dashboard/statistik-peminjaman", async (req, res) => {
  try {
    const range = req.query.range || "6bulan"
    const { start, now, groupBy } = getRangeConfig(range)
    const buckets = buildBuckets(start, now, groupBy)
    const startStr = formatTanggalISO(start)
    const endStr = formatTanggalISO(now)

    const dipinjamRows = await db.execute(sql`
      select tanggal_pinjam::date as periode, count(*) as jumlah
      from peminjaman
      where tanggal_pinjam >= ${startStr}
        and tanggal_pinjam <= ${endStr}
      group by periode
      order by periode
    `)

    const dikembalikanRows = await db.execute(sql`
      select tanggal_dikembalikan::date as periode, count(*) as jumlah
      from peminjaman
      where tanggal_dikembalikan >= ${startStr}
        and tanggal_dikembalikan <= ${endStr}
      group by periode
      order by periode
    `)

    function tanggalDariPeriode(raw) {
      if (typeof raw === "string") {
        return new Date(String(raw).slice(0, 10) + "T00:00:00")
      }
      const d = new Date(raw)
      d.setHours(0, 0, 0, 0)
      return d
    }

    function mapToBuckets(rows) {
      const values = buckets.map(() => 0)
      const bucketDates = buckets.map((b) => new Date(b.key + "T00:00:00"))

      for (const row of rows.rows) {
        const d = tanggalDariPeriode(row.periode)
        if (Number.isNaN(d.getTime())) continue

        let idx = -1
        for (let i = 0; i < bucketDates.length; i++) {
          if (bucketDates[i] <= d) idx = i
          else break
        }
        if (idx >= 0) {
          values[idx] += Number(row.jumlah)
        }
      }

      return values
    }

    const dipinjam = mapToBuckets(dipinjamRows)
    const dikembalikan = mapToBuckets(dikembalikanRows)

    res.json({
      labels: buckets.map((b) => b.label),
      dipinjam,
      dikembalikan,
      totalDipinjam: dipinjam.reduce((a, n) => a + n, 0),
      totalDikembalikan: dikembalikan.reduce((a, n) => a + n, 0),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal mengambil statistik peminjaman" })
  }
})

// Penangan error terakhir (harus setelah semua route): JSON yang rusak dari klien
// menghasilkan 400 yang rapi, bukan halaman error HTML.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Format JSON tidak valid" })
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Data terlalu besar" })
  }
  console.error(err)
  res.status(500).json({ message: "Terjadi kesalahan pada server" })
})

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => console.log(`Backend jalan di http://localhost:${PORT}`))

let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`Menerima ${signal}, mematikan server...`)

  const timer = setTimeout(() => process.exit(1), 10000)
  timer.unref()

  server.close(async () => {
    try {
      await closeDb()
      process.exit(0)
    } catch (err) {
      console.error("Gagal menutup database:", err)
      process.exit(1)
    }
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))