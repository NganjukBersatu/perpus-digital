const { drizzle } = require('drizzle-orm/node-postgres')
const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'magangshinta',
  database: 'perpus_digital'
})

const db = drizzle(pool)

module.exports = { db, pool }