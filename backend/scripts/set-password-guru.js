const bcrypt = require('bcrypt')

require('dotenv').config()

const { db } = require('../db/client')
const { anggota } = require('../db/schema')
const { eq } = require('drizzle-orm')

async function run() {
  const nip = '03892784'
  const passwordBaru = '87654321'

  const hash = await bcrypt.hash(passwordBaru, 10)

  await db.update(anggota)
    .set({ password: hash })
    .where(eq(anggota.nip, nip))

  console.log('Password guru berhasil diset')
  process.exit(0)
}

run()