const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../db/client')
const { adminAkun, anggota, sekolah } = require('../db/schema')
const { eq, and, sql } = require('drizzle-orm')
const { loginLimiter, daftarLimiter, cekUsernameLimiter } = require('../middleware/rateLimiter')
const { normalisasiTanggal } = require('../utils/validasi')
const { ambilSekolahAktif } = require('../utils/sekolah')

// JWT_SECRET wajib di-set lewat file .env, tidak boleh diam-diam
// pakai nilai bawaan yang keliatan di kode ini.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET belum di-set. Tambahkan JWT_SECRET=<string acak panjang> di file .env sebelum menjalankan server.'
  )
}
if (JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET minimal 32 karakter. Buat dengan: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  )
}

const SIGN_OPTS = { algorithm: 'HS256', expiresIn: '8h' }
const VERIFY_OPTS = { algorithms: ['HS256'] }
// hash palsu: dipakai supaya bcrypt.compare tetap berjalan walau akun tidak ada
// (waktu respons sama, sehingga username/NIP yang valid tidak bisa ditebak dari waktunya)
const HASH_PALSU = bcrypt.hashSync('hash-palsu-untuk-menyamakan-waktu', 10)

// POST login admin
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' })
    }

    // Dengan sekolahId → admin sekolah. Tanpa sekolahId → hanya akun superadmin.
    let sek = null
    let akun
    if (req.body?.sekolahId) {
      sek = await ambilSekolahAktif(req.body.sekolahId)
      if (!sek) return res.status(400).json({ error: 'Sekolah tidak ditemukan atau tidak aktif' })
      ;[akun] = await db.select().from(adminAkun)
        .where(and(eq(adminAkun.sekolahId, sek.id), eq(adminAkun.username, username.trim())))
    } else {
      ;[akun] = await db.select().from(adminAkun)
        .where(and(eq(adminAkun.username, username.trim()), eq(adminAkun.peran, 'superadmin')))
    }

    // selalu jalankan bcrypt agar waktu respons sama, baik akun ada maupun tidak
    const cocok = await bcrypt.compare(password, akun ? akun.passwordHash : HASH_PALSU)
    if (!akun || !cocok) {
      return res.status(401).json({ error: 'Username atau password salah' })
    }

    const superadmin = akun.peran === 'superadmin'
    const role = superadmin ? 'superadmin' : 'admin'

    const token = jwt.sign(
      { id: akun.id, username: akun.username, role, sekolahId: akun.sekolahId ?? null },
      JWT_SECRET,
      SIGN_OPTS
    )

    res.json({
      token,
      role,
      nama: akun.namaLengkap,
      harusGantiPassword: !!akun.harusGantiPassword,
      sekolah: sek ? { id: sek.id, nama: sek.nama, logoUrl: sek.logoUrl } : null,
      admin: {
        token,
        role,
        nama: akun.namaLengkap,
        admin: {
          id: akun.id,
          username: akun.username,
          namaLengkap: akun.namaLengkap,
          email: akun.email,
          telepon: akun.telepon,
          jabatan: akun.jabatan,
          nipNik: akun.nipNik,
        },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal login' })
  }
})


  // GET cek apakah username admin masih tersedia (dipakai form daftar sekolah)
  router.get('/cek-username', cekUsernameLimiter, async (req, res) => {
    try {
      const username = String(req.query.username ?? '').trim()
      if (!/^[A-Za-z0-9._-]{4,50}$/.test(username)) {
        return res.status(400).json({ error: 'Format username tidak valid' })
      }
      const [ada] = await db
        .select({ id: adminAkun.id })
        .from(adminAkun)
        .where(eq(adminAkun.username, username))
        .limit(1)
      res.json({ tersedia: !ada })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Gagal memeriksa username' })
    }
  })

