const express = require('express')
const router = express.Router()
const db = require('../db')   
const { peminjaman, eksemplarBuku, anggota, buku } = require('../db/schema')
const { eq, and, gt, or, ilike, sql } = require('drizzle-orm')

// GET /api/denda?search=&status=
// Menampilkan semua transaksi peminjaman yang punya denda > 0
router.get('/', async (req, res) => {
  try {
    const { search = '', status = 'Semua' } = req.query

    const conditions = [gt(peminjaman.denda, 0)]

    if (search) {
      conditions.push(
        or(
          ilike(anggota.nama, `%${search}%`),
          ilike(buku.judul, `%${search}%`)
        )
      )
    }

    const rows = await db
      .select({
        id: peminjaman.id,
        namaPeminjam: anggota.nama,
        kelasPeminjam: anggota.kelas,
        peranPeminjam: anggota.peran,
        judulBuku: buku.judul,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
        denda: peminjaman.denda,
        statusDenda: peminjaman.statusDenda,
        tanggalBayarDenda: peminjaman.tanggalBayarDenda,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .innerJoin(eksemplarBuku, eq(peminjaman.eksemplarId, eksemplarBuku.id))
      .innerJoin(buku, eq(eksemplarBuku.bukuId, buku.id))
      .where(and(...conditions))
      .orderBy(sql`${peminjaman.id} desc`)

    const data =
      status === 'Sudah Dibayar'
        ? rows.filter((r) => r.statusDenda === 'sudah_dibayar')
        : status === 'Belum Dibayar'
        ? rows.filter((r) => r.statusDenda !== 'sudah_dibayar')
        : rows

    const totalBelumDibayar = rows
      .filter((r) => r.statusDenda !== 'sudah_dibayar')
      .reduce((sum, r) => sum + (r.denda || 0), 0)

    const totalSudahDibayar = rows
      .filter((r) => r.statusDenda === 'sudah_dibayar')
      .reduce((sum, r) => sum + (r.denda || 0), 0)

    res.json({ data, total: data.length, totalBelumDibayar, totalSudahDibayar })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data denda' })
  }
})

// PATCH /api/denda/:id/bayar
// Menandai denda sebagai sudah dibayar
router.patch('/:id/bayar', async (req, res) => {
  try {
    const { id } = req.params
    const today = new Date().toISOString().slice(0, 10)

    await db
      .update(peminjaman)
      .set({ statusDenda: 'sudah_dibayar', tanggalBayarDenda: today })
      .where(eq(peminjaman.id, Number(id)))

    res.json({ message: 'Denda berhasil ditandai sudah dibayar' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal memperbarui status denda' })
  }
})

module.exports = router