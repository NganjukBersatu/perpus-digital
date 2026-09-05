require("dotenv").config({ path: __dirname + "/../.env" })
const { drizzle } = require("drizzle-orm/node-postgres")
const { Pool } = require("pg")

const pool = new Pool({
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const db = drizzle(pool)

module.exports = { db, pool }