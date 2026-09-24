const REGEX_TANGGAL = /^\d{4}-\d{2}-\d{2}$/

// Mengembalikan 'YYYY-MM-DD' kalau valid, selain itu null.
// Menerima string ATAU objek Date (tergantung mode kolom date di schema).
function normalisasiTanggal(v) {
  if (v === undefined || v === null || v === '') return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${v.getFullYear()}-${m}-${d}`
  }
  const s = String(v).slice(0, 10)
  if (!REGEX_TANGGAL.test(s)) return null
  const d = new Date(s + 'T00:00:00Z')
  // tolak tanggal yang "meluber", mis. 2026-02-31
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s
}

// Escape karakter wildcard LIKE (% _ \) dari input pengguna
function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, '\\$&')
}

module.exports = { normalisasiTanggal, escapeLike }