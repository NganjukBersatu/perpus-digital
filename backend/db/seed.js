const { drizzle } = require("drizzle-orm/node-postgres")
const { Pool } = require("pg")
const { kelas } = require("./schema")
require("dotenv").config()

async function seedKelas() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
  })

  const db = drizzle(pool)

  await db.insert(kelas).values([
    { namaKelas: "X RPL 1" },
    { namaKelas: "X RPL 2" },
    { namaKelas: "X KULINER 1" },
    { namaKelas: "X KULINER 2" },
    { namaKelas: "X LISTRIK 1" },
    { namaKelas: "X LISTRIK 2" },
    { namaKelas: "X MESIN 1" },
    { namaKelas: "X MESIN 2" },
    { namaKelas: "X TOI" },
    { namaKelas: "X PEMANAS 1" },
    { namaKelas: "X DPB 1" },
    { namaKelas: "X DPB 2" },
    { namaKelas: "XI RPL 1" },
    { namaKelas: "XI RPL 2" },
    { namaKelas: "XI KULINER 1" },
    { namaKelas: "XI KULINER 2" },
    { namaKelas: "XI LISTRIK 1" },
    { namaKelas: "XI LISTRIK 2" },
    { namaKelas: "XI MESIN 1" },
    { namaKelas: "XI MESIN 2" },
    { namaKelas: "XI TOI" },
    { namaKelas: "XI DPB 1" },
    { namaKelas: "XI DPB 2" },
    { namaKelas: "XII RPL 1" },
    { namaKelas: "XII RPL 2" },
    { namaKelas: "XII KULINER 1" },
    { namaKelas: "XII KULINER 2" },
    { namaKelas: "XII KULINER 3" },
    { namaKelas: "XII LISTRIK 1" },
    { namaKelas: "XII LISTRIK 2" },
    { namaKelas: "XII MESIN 1" },
    { namaKelas: "XII MESIN 2" },
    { namaKelas: "XII MESIN 3" },
    { namaKelas: "XII TOI" },
    { namaKelas: "XII DPB 1" },
    { namaKelas: "XII DPB 2" },
  ])

  console.log("Seed kelas selesai")
  await pool.end()
}

seedKelas().catch((err) => {
  console.error("Seed gagal:", err)
  process.exit(1)
})