const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { anggota, kelas: tabelKelas } = require('../db/schema')
const { eq, and } = require('drizzle-orm')
const { loginLimiter, daftarLimiter } = require('../middleware/rateLimiter')
const { normalisasiTanggal } = require('../utils/validasi')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET belum di-set. Tambahkan JWT_SECRET=<string acak panjang> di file .env sebelum menjalankan server.'
  )
}
if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET minimal 32 karakter.')
}

const SIGN_OPTS = { algorithm: 'HS256', expiresIn: '8h' }
const VERIFY_OPTS = { algorithms: ['HS256'] }

// POST login siswa (pakai NIS + tanggal lahir)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const nisBersih = String(body.nis ?? '').trim()
    const tgl = normalisasiTanggal(body.tanggalLahir)
    if (!nisBersih || !tgl) {
      return res.status(400).json({ error: 'NIS dan tanggal lahir wajib diisi (format tanggal YYYY-MM-DD)' })
    }

    const [siswa] = await db
      .select()
      .from(anggota)
      .where(and(
        eq(anggota.nis, nisBersih),
        eq(anggota.tanggalLahir, tgl),
        eq(anggota.peran, 'siswa')
      ))

    if (!siswa) {
      return res.status(401).json({ error: 'NIS atau tanggal lahir salah' })
    }

    const token = jwt.sign({ id: siswa.id, role: 'siswa' }, JWT_SECRET, SIGN_OPTS)

    res.json({
      token,
      role: 'siswa',
      siswa: {
        id: siswa.id,
        nama: siswa.nama,
        kelas: siswa.kelas,
        nis: siswa.nis,
      },
    })
  } catch (err) {
    console.error('[LOGIN SISWA ERROR]', err)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// POST daftar siswa (self-register)
// Siswa mengisi datanya sendiri (Nama, NIS, Kelas, Tanggal Lahir) tanpa
// perlu didaftarkan admin lebih dulu. Tidak ada verifikasi silang ke
// data resmi sekolah — NIS di sini cuma perlu UNIK, belum tentu benar
// secara administratif. Cocok untuk skala aplikasi internal sekolah.
//
// Risiko yang tidak bisa ditutup dengan kode: siapa pun bisa mendaftarkan NIS
// milik temannya lebih dulu dengan tanggal lahir karangan. Kalau ini jadi masalah,
// matikan pendaftaran mandiri dan impor data siswa lewat admin.
router.post('/daftar', daftarLimiter, async (req, res) => {
  try {
    const { nama, nis, kelas, tanggalLahir } = req.body || {}

    const namaBersih = String(nama ?? '').trim()
    const nisBersih = String(nis ?? '').trim()
    const kelasBersih = String(kelas ?? '').trim()

    if (!namaBersih) {
      return res.status(400).json({ error: 'Nama wajib diisi' })
    }
    if (!nisBersih) {
      return res.status(400).json({ error: 'NIS wajib diisi' })
    }
    if (!kelasBersih) {
      return res.status(400).json({ error: 'Kelas wajib dipilih' })
    }
    const tgl = normalisasiTanggal(tanggalLahir)
    if (!tgl) {
      return res.status(400).json({ error: 'Tanggal lahir wajib diisi (format YYYY-MM-DD)' })
    }
    // batas panjang, karena endpoint ini publik
    if (namaBersih.length > 100 || nisBersih.length > 30 || kelasBersih.length > 30) {
      return res.status(400).json({ error: 'Data terlalu panjang' })
    }

    
    // Kelas harus salah satu kelas yang ada di tabel kelas (bukan teks bebas)
    const [kelasValid] = await db
      .select({ namaKelas: tabelKelas.namaKelas })
      .from(tabelKelas)
      .where(eq(tabelKelas.namaKelas, kelasBersih))
      .limit(1)
    if (!kelasValid) {
      return res.status(400).json({ error: 'Kelas tidak dikenal. Pilih kelas dari daftar.' })
    }

    const [nisSudahAda] = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(eq(anggota.nis, nisBersih))
      .limit(1)

    if (nisSudahAda) {
      return res.status(409).json({ error: 'NIS ini sudah terdaftar. Silakan langsung login.' })
    }

    const [baru] = await db
      .insert(anggota)
      .values({
        nama: namaBersih,
        nis: nisBersih,
        kelas: kelasBersih,
        tanggalLahir: tgl,
        peran: 'siswa',
      })
      .returning()

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil. Silakan login menggunakan NIS dan tanggal lahir Anda.',
      siswa: {
        id: baru.id,
        nama: baru.nama,
        nis: baru.nis,
        kelas: baru.kelas,
      },
    })
  } catch (err) {
    // dua pendaftaran dengan NIS sama yang masuk bersamaan (lolos cek di atas)
    if ((err.cause?.code || err.code) === '23505') {
      return res.status(409).json({ error: 'NIS ini sudah terdaftar. Silakan langsung login.' })
    }
    console.error(err)
    res.status(500).json({ error: 'Gagal mendaftar' })
  }
})

// Middleware untuk lindungi endpoint yang butuh login siswa
function wajibLoginSiswa(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Belum login' })
  }
  let payload
  try {
    payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET, VERIFY_OPTS)
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' })
  }
  if (payload.role !== 'siswa') {
    return res.status(403).json({ error: 'Akses ditolak' })
  }
  req.siswa = payload
  next() // di luar try, jadi error hilir tidak salah dilaporkan sebagai 401
}

module.exports = { router, wajibLoginSiswa }