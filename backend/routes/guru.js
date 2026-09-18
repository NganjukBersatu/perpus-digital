const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const db = require('../db')
const { anggota, peminjaman } = require('../db/schema')
const { eq, ilike, and } = require('drizzle-orm')

// GET semua guru (opsional search nama)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query

    const rows = await db
      .select({
        id: anggota.id,
        nama: anggota.nama,
        nip: anggota.nip,
        mapel: anggota.mapel,
        peran: anggota.peran,
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
router.post('/', async (req, res) => {
  try {
    const { nama, nip, mapel } = req.body

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }
    if (!nip || !String(nip).trim()) {
      return res.status(400).json({ error: 'NIP wajib diisi' })
    }

    const nipBersih = String(nip).trim()

    // Cek NIP belum dipakai guru lain
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
        nama: String(nama).trim(),
        nip: nipBersih,
        mapel: mapel || null,
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
    res.status(500).json({ error: 'Gagal menambah guru' })
  }
})

// PUT edit guru
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nama, nip, mapel } = req.body

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }

    const [updated] = await db
      .update(anggota)
      .set({
        nama: String(nama).trim(),
        nip: nip || null,
        mapel: mapel || null,
      })
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .returning()

    if (!updated) return res.status(404).json({ error: 'Guru tidak ditemukan' })

    const { password, ...bebasPassword } = updated
    res.json(bebasPassword)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah data guru' })
  }
})

// DELETE guru (beserta riwayat peminjamannya)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const cek = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .limit(1)

    if (cek.length === 0) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' })
    }

    await db.delete(peminjaman).where(eq(peminjaman.anggotaId, id))

    const [deleted] = await db
      .delete(anggota)
      .where(and(eq(anggota.id, id), eq(anggota.peran, 'guru')))
      .returning()

    res.json({ success: true, deleted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menghapus guru' })
  }
})

module.exports = router