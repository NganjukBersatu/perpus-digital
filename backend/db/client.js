const { drizzle } = require('drizzle-orm/node-postgres')
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diset di environment')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// tangkap error pada koneksi idle supaya tidak mematikan seluruh proses
pool.on('error', (err) => {
  console.error('Kesalahan tak terduga pada koneksi database (idle client):', err)
})

const db = drizzle(pool)

async function closeDb() {
  await pool.end()
}

module.exports = { db, pool, closeDb }