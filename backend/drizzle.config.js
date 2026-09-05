require("dotenv").config({ path: __dirname + "/.env" })
const { defineConfig } = require("drizzle-kit")

module.exports = defineConfig({
  schema: "./db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
})