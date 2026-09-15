require("dotenv").config()
const { db } = require("./db/client")
const { sql } = require("drizzle-orm")

async function tambahKolom() {
  await db.execute(sql`
    ALTER TABLE peminjaman
    ADD COLUMN IF NOT EXISTS jumlah_perpanjangan integer DEFAULT 0
  `)
  console.log("Kolom jumlah_perpanjangan berhasil ditambahkan (atau sudah ada).")
  process.exit(0)
}

tambahKolom().catch((err) => {
  console.error("Gagal menambah kolom:", err)
  process.exit(1)
})