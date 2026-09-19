const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { pengaturanPerpustakaan } = require('../db/schema')
const { eq } = require('drizzle-orm')
const { wajibLogin } = require('./auth')

// GET pengaturan (tidak perlu login — dipakai juga untuk tampil di sidebar sebelum login)
router.get('/', async (req, res) => {
  try {
    const [data] = await db.select().from(pengaturanPerpustakaan).limit(1)
    res.json(data || {
      namaSekolah: '',
      namaPerpustakaan: '',
      alamat: '',
      detail: null
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil pengaturan' })
  }
})

router.put('/', wajibLogin, async (req, res) => {
  try {
    const { namaSekolah, namaPerpustakaan, alamat, detail } = req.body

    // validasi detail.peminjaman
    const p = detail?.peminjaman
    if (p) {
      if (p.minStokPinjam == null || Number(p.minStokPinjam) < 1) {
        return res.status(400).json({ error: 'Stok minimum minimal 1' })
      }
      if (p.durasiSiswa != null && Number(p.durasiSiswa) < 1) {
        return res.status(400).json({ error: 'Durasi pinjam siswa minimal 1 hari' })
      }
      if (p.durasiGuru != null && Number(p.durasiGuru) < 1) {
        return res.status(400).json({ error: 'Durasi pinjam guru minimal 1 hari' })
      }
      if (p.maxBukuSiswa != null && Number(p.maxBukuSiswa) < 1) {
        return res.status(400).json({ error: 'Maksimal buku siswa minimal 1' })
      }
      if (p.maxBukuGuru != null && Number(p.maxBukuGuru) < 1) {
        return res.status(400).json({ error: 'Maksimal buku guru minimal 1' })
      }
      if (p.maxPerpanjang != null && Number(p.maxPerpanjang) < 0) {
        return res.status(400).json({ error: 'Maksimal perpanjangan tidak boleh negatif' })
      }
      if (p.durasiPerpanjang != null && Number(p.durasiPerpanjang) < 1) {
        return res.status(400).json({ error: 'Durasi perpanjangan minimal 1 hari' })
      }
      if (p.durasiOtomatis != null && typeof p.durasiOtomatis !== 'boolean') {
        return res.status(400).json({ error: 'Flag durasiOtomatis harus boolean' })
      }
    }
    // validasi detail.denda
    const d = detail?.denda
    if (d) {
      if (d.nominalPerHariSiswa != null && Number(d.nominalPerHariSiswa) < 0) {
        return res.status(400).json({ error: 'Nominal denda siswa tidak boleh negatif' })
      }
      if (d.nominalPerHariGuru != null && Number(d.nominalPerHariGuru) < 0) {
        return res.status(400).json({ error: 'Nominal denda guru tidak boleh negatif' })
      }
      if (d.dendaMaksimalSiswa != null && Number(d.dendaMaksimalSiswa) < 0) {
        return res.status(400).json({ error: 'Denda maksimal siswa tidak boleh negatif' })
      }
      if (d.dendaMaksimalGuru != null && Number(d.dendaMaksimalGuru) < 0) {
        return res.status(400).json({ error: 'Denda maksimal guru tidak boleh negatif' })
      }
      if (d.masaTenggang != null && Number(d.masaTenggang) < 0) {
        return res.status(400).json({ error: 'Masa tenggang tidak boleh negatif' })
      }
    }

    // validasi detail.notifikasi
    const n = detail?.notifikasi
    if (n) {
      if (n.hariSebelumJatuhTempo != null && Number(n.hariSebelumJatuhTempo) < 1) {
        return res.status(400).json({ error: 'Hari sebelum jatuh tempo minimal 1' })
      }
    }

    // validasi info perpustakaan
    if (namaPerpustakaan != null && String(namaPerpustakaan).trim().length < 3) {
      return res.status(400).json({ error: 'Nama perpustakaan minimal 3 karakter' })
    }
    if (namaSekolah != null && String(namaSekolah).trim().length < 3) {
      return res.status(400).json({ error: 'Nama sekolah minimal 3 karakter' })
    }

    const [existing] = await db.select().from(pengaturanPerpustakaan).limit(1)

    const values = {
      namaSekolah: namaSekolah || '',
      namaPerpustakaan: namaPerpustakaan || '',
      alamat: alamat || '',
      detail: detail || null,
      updatedAt: new Date()
    }

    let updated
    if (existing) {
      ;[updated] = await db
        .update(pengaturanPerpustakaan)
        .set(values)
        .where(eq(pengaturanPerpustakaan.id, existing.id))
        .returning()
    } else {
      ;[updated] = await db.insert(pengaturanPerpustakaan).values(values).returning()
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menyimpan pengaturan' })
  }
})

// GET info perpustakaan ringkas (untuk header aplikasi & kop laporan)
router.get('/publik', async (req, res) => {
  try {
    const [row] = await db.select().from(pengaturanPerpustakaan).limit(1)

    if (!row) {
      return res.json({
        namaPerpustakaan: 'Perpustakaan',
        namaSekolah: '',
        alamat: '',
        telepon: '',
        email: '',
        kepalaPerpustakaan: '',
        tahunAjaran: '',
      })
    }

    const detail = row.detail?.perpustakaan || {}

    res.json({
      namaPerpustakaan: detail.namaPerpustakaan || row.namaPerpustakaan || 'Perpustakaan',
      namaSekolah: detail.namaSekolah || row.namaSekolah || '',
      alamat: detail.alamat || row.alamat || '',
      telepon: detail.telepon || '',
      email: detail.email || '',
      kepalaPerpustakaan: detail.kepalaPerpustakaan || '',
      tahunAjaran: detail.tahunAjaran || '',
      deskripsi: detail.deskripsi || '',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil info perpustakaan' })
  }
})

module.exports = router