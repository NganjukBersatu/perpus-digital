/**
 * Cara pakai:
 * 1. Isi bagian "DATA GURU BARU" di bawah ini sesuai kebutuhan.
 * 2. Simpan file ini di folder backend, misal: scripts/tambah-guru.js
 * 3. Jalankan dari terminal (di folder backend):
 *      node scripts/tambah-guru.js
 * 4. Setelah sukses, cek dengan: SELECT * FROM anggota;
 */

require('dotenv').config()

const bcrypt = require('bcrypt')
const { db } = require('../db/client')      // <-- sesuaikan kalau path db kamu beda
const { anggota } = require('../db/schema') // <-- sesuaikan kalau path schema kamu beda

async function tambahGuru() {
  // ======================================
  // DATA GURU BARU — GANTI SESUAI KEBUTUHAN
  // ======================================
  const nama = 'Moh. Sigit Nuryakin'
  const nip = '197210052008011012'
  const passwordAsli = 'guru12345' // ini password yang nanti dipakai guru untuk login
  const mapel = 'Matematika'
  // ======================================

  const passwordHash = await bcrypt.hash(passwordAsli, 10)

  await db.insert(anggota).values({
    nama,
    nip,
    password: passwordHash,
    mapel,
    peran: 'guru',
  })

  console.log('✅ Berhasil menambahkan guru:', nama)
  console.log('   NIP     :', nip)
  console.log('   Password:', passwordAsli, '(ini yang dipakai untuk login, sudah disimpan dalam bentuk hash di database)')
  process.exit(0)
}

tambahGuru().catch((err) => {
  console.error('❌ Gagal menambahkan guru:', err)
  process.exit(1)
})