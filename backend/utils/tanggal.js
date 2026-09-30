// Tanggal HARI INI di WIB (Asia/Jakarta), apa pun zona waktu mesin servernya.
// Format 'en-CA' menghasilkan YYYY-MM-DD.
function tanggalHariIniLokal() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

module.exports = { tanggalHariIniLokal }