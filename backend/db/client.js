const { drizzle } = require('drizzle-orm/node-postgres')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// tambahan: tangkap error pada koneksi idle supaya tidak mematikan seluruh proses
pool.on('error', (err) => {
  console.error('Kesalahan tak terduga pada koneksi database (idle client):', err)
})

const db = drizzle(pool)

module.exports = { db, pool }