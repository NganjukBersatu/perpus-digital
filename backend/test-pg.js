require("dotenv").config({ path: __dirname + "/.env" })
const { Pool } = require("pg")

const pool = new Pool({
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

console.log("Mencoba connect...")

pool.query("SELECT NOW()")
  .then((res) => {
    console.log("BERHASIL connect! Waktu server:", res.rows[0].now)
    pool.end()
  })
  .catch((err) => {
    console.error("GAGAL connect:", err.message)
    pool.end()
  })