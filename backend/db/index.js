const { db, pool, closeDb } = require('./client')

// default export: db (supaya `const db = require('../db')` tetap jalan)
module.exports = db

// named export: db, pool & closeDb
module.exports.db = db
module.exports.pool = pool
module.exports.closeDb = closeDb