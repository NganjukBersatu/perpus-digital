const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })
// kalau .env ada di folder backend (satu level di atas folder db)

const { drizzle } = require("drizzle-orm/node-postgres")
const { Pool } = require("pg")

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
})

const db = drizzle(pool)

module.exports = { db, pool }