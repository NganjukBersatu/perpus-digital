/**
 * Endpoint: GET /api/buku/isbn/:isbn
 * Mencari buku berdasarkan kolom `isbn` di tabel `buku` (bukan barcode eksemplar),
 * lalu mengembalikan data dalam bentuk yang sama seperti endpoint
 * /api/eksemplar-buku/:barcode yang sudah ada, supaya frontend (cariBukuByIsbn
 * di ScanBuku.vue) bisa langsung pakai bookData tanpa perlu diubah.
 *
 * Disesuaikan dengan schema Drizzle kamu (buku, eksemplarBuku).
 */

const express = require('express');
const { eq } = require('drizzle-orm');
const router = express.Router();

// Sesuaikan path ini dengan lokasi instance db & schema kamu yang sebenarnya
const { db } = require("../db/client")
const { buku, eksemplarBuku } = require("../db/schema")
router.get('/isbn/:isbn', async (req, res) => {

  const { isbn } = req.params;

  try {
    // 1. Cari buku berdasarkan ISBN
    const bukuRows = await db
      .select()
      .from(buku)
      .where(eq(buku.isbn, isbn))
      .limit(1);

    if (bukuRows.length === 0) {
      return res.status(404).json({ message: 'Buku dengan ISBN ini tidak ditemukan' });
    }

    const bukuData = bukuRows[0];

    // 2. Ambil semua eksemplar (kopi fisik) dari buku ini
    const eksemplarRows = await db
      .select()
      .from(eksemplarBuku)
      .where(eq(eksemplarBuku.bukuId, bukuData.id))
      .orderBy(eksemplarBuku.id);

    if (eksemplarRows.length === 0) {
      return res.status(404).json({ message: 'Buku ditemukan tapi belum ada eksemplar fisiknya' });
    }

    // 3. Pilih eksemplar berstatus "tersedia" sebagai default,
    //    kalau tidak ada yang tersedia, pakai eksemplar pertama
    const eksemplarTerpilih =
      eksemplarRows.find((ek) => ek.status === 'tersedia') || eksemplarRows[0];

    // 4. Susun response — bentuknya sama dengan yang dipakai bookData di frontend
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;

// =============================================================================
// CARA DAFTARKAN ROUTE INI
// =============================================================================
// Di file app.js / server.js / index.js kamu:
//
//   const bukuIsbnRouter = require('./routes/bukuIsbn');
//   app.use(bukuIsbnRouter);
//
// Taruh sejajar dengan cara kamu mendaftarkan route /api/eksemplar-buku/:barcode
// yang sudah ada, supaya polanya konsisten.