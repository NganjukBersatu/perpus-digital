const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, kategori, eksemplarBuku, peminjaman, anggota } = require('../db/schema')
const { eq, ilike, and, sql, isNull } = require('drizzle-orm')
const { wajibLogin, wajibAdmin } = require('./auth')

// ============================================================
// HELPER
// ============================================================
// Hitung ulang stok & tersedia untuk 1 buku dari tabel eksemplar_buku,
// lalu simpan ke kolom cache di tabel buku.
//
// Dipanggil SETIAP kali jumlah eksemplar berubah (tambah buku baru
// dengan barcode, tambah eksemplar, edit buku, dsb) supaya nilai
// stok & tersedia di tabel buku TIDAK PERNAH "bohong".
// ============================================================
async function sinkronkanStokBuku(bukuId, runner = db) {
  const [hasil] = await runner
    .select({
      stok: sql`count(*)`.mapWith(Number),
      tersedia: sql`count(*) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
    })
    .from(eksemplarBuku)
    .where(eq(eksemplarBuku.bukuId, bukuId))

  const stok = hasil?.stok ?? 0
  const tersedia = hasil?.tersedia ?? 0

  // Status ikut dihitung ulang, sama seperti logika di GET /api/buku
  let status
  if (tersedia === 0) status = 'Habis'
  else if (tersedia <= stok * 0.3) status = 'Stok Menipis'
  else status = 'Tersedia'

  await runner
    .update(buku)
    .set({ stok, tersedia, status })
    .where(eq(buku.id, bukuId))
}

// ============================================================
// Bersihkan/validasi barcode dari input yang "aneh" — misalnya
// object JavaScript (event scan, dsb) yang tidak sengaja ke-stringify
// jadi teks seperti {"isTrusted":true,...} atau [object PointerEvent]
// ============================================================
function bersihkanBarcode(nilai) {
  const teks = String(nilai || '').trim()
  if (
    !teks ||
    teks.startsWith('{') ||
    teks.startsWith('[object') ||
    teks === 'undefined' ||
    teks === 'null'
  ) {
    return ''
  }
  return teks
}

async function buatBarcodeOtomatis(runner, bukuId, isbn, jumlah) {
  // Hitung jumlah eksemplar yang SUDAH ADA untuk buku ini.
  // Nomor urut baru akan melanjutkan dari situ, supaya tidak duplikat.
  const [{ jumlahSekarang }] = await runner
    .select({ jumlahSekarang: sql`count(*)`.mapWith(Number) })
    .from(eksemplarBuku)
    .where(eq(eksemplarBuku.bukuId, bukuId))

  // Prefix = ISBN kalau diisi, kalau tidak pakai BUKU<bukuId>
  const prefix = isbn && String(isbn).trim() ? String(isbn).trim() : `BUKU${bukuId}`

  return Array.from({ length: jumlah }, (_, i) => {
    const nomorUrut = jumlahSekarang + i + 1

    // Format: <prefix>-00<i>  →  contoh: 9786020633478-001
    const barcode = `${prefix}-${String(nomorUrut).padStart(3, '0')}`

    return { bukuId, barcode, status: 'tersedia' }
  })
}

// ============================================================
// GET semua buku
// ============================================================
// stok & tersedia dihitung LIVE dari tabel eksemplar_buku
// supaya tidak pernah "bohong" walaupun kolom cache di tabel
// buku belum sempat disinkronkan.
// ============================================================
router.get('/', wajibLogin, async (req, res) => {
  try {
    const { q, kategoriNama, status } = req.query
    const conditions = []
    if (q) conditions.push(ilike(buku.judul, `%${q}%`))
    if (status) conditions.push(eq(buku.status, status))

    const rows = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
        kategoriId: buku.kategoriId,
        isbn: buku.isbn,
        lokasi: buku.lokasi,
        status: buku.status,
        kategori: kategori.nama,
        stok: sql`count(${eksemplarBuku.id})`.mapWith(Number),
        tersedia: sql`count(${eksemplarBuku.id}) filter (where ${eksemplarBuku.status} = 'tersedia')`.mapWith(Number),
        barcode: sql`min(${eksemplarBuku.barcode})`,
      })
      .from(buku)
      .leftJoin(kategori, eq(kategori.id, buku.kategoriId))
      .leftJoin(eksemplarBuku, eq(eksemplarBuku.bukuId, buku.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(buku.id, kategori.nama)
      .orderBy(buku.id)

    const hasil = kategoriNama ? rows.filter((r) => r.kategori === kategoriNama) : rows
    res.json(hasil)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data buku' })
  }
})

// ============================================================
// GET detail 1 buku + daftar eksemplar (barcode/ISBN fisik)
// beserta siapa yang sedang meminjam tiap eksemplar (kalau ada)
// ============================================================
router.get('/:id/detail', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)

    const [bukuData] = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
        isbn: buku.isbn,
        lokasi: buku.lokasi,
        status: buku.status,
        kategori: kategori.nama,
      })
      .from(buku)
      .leftJoin(kategori, eq(kategori.id, buku.kategoriId))
      .where(eq(buku.id, id))

    if (!bukuData) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' })
    }

    // Join ke peminjaman yang MASIH AKTIF (tanggalDikembalikan masih null)
    // supaya tahu siapa peminjam untuk eksemplar yang statusnya 'dipinjam'
    const eksemplarList = await db
      .select({
        id: eksemplarBuku.id,
        barcode: eksemplarBuku.barcode,
        status: eksemplarBuku.status,
        namaPeminjam: anggota.nama,
        kelasPeminjam: anggota.kelas,
        tanggalPinjam: peminjaman.tanggalPinjam,
        batasKembali: peminjaman.tanggalKembali,
      })
      .from(eksemplarBuku)
      .leftJoin(
        peminjaman,
        and(eq(peminjaman.eksemplarId, eksemplarBuku.id), isNull(peminjaman.tanggalDikembalikan))
      )
      .leftJoin(anggota, eq(anggota.id, peminjaman.anggotaId))
      .where(eq(eksemplarBuku.bukuId, id))
      .orderBy(eksemplarBuku.id)

    res.json({ buku: bukuData, eksemplar: eksemplarList })
  } catch (err) {
    console.error('GET /api/buku/:id/detail error:', err)
    res.status(500).json({ error: 'Gagal mengambil detail buku' })
  }
})

// ============================================================
// POST tambah buku baru
// ============================================================
// Kalau body request menyertakan "barcode", setelah buku berhasil
// dibuat, sekalian insert 1 baris eksemplar dengan barcode tersebut.
// Kalau "barcode" tidak dikirim, hanya buku yang dibuat (tidak ada
// eksemplar).
// ============================================================
router.post('/', wajibAdmin, async (req, res) => {
  try {
    const { judul, penulis, kategoriId, isbn, lokasi, status, barcode, jumlahEksemplar } = req.body || {}

    const judulBersih = String(judul ?? '').trim()
    const penulisBersih = String(penulis ?? '').trim()
    if (!judulBersih || !penulisBersih) {
      return res.status(400).json({ error: 'Judul dan penulis wajib diisi' })
    }

    // Jumlah eksemplar: default 1, dibatasi 1-500 supaya tidak bisa dipakai membanjiri tabel
    const jumlahBaru = Math.min(Math.max(Math.floor(Number(jumlahEksemplar)) || 1, 1), 500)
    const barcodeBersih = bersihkanBarcode(barcode)

    const hasil = await db.transaction(async (tx) => {
      // CEK DUPLIKAT: judul & penulis sama persis (tanpa peduli besar/kecil huruf).
      // Pakai lower() = lower(), bukan ilike, karena ilike menganggap karakter % dan _
      // di dalam judul sebagai wildcard. Kalau sudah ada, JANGAN buat baris buku baru,
      // cukup tambah eksemplar ke buku yang sudah ada.
      const [bukuSama] = await tx
        .select()
        .from(buku)
        .where(
          and(
            sql`lower(${buku.judul}) = lower(${judulBersih})`,
            sql`lower(${buku.penulis}) = lower(${penulisBersih})`
          )
        )
        .limit(1)

      if (barcodeBersih) {
        const [bentrok] = await tx
          .select({ id: eksemplarBuku.id })
          .from(eksemplarBuku)
          .where(eq(eksemplarBuku.barcode, barcodeBersih))
        if (bentrok) {
          const err = new Error(`Barcode "${barcodeBersih}" sudah dipakai oleh eksemplar lain.`)
          err.statusCode = 400
          throw err
        }
      }

      let bukuId = bukuSama ? bukuSama.id : null
      if (!bukuId) {
        // Tidak ada duplikat -> insert buku baru
        const [baru] = await tx
          .insert(buku)
          .values({
            judul: judulBersih,
            penulis: penulisBersih,
            kategoriId: kategoriId || null,
            isbn,
            stok: 0,
            tersedia: 0,
            lokasi,
            status: status || 'Tersedia',
          })
          .returning()
        bukuId = baru.id
      }

      // Tambah eksemplar (baik ke buku baru maupun buku duplikat yang sudah ada)
      if (barcodeBersih) {
        await tx.insert(eksemplarBuku).values({
          bukuId,
          barcode: barcodeBersih,
          status: 'tersedia',
        })
      } else {
        // Tidak ada barcode fisik -> generate otomatis. buatBarcodeOtomatis()
        // menghitung eksemplar yang SUDAH ADA dulu, supaya nomor urutnya tidak
        // bentrok saat buku duplikat ditambahkan berkali-kali.
        const eksemplarBaru = await buatBarcodeOtomatis(tx, bukuId, isbn || bukuSama?.isbn, jumlahBaru)
        await tx.insert(eksemplarBuku).values(eksemplarBaru)
      }

      // Hitung ulang stok & tersedia DI DALAM transaksi yang sama
      await sinkronkanStokBuku(bukuId, tx)

      const [bukuFinal] = await tx.select().from(buku).where(eq(buku.id, bukuId))
      return { ...bukuFinal, duplikat: !!bukuSama }
    })

    res.status(201).json(hasil)
  } catch (err) {
    console.error('POST /api/buku error:', err)
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message })
    }
    const kode = err?.cause?.code || err?.code
    if (kode === '23505' || String(err?.message || '').includes('duplicate key')) {
      return res.status(400).json({
        error: 'Barcode sudah dipakai oleh eksemplar lain. Gunakan barcode berbeda atau kosongkan.',
      })
    }
    res.status(500).json({ error: 'Gagal menambah buku' })
  }
})

// ============================================================
// POST tambah eksemplar baru ke buku yang SUDAH ADA
// ============================================================
// Dipakai saat hasil scan tidak ketemu, tapi judul bukunya sebenarnya
// sudah terdaftar (kasus barcode bawaan penerbit yang sama untuk
// beberapa kopi fisik dari judul yang sama).
// ============================================================
router.post('/:id/eksemplar', wajibAdmin, async (req, res) => {
  try {
    const bukuId = Number(req.params.id)
    if (!Number.isInteger(bukuId)) {
      return res.status(400).json({ error: 'ID buku tidak valid' })
    }

    const barcodeBersih = bersihkanBarcode(req.body?.barcode)
    if (!barcodeBersih) {
      return res.status(400).json({ error: 'Barcode tidak valid atau kosong' })
    }

    const [bukuAda] = await db.select().from(buku).where(eq(buku.id, bukuId))
    if (!bukuAda) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' })
    }

    // Cek apakah barcode sudah dipakai eksemplar lain
    const [existing] = await db
      .select({ id: eksemplarBuku.id })
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.barcode, barcodeBersih))

    let barcodeFinal = barcodeBersih

    if (existing) {
      // Barcode sudah ada (biasanya barcode bawaan penerbit yang sama
      // untuk beberapa kopi). Tambahkan suffix nomor urut untuk buku ini.
      const [hitung] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(eksemplarBuku)
        .where(eq(eksemplarBuku.bukuId, bukuId))

      const nomorBerikut = (hitung?.count || 0) + 1
      barcodeFinal = `${barcodeBersih}-${String(nomorBerikut).padStart(3, '0')}`
    }

    const [eksemplar] = await db
      .insert(eksemplarBuku)
      .values({ bukuId, barcode: barcodeFinal, status: 'tersedia' })
      .returning()

    // Sinkronkan stok & tersedia setelah eksemplar baru tersimpan
    await sinkronkanStokBuku(bukuId)

    res.status(201).json(eksemplar)
  } catch (err) {
    console.error(err)
    if ((err?.cause?.code || err?.code) === '23505') {
      return res.status(409).json({ error: 'Barcode sudah dipakai eksemplar lain' })
    }
    res.status(500).json({ error: 'Gagal menambah eksemplar' })
  }
})

// GET data buku untuk mulai peminjaman lewat pencarian JUDUL manual
// (dipakai di tab "Manual" ScanBukuPage.vue, setelah admin pilih
// salah satu hasil pencarian judul).
router.get('/:id/untuk-pinjam', wajibAdmin, async (req, res) => {
  try {
    const bukuId = Number(req.params.id)

    const [bukuData] = await db.select().from(buku).where(eq(buku.id, bukuId))
    if (!bukuData) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }

    const eksemplarRows = await db
      .select()
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, bukuId))
      .orderBy(eksemplarBuku.id)

    if (eksemplarRows.length === 0) {
      return res.status(404).json({ message: 'Buku ditemukan tapi belum ada eksemplar' })
    }

    const eksemplarTerpilih =
      eksemplarRows.find((ek) => ek.status === 'tersedia') || eksemplarRows[0]

    res.json({
      bukuId: bukuData.id,
      judul: bukuData.judul,
      penulis: bukuData.penulis,
      penerbit: bukuData.penerbit,
      status: eksemplarTerpilih.status,
      eksemplarId: eksemplarTerpilih.id,
      eksemplarList: eksemplarRows.map((ek) => ({
        id: ek.id,
        status: ek.status,
        barcode: ek.barcode,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
})

// PUT edit buku
// ============================================================
// CATATAN PENTING:
// stok & tersedia TIDAK diambil dari body request, karena keduanya
// adalah nilai turunan dari tabel eksemplar_buku. Setelah update,
// kita panggil sinkronkanStokBuku() untuk memastikan nilainya konsisten.
// ============================================================
router.put('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID buku tidak valid' })
    }

    const { judul, penulis, kategoriId, isbn, lokasi, status } = req.body || {}

    // Hanya field yang DIKIRIM yang diubah. Sebelumnya kategoriId yang tidak
    // dikirim ikut ditimpa jadi null.
    const nilai = {}
    if (judul !== undefined) {
      const j = String(judul).trim()
      if (!j) return res.status(400).json({ error: 'Judul tidak boleh kosong' })
      nilai.judul = j
    }
    if (penulis !== undefined) {
      const p = String(penulis).trim()
      if (!p) return res.status(400).json({ error: 'Penulis tidak boleh kosong' })
      nilai.penulis = p
    }
    if (kategoriId !== undefined) nilai.kategoriId = kategoriId || null
    if (isbn !== undefined) nilai.isbn = isbn
    if (lokasi !== undefined) nilai.lokasi = lokasi
    if (status !== undefined) nilai.status = status

    if (Object.keys(nilai).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diubah' })
    }

    const [updated] = await db
      .update(buku)
      .set(nilai)
      .where(eq(buku.id, id))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Buku tidak ditemukan' })

    // Pastikan stok & tersedia tetap konsisten dengan jumlah eksemplar
    await sinkronkanStokBuku(id)

    // Ambil ulang data buku supaya response berisi stok/tersedia terbaru
    const [bukuFinal] = await db.select().from(buku).where(eq(buku.id, id))

    res.json(bukuFinal)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah data buku' })
  }
})

// ============================================================
// DELETE buku
// ============================================================
// - Menolak hapus kalau masih ada eksemplar yang SEDANG DIPINJAM.
// - Eksemplar yang tidak dipinjam akan ikut terhapus otomatis
//   karena FK onDelete: cascade di schema.
// ============================================================
router.delete('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)

    const [bukuAda] = await db.select().from(buku).where(eq(buku.id, id))
    if (!bukuAda) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' })
    }

    // Cek eksemplar yang statusnya "dipinjam"
    const eksemplarDipinjam = await db
      .select({ id: eksemplarBuku.id, barcode: eksemplarBuku.barcode })
      .from(eksemplarBuku)
      .where(and(
        eq(eksemplarBuku.bukuId, id),
        eq(eksemplarBuku.status, 'dipinjam')
      ))

    if (eksemplarDipinjam.length > 0) {
      return res.status(400).json({
        error: `Buku tidak bisa dihapus karena ada ${eksemplarDipinjam.length} eksemplar yang sedang dipinjam.`,
        eksemplarDipinjam,
      })
    }

    // [BARU] Cek RIWAYAT peminjaman (termasuk yang sudah dikembalikan)
    // di eksemplar manapun milik buku ini. Kalau ada, hapus PASTI gagal
    // karena peminjaman.eksemplarId di-restrict (lihat schema.js),
    // jadi hentikan lebih awal dengan pesan yang jelas ke admin.
    const riwayat = await db
      .select({ id: peminjaman.id })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .where(eq(eksemplarBuku.bukuId, id))
      .limit(1)

    if (riwayat.length > 0) {
      return res.status(400).json({
        error: 'Buku ini tidak bisa dihapus karena masih punya riwayat peminjaman (termasuk yang sudah dikembalikan). Riwayat ini perlu tetap ada untuk laporan & denda.',
      })
    }

    // [DIUBAH] Constraint cascade di database ternyata belum sinkron
    // dengan schema.js (lihat error 23503 di terminal), jadi eksemplar
    // dihapus SECARA EKSPLISIT dulu di dalam transaction, baru bukunya.
    // Aman, karena di atas sudah dipastikan tidak ada eksemplar yang
    // dipinjam maupun punya riwayat peminjaman.
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(eksemplarBuku).where(eq(eksemplarBuku.bukuId, id))
      const [hasil] = await tx.delete(buku).where(eq(buku.id, id)).returning()
      return hasil
    })

    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)

    // Kode 23001 = foreign key RESTRICT (masih ada riwayat di tabel peminjaman,
    // walaupun status peminjamannya sudah "dikembalikan")
    if (err.cause?.code === '23001') {
      return res.status(409).json({
        error: 'Buku ini tidak bisa dihapus karena masih memiliki riwayat peminjaman (pernah dipinjam/dikembalikan).',
      })
    }

    res.status(500).json({ error: 'Gagal menghapus buku' })
  }
})

module.exports = router
module.exports.sinkronkanStokBuku = sinkronkanStokBuku