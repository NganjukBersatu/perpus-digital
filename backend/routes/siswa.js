const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { anggota, peminjaman, eksemplarBuku, buku } = require('../db/schema')
const { eq, ne, and, ilike, desc, isNull } = require('drizzle-orm')
const { wajibAdmin } = require('./auth')
const { normalisasiTanggal, escapeLike } = require('../utils/validasi')

// Catatan: wajibAdmin dipasang per route (bukan router.use), karena route
// /api/siswa/notifikasi milik siswa didaftarkan di index.js pada prefix yang sama.

function nisGanda(err) {
  return (err.cause?.code || err.code) === '23505'
}

// GET semua siswa (opsional filter pencarian nama lewat ?q=...)
router.get('/', wajibAdmin, async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim()
    const conditions = [eq(anggota.peran, 'siswa')]
    if (q) conditions.push(ilike(anggota.nama, `%${escapeLike(q)}%`))

    const rows = await db.select().from(anggota).where(and(...conditions)).orderBy(anggota.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data siswa' })
  }
})

// GET riwayat peminjaman milik satu siswa
router.get('/:id/riwayat', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' })

    const rows = await db
      .select({
        id: peminjaman.id,
        judul: buku.judul,
        tanggalPinjam: peminjaman.tanggalPinjam,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
      })
      .from(peminjaman)
      .innerJoin(eksemplarBuku, eq(eksemplarBuku.id, peminjaman.eksemplarId))
      .innerJoin(buku, eq(buku.id, eksemplarBuku.bukuId))
      .where(eq(peminjaman.anggotaId, id))
      .orderBy(desc(peminjaman.id))

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil riwayat peminjaman' })
  }
})

// POST tambah siswa baru
router.post('/', wajibAdmin, async (req, res) => {
  try {
    const { nama, kelas, nis, tanggalLahir } = req.body || {}
    const namaBersih = String(nama || '').trim()
    if (!namaBersih) return res.status(400).json({ error: 'Nama wajib diisi' })

    const nisBersih = nis ? String(nis).trim() : null
    const kelasBersih = kelas ? String(kelas).trim() : null
    const tgl = tanggalLahir ? normalisasiTanggal(tanggalLahir) : null
    if (tanggalLahir && !tgl) {
      return res.status(400).json({ error: 'Format tanggal lahir tidak valid (YYYY-MM-DD)' })
    }
    if (nisBersih) {
      const [dup] = await db.select({ id: anggota.id }).from(anggota).where(eq(anggota.nis, nisBersih)).limit(1)
      if (dup) return res.status(409).json({ error: 'NIS sudah terdaftar' })
    }

    const [baru] = await db
      .insert(anggota)
      .values({ nama: namaBersih, kelas: kelasBersih, nis: nisBersih, tanggalLahir: tgl, peran: 'siswa' })
      .returning()
    res.status(201).json(baru)
  } catch (err) {
    if (nisGanda(err)) return res.status(409).json({ error: 'NIS sudah terdaftar' })
    console.error(err)
    res.status(500).json({ error: 'Gagal menambah siswa' })
  }
})

// PUT edit siswa
// Hanya field yang dikirim yang diubah. String kosong pada nis/tanggalLahir/kelas
// berarti "kosongkan" (disimpan sebagai null).
router.put('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' })

    const { nama, kelas, nis, tanggalLahir } = req.body || {}
    const perubahan = {}

    if (nama !== undefined) {
      const namaBersih = String(nama).trim()
      if (!namaBersih) return res.status(400).json({ error: 'Nama tidak boleh kosong' })
      perubahan.nama = namaBersih
    }

    if (kelas !== undefined) {
      perubahan.kelas = kelas ? String(kelas).trim() : null
    }

    if (nis !== undefined) {
      const nisBersih = nis ? String(nis).trim() : null
      if (nisBersih) {
        const [dup] = await db
          .select({ id: anggota.id })
          .from(anggota)
          .where(and(eq(anggota.nis, nisBersih), ne(anggota.id, id)))
          .limit(1)
        if (dup) return res.status(409).json({ error: 'NIS sudah dipakai siswa lain' })
      }
      perubahan.nis = nisBersih
    }

    if (tanggalLahir !== undefined) {
      if (tanggalLahir) {
        const tgl = normalisasiTanggal(tanggalLahir)
        if (!tgl) return res.status(400).json({ error: 'Format tanggal lahir tidak valid (YYYY-MM-DD)' })
        perubahan.tanggalLahir = tgl
      } else {
        perubahan.tanggalLahir = null
      }
    }

    if (Object.keys(perubahan).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diubah' })
    }

    const [updated] = await db
      .update(anggota)
      .set(perubahan)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'siswa')))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    res.json(updated)
  } catch (err) {
    if (nisGanda(err)) return res.status(409).json({ error: 'NIS sudah dipakai siswa lain' })
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah data siswa' })
  }
})

// DELETE siswa (beserta riwayat peminjamannya)
router.delete('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' })

    const [cek] = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'siswa')))
      .limit(1)
    if (!cek) return res.status(404).json({ error: 'Siswa tidak ditemukan' })

    // jangan hapus siswa yang masih membawa buku, kalau tidak eksemplarnya
    // akan macet di status "dipinjam" selamanya
    const [aktif] = await db
      .select({ id: peminjaman.id })
      .from(peminjaman)
      .where(and(eq(peminjaman.anggotaId, id), isNull(peminjaman.tanggalDikembalikan)))
      .limit(1)
    if (aktif) {
      return res.status(409).json({
        error: 'Siswa masih memiliki buku yang belum dikembalikan. Proses pengembaliannya dulu.',
      })
    }

    const deleted = await db.transaction(async (tx) => {
      await tx.delete(peminjaman).where(eq(peminjaman.anggotaId, id))
      const [d] = await tx
        .delete(anggota)
        .where(and(eq(anggota.id, id), eq(anggota.peran, 'siswa')))
        .returning()
      return d
    })

    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus siswa' })
  }
})

module.exports = router