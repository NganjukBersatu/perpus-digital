const path = require("path")
require("dotenv").config({ path: __dirname + "/.env" })
const { Pool } = require("pg")
const crypto = require("crypto")
const fs = require("fs")

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  // 1. Pastikan schema & tabel pencatatan migrasi ada
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `)

  // 2. Baca daftar migrasi dari journal
  const journalPath = path.join(__dirname, "drizzle", "meta", "_journal.json")
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"))

  // 3. Cek hash yang sudah tercatat, biar tidak dobel
  const existing = await pool.query(`SELECT hash FROM drizzle.__drizzle_migrations`)
  const existingHashes = new Set(existing.rows.map((r) => r.hash))

  // 4. Tandai SEMUA migrasi KECUALI yang paling baru (migrasi terakhir akan
  //    dijalankan sungguhan lewat migrate.js setelah ini)
  const entriesToMark = journal.entries.slice(0, -1)

  for (const entry of entriesToMark) {
    const sqlPath = path.join(__dirname, "drizzle", `${entry.tag}.sql`)
    const sqlContent = fs.readFileSync(sqlPath, "utf-8")
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex")

    if (existingHashes.has(hash)) {
      console.log(`${entry.tag} sudah tercatat, dilewati`)
      continue
    }

    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when]
    )
    console.log(`${entry.tag} ditandai selesai`)
  }

  console.log("Selesai menandai migrasi lama.")
  await pool.end()
}

main().catch((err) => {
  console.error("Gagal menandai migrasi:", err)
  process.exit(1)
})