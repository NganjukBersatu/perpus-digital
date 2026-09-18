/**
 * backfill-password-guru.js
 *
 * Tujuan: memberi password awal (= NIP masing-masing, di-hash) kepada
 * guru-guru LAMA yang sudah terlanjur dibuat tanpa password (misalnya
 * lewat form "Data Guru" sebelum fitur auto-generate password diterapkan).
 *
 * Guru yang NIP-nya masih kosong akan DILEWATI dan ditampilkan di akhir,
 * karena tidak ada NIP yang bisa dijadikan password awal. Isi dulu NIP
 * mereka lewat halaman admin, lalu jalankan script ini lagi.
 *
 * Cara pakai:
 * 1. Simpan file ini di folder backend, misal: scripts/backfill-password-guru.js
 * 2. Jalankan dari terminal (di folder backend):
 *      node scripts/backfill-password-guru.js
 * 3. Cek hasilnya di output terminal, lalu verifikasi di database kalau perlu.
 */

require('dotenv').config()

const bcrypt = require('bcrypt')
const { db } = require('../db/client')      // <-- sesuaikan kalau path db kamu beda
const { anggota } = require('../db/schema') // <-- sesuaikan kalau path schema kamu beda
const { eq, and, isNull } = require('drizzle-orm')

async function backfillPasswordGuru() {
  // Ambil semua guru yang belum punya password
  const guruTanpaPassword = await db
    .select()
    .from(anggota)
    .where(and(eq(anggota.peran, 'guru'), isNull(anggota.password)))

  if (guruTanpaPassword.length === 0) {
    console.log('Semua guru sudah punya password. Tidak ada yang perlu diproses.')
    process.exit(0)
  }

  const diproses = []
  const dilewati = []

  for (const guru of guruTanpaPassword) {
    if (!guru.nip || !String(guru.nip).trim()) {
      dilewati.push(guru)
      continue
    }

    const nipBersih = String(guru.nip).trim()
    const passwordHash = await bcrypt.hash(nipBersih, 10)

    await db
      .update(anggota)
      .set({
        password: passwordHash,
        harusGantiPassword: true,
      })
      .where(eq(anggota.id, guru.id))

    diproses.push(guru)
  }

  console.log('== Selesai ==')
  console.log(`Berhasil diberi password (= NIP mereka): ${diproses.length} guru`)
  diproses.forEach((g) => console.log(`   - ${g.nama} (NIP: ${g.nip})`))

  if (dilewati.length > 0) {
    console.log('')
    console.log(`Dilewati karena NIP masih kosong: ${dilewati.length} guru`)
    dilewati.forEach((g) => console.log(`   - ${g.nama} (id: ${g.id}) — isi NIP dulu lewat halaman admin, lalu jalankan script ini lagi`))
  }

  process.exit(0)
}

backfillPasswordGuru().catch((err) => {
  console.error('Gagal menjalankan backfill password:', err)
  process.exit(1)
})