const { db } = require('../db/client')
const { sekolah } = require('../db/schema')
const { eq } = require('drizzle-orm')

async function ambilSekolahAktif(sekolahId) {
  const id = Number(sekolahId)
  if (!Number.isInteger(id)) return null
  const [s] = await db.select().from(sekolah).where(eq(sekolah.id, id)).limit(1)
  return s && s.aktif ? s : null
}

// Untuk endpoint publik: sekolah dari token kalau ada, kalau tidak dari ?sekolahId=
// Token bisa tersimpan di req.user (siswa/guru) atau req.admin (admin).
function sekolahIdDari(req) {
  const dariUser = req.user?.sekolahId
  const dariAdmin = req.admin?.sekolahId
  const dariQuery = req.query?.sekolahId
  const id = Number(dariUser ?? dariAdmin ?? dariQuery)
  return Number.isInteger(id) && id > 0 ? id : null
}

module.exports = { ambilSekolahAktif, sekolahIdDari }