// POST daftar admin + sekolah baru
// Membuat 1 baris di tabel `sekolah` dan 1 akun di `admin_akun` sekaligus.
// Kalau KODE_UNDANGAN di-set di .env, pendaftar wajib mengirim kode yang sama.
router.post('/daftar-admin', daftarLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const namaSekolah = String(body.namaSekolah ?? '').trim().replace(/\s+/g, ' ')
    const username = String(body.username ?? '').trim()
    const password = body.password
    const email = String(body.email ?? '').trim().toLowerCase()

    const kodeWajib = process.env.KODE_UNDANGAN
    if (kodeWajib && String(body.kodeUndangan ?? '').trim() !== kodeWajib) {
      return res.status(403).json({ error: 'Kode undangan salah' })
    }

    if (!namaSekolah || namaSekolah.length > 255) {
      return res.status(400).json({ error: 'Nama sekolah wajib diisi (maksimal 255 karakter)' })
    }
    if (!/^[A-Za-z0-9._-]{4,50}$/.test(username)) {
      return res.status(400).json({
        error: 'Username 4–50 karakter, hanya huruf, angka, titik, garis bawah, atau strip',
      })
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Password harus 8–72 karakter' })
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Email tidak valid' })
    }

    // nama sekolah yang sama (huruf besar/kecil dianggap sama) ditolak
    const [sekolahSama] = await db
      .select({ id: sekolah.id })
      .from(sekolah)
      .where(sql`lower(${sekolah.nama}) = ${namaSekolah.toLowerCase()}`)
      .limit(1)
    if (sekolahSama) {
      return res.status(409).json({ error: 'Sekolah ini sudah terdaftar' })
    }

    const [usernameSama] = await db
      .select({ id: adminAkun.id })
      .from(adminAkun)
      .where(eq(adminAkun.username, username))
      .limit(1)
    if (usernameSama) {
      return res.status(409).json({ error: 'Username sudah dipakai' })
    }

    const [emailSama] = await db
      .select({ id: adminAkun.id })
      .from(adminAkun)
      .where(eq(adminAkun.email, email))
      .limit(1)
    if (emailSama) {
      return res.status(409).json({ error: 'Email sudah dipakai' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // transaksi: kalau salah satu gagal, dua-duanya dibatalkan
    const sekBaru = await db.transaction(async (tx) => {
      const [s] = await tx.insert(sekolah).values({ nama: namaSekolah }).returning()
      await tx.insert(adminAkun).values({
        sekolahId: s.id,
        peran: 'admin_sekolah',
        username,
        passwordHash,
        namaLengkap: 'Admin Perpustakaan',
        email,
        harusGantiPassword: true,
      })
      return s
    })

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil. Akun Anda menunggu persetujuan super admin.',
      sekolah: { id: sekBaru.id, nama: sekBaru.nama },
    })
  } catch (err) {
    // dua pendaftaran dengan data sama yang masuk bersamaan
    if ((err.cause?.code || err.code) === '23505') {
      return res.status(409).json({ error: 'Sekolah, username, atau email sudah terdaftar' })
    }
    console.error(err)
    res.status(500).json({ error: 'Gagal mendaftar' })
  }
})

