// Format tanggal HARI INI berdasarkan waktu LOKAL (bukan UTC),
// supaya tidak mundur 1 hari di zona waktu WIB/WITA/WIT saat dikonversi ISO string.
function tanggalHariIniLokal() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

module.exports = { tanggalHariIniLokal }