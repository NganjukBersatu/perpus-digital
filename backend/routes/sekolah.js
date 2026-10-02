const express = require('express')
const router = express.Router()
const { db } = require('../db/client')
const { sekolah, adminAkun } = require('../db/schema')
const { eq, and } = require('drizzle-orm')
const { wajibSuperAdmin } = require('./auth')

router.get('/publik', async (req, res) => {
  try {
    const data = await db
      .select({ id: sekolah.id, nama: sekolah.nama, logoUrl: sekolah.logoUrl })
      .from(sekolah)
      .where(and(eq(sekolah.aktif, true), eq(sekolah.status, 'aktif')))
      .orderBy(sekolah.nama)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil daftar sekolah' })
  }
})

// Khusus super admin: daftar semua sekolah beserta statusnya
router.get('/', wajibSuperAdmin, async (req, res) => {
  try {
    const data = await db
      .select({
        id: sekolah.id,
        nama: sekolah.nama,
        status: sekolah.status,
        aktif: sekolah.aktif,
        createdAt: sekolah.createdAt,
        adminUsername: adminAkun.username,
        adminEmail: adminAkun.email,
      })
      .from(sekolah)
      .leftJoin(adminAkun, eq(adminAkun.sekolahId, sekolah.id))
      .orderBy(sekolah.id)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengambil daftar sekolah' })
  }
})

// Khusus super admin: menunggu | aktif | ditolak | nonaktif
router.patch('/:id/status', wajibSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const status = String(req.body?.status ?? '')
    if (!Number.isInteger(id) || !['menunggu', 'aktif', 'ditolak', 'nonaktif'].includes(status)) {
      return res.status(400).json({ error: 'ID atau status tidak valid' })
    }
    const [s] = await db
      .update(sekolah)
      .set({ status, aktif: status === 'aktif' })
      .where(eq(sekolah.id, id))
      .returning()
    if (!s) return res.status(404).json({ error: 'Sekolah tidak ditemukan' })
    res.json(s)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengubah status sekolah' })
  }
})

module.exports = router