// POST login guru
// Password awal guru = NIP mereka sendiri (di-hash saat guru dibuat di routes/guru.js).
// Token membawa klaim `hgp` (harus ganti password). Selama hgp = true, semua endpoint
// guru selain /guru/ganti-password ditolak dengan 403 (kode HARUS_GANTI_PASSWORD),
// jadi kewajiban ganti password ditegakkan di server, bukan hanya di frontend.
router.post('/guru/login', loginLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const nipBersih = String(body.nip ?? '').trim()
    const { password } = body
    if (!nipBersih || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'NIP dan password wajib diisi' })
    }

    const sek = await ambilSekolahAktif(body.sekolahId)
    if (!sek) return res.status(400).json({ error: 'Sekolah wajib dipilih' })

    const [guru] = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.sekolahId, sek.id), eq(anggota.nip, nipBersih), eq(anggota.peran, 'guru')))

    // selalu jalankan bcrypt (lihat HASH_PALSU di atas)
    const cocok = await bcrypt.compare(password, guru?.password || HASH_PALSU)

    // satu pesan untuk semua kegagalan, termasuk akun yang belum punya password,
    // supaya NIP yang terdaftar tidak bisa ditebak dari pesan errornya
    if (!guru || !guru.password || !cocok) {
      return res.status(401).json({ error: 'NIP atau password salah' })
    }

    const token = jwt.sign(
      { id: guru.id, nip: guru.nip, role: 'guru', hgp: !!guru.harusGantiPassword, sekolahId: guru.sekolahId },
      JWT_SECRET,
      SIGN_OPTS
    )

    res.json({
      token,
      role: 'guru',
      sekolah: { id: sek.id, nama: sek.nama, logoUrl: sek.logoUrl },
      nama: guru.nama,
      guru: {
        id: guru.id,
        nip: guru.nip,
        nama: guru.nama,
        mapel: guru.mapel,
        harusGantiPassword: guru.harusGantiPassword,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// POST daftar guru (self-register, langsung aktif)
router.post('/guru/daftar', daftarLimiter, async (req, res) => {
  try {
    const { nama, nip, mapel, tanggalLahir, password } = req.body || {}
    const sek = await ambilSekolahAktif(req.body?.sekolahId)
    if (!sek) return res.status(400).json({ error: 'Sekolah wajib dipilih' })

    const namaBersih = String(nama ?? '').trim()
    const nipBersih = String(nip ?? '').trim()
    const mapelBersih = String(mapel ?? '').trim()
    const passwordStr = String(password ?? '')

    if (!namaBersih) return res.status(400).json({ error: 'Nama wajib diisi' })
    if (!nipBersih) return res.status(400).json({ error: 'NIP wajib diisi' })
    const tgl = normalisasiTanggal(tanggalLahir)
    if (!tgl) {
      return res.status(400).json({ error: 'Tanggal lahir wajib diisi (format YYYY-MM-DD)' })
    }
    if (passwordStr.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' })
    }
    // bcrypt hanya membaca 72 byte pertama
    if (Buffer.byteLength(passwordStr) > 72) {
      return res.status(400).json({ error: 'Password terlalu panjang' })
    }
    if (passwordStr === nipBersih) {
  return res.status(400).json({ error: 'Password tidak boleh sama dengan NIP' })
    }
    // batas panjang, karena endpoint ini publik
    if (namaBersih.length > 100 || nipBersih.length > 50 || mapelBersih.length > 100) {
      return res.status(400).json({ error: 'Data terlalu panjang' })
    }

    const [nipSudahAda] = await db
      .select({ id: anggota.id })
      .from(anggota)
      .where(and(eq(anggota.sekolahId, sek.id), eq(anggota.nip, nipBersih)))
      .limit(1)

    if (nipSudahAda) {
      return res.status(409).json({ error: 'NIP ini sudah terdaftar. Silakan langsung login.' })
    }

    const passwordHash = await bcrypt.hash(passwordStr, 10)

    const [baru] = await db
      .insert(anggota)
      .values({
        sekolahId: sek.id,
        nama: namaBersih,
        nip: nipBersih,
        mapel: mapelBersih || null,
        tanggalLahir: tgl,
        kelas: null,
        peran: 'guru',
        password: passwordHash,
        harusGantiPassword: false, // password dipilih sendiri
      })
      .returning()

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil. Silakan login menggunakan NIP dan password Anda.',
      guru: { id: baru.id, nama: baru.nama, nip: baru.nip },
    })
  } catch (err) {
    if ((err.cause?.code || err.code) === '23505') {
      return res.status(409).json({ error: 'NIP ini sudah terdaftar. Silakan langsung login.' })
    }
    console.error('[DAFTAR GURU ERROR]', err)
    res.status(500).json({ error: 'Gagal mendaftar' })
  }
})

// POST lupa password guru
// Verifikasi identitas pakai NIP + Tanggal Lahir (bukan password lama,
// karena tujuannya memang untuk kondisi lupa password). Kalau cocok,
// password guru direset kembali ke NIP-nya sendiri (di-hash ulang) dan
// harusGantiPassword diset true, supaya guru dipaksa membuat password
// baru begitu berhasil login lagi.
//
// Catatan keamanan: NIP bukan rahasia, dan tanggal lahir bukan bukti yang kuat.
// Rate limiter dipasang di sini dan semua kegagalan memakai satu pesan yang sama.
// Untuk keamanan lebih tinggi, ganti alur ini dengan reset oleh admin.
router.post('/guru/lupa-password', loginLimiter, async (req, res) => {
  try {
    const body = req.body || {}
    const nipBersih = String(body.nip ?? '').trim()
    const tgl = normalisasiTanggal(body.tanggalLahir)
    if (!nipBersih || !tgl) {
      return res.status(400).json({ error: 'NIP dan tanggal lahir wajib diisi (format tanggal YYYY-MM-DD)' })
    }

    const sek = await ambilSekolahAktif(body.sekolahId)
    if (!sek) return res.status(400).json({ error: 'Sekolah wajib dipilih' })

    const [guru] = await db
      .select()
      .from(anggota)
      .where(and(eq(anggota.sekolahId, sek.id), eq(anggota.nip, nipBersih), eq(anggota.peran, 'guru')))

    // satu respons untuk semua kegagalan: NIP tidak ada, tanggal lahir belum diisi, atau salah
    if (!guru || normalisasiTanggal(guru.tanggalLahir) !== tgl) {
      return res.status(401).json({ error: 'NIP atau tanggal lahir tidak sesuai' })
    }

    const passwordBaruHash = await bcrypt.hash(nipBersih, 10)

    await db
      .update(anggota)
      .set({ password: passwordBaruHash, harusGantiPassword: true })
      .where(and(eq(anggota.id, guru.id), eq(anggota.sekolahId, sek.id)))

    res.json({
      success: true,
      message: 'Password berhasil direset. Silakan login kembali menggunakan NIP sebagai password.',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mereset password' })
  }
})

// Verifikasi token saja, tanpa cek peran. Dipakai wajibLogin dan wajibSuperAdmin.
function verifikasiToken(req, res, next) {
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
  // token lama (sebelum multi-sekolah) tidak punya sekolahId → paksa login ulang
  if (payload.role !== 'superadmin' && !Number.isInteger(payload.sekolahId)) {
    return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' })
  }
  req.user = payload
  // Alias lama, dipertahankan sementara. Hapus setelah `grep -rn "req\.admin" routes/` kosong.
  req.admin = payload
  next()
}

// Untuk semua endpoint data sekolah: semua peran KECUALI superadmin
function wajibLogin(req, res, next) {
  verifikasiToken(req, res, () => {
    if (req.user.role === 'superadmin') {
      return res.status(403).json({ error: 'Super admin tidak punya akses ke data sekolah' })
    }
    next()
  })
}

function buatWajibGuru({ izinkanHarusGanti = false } = {}) {
  return (req, res, next) => {
    wajibLogin(req, res, () => {
      if (req.user.role !== 'guru') {
        return res.status(403).json({ error: 'Endpoint ini khusus untuk guru' })
      }
      if (req.user.hgp && !izinkanHarusGanti) {
        return res.status(403).json({
          error: 'Anda harus mengganti password terlebih dahulu',
          kode: 'HARUS_GANTI_PASSWORD',
        })
      }
      next()
    })
  }
}
const wajibLoginGuru = buatWajibGuru()
const wajibLoginGuruBolehGanti = buatWajibGuru({ izinkanHarusGanti: true })

function wajibAdmin(req, res, next) {
  wajibLogin(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Endpoint ini khusus untuk admin' })
    }
    next()
  })
}


function wajibSuperAdmin(req, res, next) {
  verifikasiToken(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Endpoint ini khusus untuk super admin' })
    }
    next()
  })
}

