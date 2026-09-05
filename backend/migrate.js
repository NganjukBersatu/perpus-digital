require("dotenv").config({ path: __dirname + "/.env" })
const { drizzle } = require("drizzle-orm/node-postgres")
const { migrate } = require("drizzle-orm/node-postgres/migrator")
const { Pool } = require("pg")

async function main() {
  const pool = new Pool({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })

  const db = drizzle(pool)

  console.log("Menjalankan migrasi...")
  await migrate(db, { migrationsFolder: "./drizzle" })
  console.log("Migrasi selesai!")

  await pool.end()
}

main().catch((err) => {
  console.error("Migrasi gagal:", err)
  process.exit(1)
})