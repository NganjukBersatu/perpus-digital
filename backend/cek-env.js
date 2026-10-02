require("dotenv").config({ override: true })
console.log("DATABASE_URL =", process.env.DATABASE_URL)
console.log("JWT_SECRET ada? =", !!process.env.JWT_SECRET)