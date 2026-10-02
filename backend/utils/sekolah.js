const { db } = require('../db/client')
const { sekolah } = require('../db/schema')
const { eq } = require('drizzle-orm')

async function ambilSekolahAktif(sekolahId) {
  const id = Number(sekolahId)
  if (!Number.isInteger(id)) return null
  const [s] = await db.select().from(sekolah).where(eq(sekolah.id, id)).limit(1)
  return s && s.aktif && s.status === 'aktif' ? s : null
}

// Untuk endpoint publik: sekolah dari token kalau ada, kalau tidak dari ?sekolahId=
function sekolahIdDari(req) {
  const id = Number(req.user?.sekolahId ?? req.query.sekolahId)
  return Number.isInteger(id) && id > 0 ? id : null
}

module.exports = { ambilSekolahAktif, sekolahIdDari }