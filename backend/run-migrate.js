const { drizzle } = require("drizzle-orm/node-postgres")
const { migrate } = require("drizzle-orm/node-postgres/migrator")
const { Pool } = require("pg")
require("dotenv").config()

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
  })

  const db = drizzle(pool)

  console.log("Menjalankan migration...")

  await migrate(db, { migrationsFolder: "./drizzle" })

  console.log("Migration selesai.")

  await pool.end()
}

main().catch((err) => {
  console.error("Migration gagal:", err)
  process.exit(1)
})