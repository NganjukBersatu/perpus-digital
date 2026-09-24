const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const db = require('../db')
const { anggota, peminjaman } = require('../db/schema')
const { eq, ilike, and, ne, isNull } = require('drizzle-orm')
const { wajibAdmin } = require('./auth')
const { normalisasiTanggal } = require('../utils/validasi')

// GET semua guru (opsional search nama)
router.get('/', wajibAdmin, async (req, res) => {
  try {
    const { q } = req.query

    const rows = await db
  .select({
    id: anggota.id,
    nama: anggota.nama,
    nip: anggota.nip,
    mapel: anggota.mapel,
    peran: anggota.peran,
    tanggalLahir: anggota.tanggalLahir,
  })
  .from(anggota)
      .where(
        and(
          eq(anggota.peran, 'guru'),
          q ? ilike(anggota.nama, `%${q}%`) : undefined
        )
      )
      .orderBy(anggota.nama)

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil data guru' })
  }
})

// POST tambah guru
// Password awal otomatis di-generate dari NIP (di-hash), dan guru
// diwajibkan ganti password saat login pertama kali (harusGantiPassword).
router.post('/', wajibAdmin, async (req, res) => {
  try {
    const { nama, nip, mapel, tanggalLahir } = req.body || {}

    const namaBersih = String(nama ?? '').trim()
    const nipBersih = String(nip ?? '').trim()
    if (!namaBersih) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }
    if (!nipBersih) {
      return res.status(400).json({ error: 'NIP wajib diisi' })
    }

    // Tanggal lahir opsional, tapi kalau diisi harus valid.
    // (Tanggal tidak valid sebelumnya lolos sampai database lalu jadi error 500.)
    let tglLahir = null
    if (tanggalLahir) {
      tglLahir = normalisasiTanggal(tanggalLahir)
      if (!tglLahir) {
        return res.status(400).json({ error: 'Format tanggal lahir harus YYYY-MM-DD' })
      }
    }

    // Cek NIP belum dipakai
    const [nipSudahAda] = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(eq(anggota.nip, nipBersih))
      .limit(1)

    if (nipSudahAda) {
      return res.status(409).json({ error: 'NIP ini sudah terdaftar' })
    }

    const passwordHash = await bcrypt.hash(nipBersih, 10)

    const [baru] = await db
      .insert(anggota)
      .values({
        nama: namaBersih,
        nip: nipBersih,
        mapel: mapel ? String(mapel).trim() : null,
        tanggalLahir: tglLahir,
        kelas: null,
        peran: 'guru',
        password: passwordHash,
        harusGantiPassword: true,
      })
      .returning()

    // Jangan kirim balik hash password ke frontend
    const { password, ...bebasPassword } = baru
    res.status(201).json(bebasPassword)
  } catch (err) {
    console.error(err)
    if ((err?.cause?.code || err?.code) === '23505') {
      return res.status(409).json({ error: 'NIP ini sudah terdaftar' })
    }
    res.status(500).json({ error: 'Gagal menambah guru' })
  }
})

// PUT edit guru
router.put('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID tidak valid' })
    }

    const { nama, nip, mapel, tanggalLahir } = req.body || {}

    // Hanya field yang DIKIRIM yang diubah. Sebelumnya NIP yang tidak dikirim
    // ikut ditimpa jadi null, dan guru itu tidak bisa login lagi (login pakai NIP).
    const nilai = {}

    if (nama !== undefined) {
      const namaBersih = String(nama).trim()
      if (!namaBersih) return res.status(400).json({ error: 'Nama wajib diisi' })
      nilai.nama = namaBersih
    }

    if (nip !== undefined) {
      const nipBersih = String(nip ?? '').trim()
      if (!nipBersih) return res.status(400).json({ error: 'NIP tidak boleh kosong' })

      // NIP baru tidak boleh dipakai guru lain
      const [bentrok] = await db
        .select({ id: anggota.id })
        .from(anggota)
        .where(and(eq(anggota.nip, nipBersih), ne(anggota.id, id)))
        .limit(1)
      if (bentrok) return res.status(409).json({ error: 'NIP ini sudah dipakai' })

      nilai.nip = nipBersih
    }

    if (mapel !== undefined) {
      nilai.mapel = mapel ? String(mapel).trim() : null
    }

    if (tanggalLahir !== undefined) {
      if (tanggalLahir) {
        const tgl = normalisasiTanggal(tanggalLahir)
        if (!tgl) return res.status(400).json({ error: 'Format tanggal lahir harus YYYY-MM-DD' })
        nilai.tanggalLahir = tgl
      } else {
        nilai.tanggalLahir = null
      }
    }

    if (Object.keys(nilai).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diubah' })
    }

    const [updated] = await db
      .update(anggota)
      .set(nilai)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Guru tidak ditemukan' })

    const { password, ...bebasPassword } = updated
    res.json(bebasPassword)
  } catch (err) {
    console.error(err)
    if ((err?.cause?.code || err?.code) === '23505') {
      return res.status(409).json({ error: 'NIP ini sudah dipakai' })
    }
    res.status(500).json({ error: 'Gagal mengubah data guru' })
  }
})

// DELETE guru (beserta riwayat peminjamannya)
router.delete('/:id', wajibAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID tidak valid' })
    }

    const [cek] = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .limit(1)

    if (!cek) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' })
    }

    // Tolak kalau guru ini masih memegang buku. Kalau riwayatnya dihapus saat buku
    // belum kembali, eksemplar itu terkunci berstatus "dipinjam" selamanya
    // dan stok buku jadi salah.
    const [masihPinjam] = await db
      .select({ id: peminjaman.id })
      .from(peminjaman)
      .where(and(eq(peminjaman.anggotaId, id), isNull(peminjaman.tanggalDikembalikan)))
      .limit(1)

    if (masihPinjam) {
      return res.status(409).json({
        error: 'Guru ini masih memiliki buku yang belum dikembalikan. Selesaikan pengembalian dulu sebelum menghapus.',
      })
    }

    // Riwayat dan akun dihapus dalam satu transaksi: berhasil semua atau batal semua
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(peminjaman).where(eq(peminjaman.anggotaId, id))
      const [hasil] = await tx
        .delete(anggota)
        .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
        .returning()
      return hasil
    })

    // Jangan kirim balik hash password
    const { password, ...bebasPassword } = deleted
    res.json({ success: true, deleted: bebasPassword })
  } catch (err) {
    console.error(err)
    if ((err?.cause?.code || err?.code) === '23503') {
      return res.status(409).json({ error: 'Guru tidak bisa dihapus karena masih terhubung ke data lain' })
    }
    res.status(500).json({ error: 'Gagal menghapus guru' })
  }
})

module.exports = router