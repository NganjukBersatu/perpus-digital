const express = require('express')
const router = express.Router()
const db = require('../db')
const { buku, kategori, eksemplarBuku, peminjaman, anggota } = require('../db/schema')
const { eq, ilike, and, sql, isNull } = require('drizzle-orm')

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
async function sinkronkanStokBuku(bukuId) {
  const [hasil] = await db
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

  await db
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
router.get('/', async (req, res) => {
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
router.get('/:id/detail', async (req, res) => {
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
router.post('/', async (req, res) => {
  try {
    const { judul, penulis, kategoriId, isbn, lokasi, status, barcode, jumlahEksemplar } = req.body
    if (!judul || !penulis) {
      return res.status(400).json({ error: 'Judul dan penulis wajib diisi' })
    }

    const judulBersih = judul.trim()
    const penulisBersih = penulis.trim()
    // Kalau admin tidak isi jumlah, default 1 (bukan 0) supaya stok buku baru langsung 1
    const jumlahBaru = Number(jumlahEksemplar) > 0 ? Number(jumlahEksemplar) : 1
    const barcodeBersih = bersihkanBarcode(barcode)

    const hasil = await db.transaction(async (tx) => {
      // ============================================================
      // CEK DUPLIKAT: judul & penulis sama persis (tanpa peduli besar/kecil huruf)
      // Kalau sudah ada -> JANGAN buat baris buku baru, cukup tambah
      // eksemplar ke buku yang sudah ada (stok 1 jadi 2, dst).
      // ============================================================
      const [bukuSama] = await tx
        .select()
        .from(buku)
        .where(and(ilike(buku.judul, judulBersih), ilike(buku.penulis, penulisBersih)))

      const targetBukuId = bukuSama ? bukuSama.id : null

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

      let bukuId = targetBukuId
      if (!bukuId) {
        // Tidak ada duplikat -> insert buku baru seperti biasa
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
      // Tidak ada barcode fisik -> generate barcode otomatis.
      // Pakai helper buatBarcodeOtomatis() yang menghitung jumlah
      // eksemplar yang SUDAH ADA dulu, supaya nomor urutnya tidak
      // bentrok saat buku duplikat ditambahkan berkali-kali.
      const eksemplarBaru = await buatBarcodeOtomatis(tx, bukuId, isbn, jumlahBaru)
      await tx.insert(eksemplarBuku).values(eksemplarBaru)
    }

    // Buat eksemplar otomatis kalau barcode dikirim (skenario 1)
    let eksemplarBaru = null
    if (barcode) {
      const [eksemplar] = await db
        .insert(eksemplarBuku)
        .values({
          bukuId: baru.id,
          barcode,
          status: 'tersedia',
        })
        .from(eksemplarBuku)
        .where(eq(eksemplarBuku.bukuId, bukuId))

      await sinkronkanStokBuku(baru.id)
    } else if (Number(jumlahEksemplar) > 0) {
      // Buku tanpa barcode fisik (mis. buku pelajaran/koleksi lama).
      // Sistem tetap perlu baris eksemplar (karena tabel peminjaman
      // wajib merujuk ke eksemplar), jadi dibuatkan kode otomatis
      // dengan format PREFIX-001, PREFIX-002, dst.
      // Kalau prefix tidak diisi, fallback ke BKU-{id}-001, BKU-{id}-002.
      const jumlah = Number(jumlahEksemplar)
      const prefix = (prefixEksemplar || `BKU-${baru.id}`).toUpperCase().trim()

      const nilaiEksemplar = Array.from({ length: jumlah }, (_, i) => ({
        bukuId: baru.id,
        barcode: `${prefix}-${String(i + 1).padStart(3, '0')}`,
        status: 'tersedia',
      }))
      await db.insert(eksemplarBuku).values(nilaiEksemplar)
      await sinkronkanStokBuku(baru.id)
    }
      await tx.update(buku)
        .set({ stok: stat?.stok ?? 0, tersedia: stat?.tersedia ?? 0 })
        .where(eq(buku.id, bukuId))

      const [bukuFinal] = await tx.select().from(buku).where(eq(buku.id, bukuId))
      return { ...bukuFinal, duplikat: !!bukuSama }
    })

    res.status(201).json(hasil)
  } catch (err) {
    console.error('POST /api/buku error:', err)
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message })
    }
    if (err?.code === '23505' || String(err?.message || '').includes('duplicate key')) {
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
router.post('/:id/eksemplar', async (req, res) => {
  try {
    const bukuId = Number(req.params.id)
    const barcodeBersih = bersihkanBarcode(req.body.barcode)

    if (!barcodeBersih) {
      return res.status(400).json({ error: 'Barcode tidak valid atau kosong' })
    }

    const [bukuAda] = await db.select().from(buku).where(eq(buku.id, bukuId))
    if (!bukuAda) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' })
    }

    // Cek apakah barcode sudah dipakai eksemplar lain
    const [existing] = await db
      .select()
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.barcode, barcode))

    let barcodeFinal = barcode

    if (existing) {
      // Barcode sudah ada (biasanya barcode bawaan penerbit yang sama
      // untuk beberapa kopi). Tambahkan suffix nomor urut untuk buku ini.
      const [hitung] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(eksemplarBuku)
        .where(eq(eksemplarBuku.bukuId, bukuId))

      const nomorBerikut = (hitung?.count || 0) + 1
      barcodeFinal = `${barcode}-${String(nomorBerikut).padStart(3, '0')}`
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
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Barcode sudah dipakai eksemplar lain' })
    }
    res.status(500).json({ error: 'Gagal menambah eksemplar' })
  }
})

// GET data buku untuk mulai peminjaman lewat pencarian JUDUL manual
// (dipakai di tab "Manual" ScanBukuPage.vue, setelah admin pilih
// salah satu hasil pencarian judul).
router.get('/:id/untuk-pinjam', async (req, res) => {
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
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { judul, penulis, kategoriId, isbn, lokasi, status } = req.body

    const [updated] = await db
      .update(buku)
      .set({
        judul,
        penulis,
        kategoriId: kategoriId || null,
        isbn,
        lokasi,
        status,
      })
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
router.delete('/:id', async (req, res) => {
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
    console.error('DELETE /api/buku/:id error:', err)
    const kodeAsli = err?.cause?.code || err?.code
    if (kodeAsli === '23503') {
      return res.status(400).json({
        error: 'Buku tidak bisa dihapus karena masih terhubung ke data lain (riwayat peminjaman).',
      })
    }
    res.status(500).json({ error: 'Gagal menghapus buku' })
  }
})

module.exports = router
module.exports.sinkronkanStokBuku = sinkronkanStokBuku