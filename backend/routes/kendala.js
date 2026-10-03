// backend/routes/kendala.js
//
// Alur laporan kendala:
//   - role siswa / guru -> tujuan 'admin'      (masuk ke admin sekolah yang dipilih)
//   - role admin        -> tujuan 'superadmin' (masuk ke super admin)
// Tujuan SELALU ditentukan di server dari role, bukan dari kiriman browser.
//
// Dipasang di index.js sebagai:  app.use("/api", kendalaRoutes)
//   POST  /api/kendala                       publik (dari halaman login)
//   GET   /api/admin/kendala                 admin sekolah
//   GET   /api/admin/kendala/jumlah          admin sekolah (badge menu)
//   PATCH /api/admin/kendala/:id/selesai     admin sekolah
//   GET   /api/superadmin/kendala            super admin
//   GET   /api/superadmin/kendala/jumlah     super admin (badge menu)
//   PATCH /api/superadmin/kendala/:id/selesai super admin

const express = require("express")
const rateLimit = require("express-rate-limit")
const { sql } = require("drizzle-orm")

const { db } = require("../db/client")
const auth = require("./auth")

const router = express.Router()

const ROLE_VALID = ["siswa", "guru", "admin"]

/* ---------- Pengecekan super admin ----------
   Kalau auth.js sudah punya middleware super admin (wajibSuperadmin), itu yang dipakai.
   Kalau belum, pakai wajibLogin + cek role === 'superadmin'.
   Kalau route /api/sekolah memakai middleware super admin dengan nama lain,
   ganti baris wajibSuperadmin di bawah dengan nama itu. */
function cekRoleSuperadmin(req, res, next) {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Khusus super admin" })
  }
  next()
}
const wajibSuperadmin =
  auth.wajibSuperadmin || auth.wajibSuperAdmin || [auth.wajibLogin, cekRoleSuperadmin]

/* ---------- Buat tabel otomatis kalau belum ada ---------- */
;(async () => {
  try {
    await db.execute(sql`
      create table if not exists kendala (
        id serial primary key,
        kontak varchar(100) not null,
        jenis varchar(100) not null,
        pesan text not null,
        role varchar(20),
        sekolah_id integer,
        tujuan varchar(20) not null check (tujuan in ('admin', 'superadmin')),
        status varchar(20) not null default 'baru',
        dibuat_pada timestamptz not null default now()
      )
    `)
    await db.execute(sql`
      create index if not exists idx_kendala_tujuan on kendala (tujuan, sekolah_id, status)
    `)
  } catch (err) {
    console.error("Gagal menyiapkan tabel kendala:", err)
  }
})()

// Endpoint publik: batasi supaya tidak di-spam
const limiterKendala = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Terlalu banyak laporan, coba lagi beberapa menit lagi" },
})

/* ===================== PUBLIK: kirim laporan ===================== */
router.post("/kendala", limiterKendala, async (req, res) => {
  try {
    const { kontak, jenis, pesan, role } = req.body || {}
    const sekolahIdMentah = req.body?.sekolahId
    let sekolahId = sekolahIdMentah ? Number(sekolahIdMentah) : null

    if (!ROLE_VALID.includes(role)) {
      return res.status(400).json({ message: "Peran tidak valid" })
    }
    if (!String(kontak || "").trim() || !String(jenis || "").trim() || !String(pesan || "").trim()) {
      return res.status(400).json({ message: "Kontak, jenis kendala, dan pesan wajib diisi" })
    }
    if (sekolahId !== null && !Number.isInteger(sekolahId)) {
      return res.status(400).json({ message: "Sekolah tidak valid" })
    }

    let tujuan = "superadmin"

    if (role !== "admin") {
      // siswa & guru: sekolah wajib ada, laporan masuk ke admin sekolah tsb
      if (!sekolahId) {
        return res.status(400).json({ message: "Pilih sekolah terlebih dahulu" })
      }
      const cek = await db.execute(sql`select 1 from sekolah where id = ${sekolahId}`)
      if (cek.rows.length === 0) {
        return res.status(400).json({ message: "Sekolah tidak ditemukan" })
      }
      tujuan = "admin"
    } else if (sekolahId) {
      // admin: sekolah hanya info tambahan; kalau tidak valid, abaikan
      const cek = await db.execute(sql`select 1 from sekolah where id = ${sekolahId}`)
      if (cek.rows.length === 0) sekolahId = null
    }

    await db.execute(sql`
      insert into kendala (kontak, jenis, pesan, role, sekolah_id, tujuan)
      values (
        ${String(kontak).trim().slice(0, 100)},
        ${String(jenis).trim().slice(0, 100)},
        ${String(pesan).trim().slice(0, 1000)},
        ${role},
        ${sekolahId},
        ${tujuan}
      )
    `)

    res.status(201).json({ message: "Laporan terkirim" })
  } catch (err) {
    console.error("POST /kendala", err)
    res.status(500).json({ message: "Gagal mengirim laporan" })
  }
})

