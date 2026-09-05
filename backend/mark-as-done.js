require("dotenv").config({ path: __dirname + "/.env" })
const { Pool } = require("pg")
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

async function main() {
  const pool = new Pool({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })

  // 1. Buat schema & tabel pencatatan migrasi kalau belum ada
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `)

  // 2. Baca journal buat tau migrasi mana yang mau ditandai selesai
  const journalPath = path.join(__dirname, "drizzle", "meta", "_journal.json")
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"))

  // 3. Tandai HANYA migrasi 0000 sebagai selesai (karena itu yang tabelnya udah ada manual)
  const entry0000 = journal.entries.find((e) => e.tag.startsWith("0000"))
  const sqlPath = path.join(__dirname, "drizzle", `${entry0000.tag}.sql`)
  const sqlContent = fs.readFileSync(sqlPath, "utf-8")
  const hash = crypto.createHash("sha256").update(sqlContent).digest("hex")

  await pool.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
    [hash, entry0000.when]
  )

  console.log(`Migrasi ${entry0000.tag} berhasil ditandai selesai.`)
  await pool.end()
}

main().catch((err) => {
  console.error("Gagal menandai migrasi:", err)
  process.exit(1)
})