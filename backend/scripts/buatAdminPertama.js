require('dotenv').config()
const bcrypt = require('bcrypt')
const { db } = require('../db/client')
const { adminAkun } = require('../db/schema')

async function main() {
  const username = 'admin.smeksaker'
  const passwordPolos = '1324354657'   // GANTI setelah dipakai pertama kali
  const passwordHash = await bcrypt.hash(passwordPolos, 10)

  const [akun] = await db
    .insert(adminAkun)
    .values({
      username,
      passwordHash,
      namaLengkap: 'Admin Perpustakaan',
      email: 'perpustakaan@smkn1kertosono.sch.id',
      jabatan: 'Pustakawan',
    })
    .returning()

  console.log('Akun admin dibuat:', akun.username)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})