/* ===================== ADMIN SEKOLAH ===================== */
// laporan dari siswa & guru di sekolahnya sendiri
router.get("/admin/kendala", auth.wajibAdmin, async (req, res) => {
  try {
    const { sekolahId } = req.user
    const hasil = await db.execute(sql`
      select id, kontak, jenis, pesan, role, status, dibuat_pada
      from kendala
      where tujuan = 'admin' and sekolah_id = ${sekolahId}
      order by (status = 'baru') desc, dibuat_pada desc
    `)
    res.json(hasil.rows)
  } catch (err) {
    console.error("GET /admin/kendala", err)
    res.status(500).json({ message: "Gagal memuat laporan" })
  }
})

router.get("/admin/kendala/jumlah", auth.wajibAdmin, async (req, res) => {
  try {
    const { sekolahId } = req.user
    const hasil = await db.execute(sql`
      select count(*)::int as baru
      from kendala
      where tujuan = 'admin' and sekolah_id = ${sekolahId} and status = 'baru'
    `)
    res.json({ baru: Number(hasil.rows[0].baru) })
  } catch (err) {
    console.error("GET /admin/kendala/jumlah", err)
    res.status(500).json({ message: "Gagal memuat jumlah laporan" })
  }
})

router.patch("/admin/kendala/:id/selesai", auth.wajibAdmin, async (req, res) => {
  try {
    const { sekolahId } = req.user
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" })

    // syarat sekolah_id memastikan admin tidak bisa mengubah laporan sekolah lain
    const hasil = await db.execute(sql`
      update kendala set status = 'selesai'
      where id = ${id} and tujuan = 'admin' and sekolah_id = ${sekolahId}
    `)
    if (!hasil.rowCount) return res.status(404).json({ message: "Laporan tidak ditemukan" })
    res.json({ ok: true })
  } catch (err) {
    console.error("PATCH /admin/kendala/:id/selesai", err)
    res.status(500).json({ message: "Gagal memperbarui laporan" })
  }
})

/* ===================== SUPER ADMIN ===================== */
// laporan dari admin sekolah
router.get("/superadmin/kendala", wajibSuperadmin, async (req, res) => {
  try {
    const hasil = await db.execute(sql`
      select k.id, k.kontak, k.jenis, k.pesan, k.role, k.status, k.dibuat_pada,
             s.nama as sekolah_nama
      from kendala k
      left join sekolah s on s.id = k.sekolah_id
      where k.tujuan = 'superadmin'
      order by (k.status = 'baru') desc, k.dibuat_pada desc
    `)
    res.json(hasil.rows)
  } catch (err) {
    console.error("GET /superadmin/kendala", err)
    res.status(500).json({ message: "Gagal memuat laporan" })
  }
})

router.get("/superadmin/kendala/jumlah", wajibSuperadmin, async (req, res) => {
  try {
    const hasil = await db.execute(sql`
      select count(*)::int as baru
      from kendala
      where tujuan = 'superadmin' and status = 'baru'
    `)
    res.json({ baru: Number(hasil.rows[0].baru) })
  } catch (err) {
    console.error("GET /superadmin/kendala/jumlah", err)
    res.status(500).json({ message: "Gagal memuat jumlah laporan" })
  }
})

router.patch("/superadmin/kendala/:id/selesai", wajibSuperadmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" })

    const hasil = await db.execute(sql`
      update kendala set status = 'selesai'
      where id = ${id} and tujuan = 'superadmin'
    `)
    if (!hasil.rowCount) return res.status(404).json({ message: "Laporan tidak ditemukan" })
    res.json({ ok: true })
  } catch (err) {
    console.error("PATCH /superadmin/kendala/:id/selesai", err)
    res.status(500).json({ message: "Gagal memperbarui laporan" })
  }
})

module.exports = router