// Untuk endpoint publik yang isinya bergantung sekolah:
// kalau ada token valid, req.user diisi; kalau tidak, lanjut tanpa user.
function opsionalLogin(req, res, next) {
  const h = req.headers.authorization
  if (h && h.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET, VERIFY_OPTS) } catch {}
  }
  next()
}

// POST ganti password guru
// Guru yang sedang login mengganti passwordnya sendiri.
// Dipanggil baik saat wajib ganti password pertama kali, maupun ganti
// password biasa di kemudian hari.
router.post('/guru/ganti-password', wajibLoginGuruBolehGanti, async (req, res) => {
  try {
    const { passwordBaru } = req.body || {}
    if (typeof passwordBaru !== 'string' || passwordBaru.length < 8 || Buffer.byteLength(passwordBaru) > 72) {
      return res.status(400).json({ error: 'Password baru harus 8–72 karakter' })
    }
    if (passwordBaru === String(req.user.nip)) {
      return res.status(400).json({ error: 'Password baru tidak boleh sama dengan NIP' })
    }

    const hash = await bcrypt.hash(passwordBaru, 10)
    await db
      .update(anggota)
      .set({ password: hash, harusGantiPassword: false })
      .where(and(eq(anggota.id, req.user.id), eq(anggota.sekolahId, req.user.sekolahId)))

    // token lama masih membawa hgp:true, jadi terbitkan token baru
    const token = jwt.sign(
      { id: req.user.id, nip: req.user.nip, role: 'guru', hgp: false, sekolahId: req.user.sekolahId },
      JWT_SECRET,
      SIGN_OPTS
    )
    res.json({ success: true, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal mengganti password' })
  }
})

module.exports = { router, wajibLogin, wajibLoginGuru, wajibLoginGuruBolehGanti, wajibAdmin, wajibSuperAdmin, opsionalLogin }