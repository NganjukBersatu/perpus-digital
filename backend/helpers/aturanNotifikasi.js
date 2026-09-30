// helpers/aturanNotifikasi.js

const defaultAturan = {
  pengingatJatuhTempo: true,
  hariSebelumJatuhTempo: 1,
  notifikasiTerlambat: true,
  notifikasiJatuhTempoHariIni: true,
}

const { db } = require('../db/client')
const { ambilPengaturanNotifikasi } = require('../utils/hitungDenda')

async function ambilAturanNotifikasi() {
  try {
    const dariDb = await ambilPengaturanNotifikasi(db)
    return {
      pengingatJatuhTempo: dariDb.pengingatJatuhTempo ?? defaultAturan.pengingatJatuhTempo,
      hariSebelumJatuhTempo: dariDb.hariSebelumJatuhTempo ?? defaultAturan.hariSebelumJatuhTempo,
      notifikasiTerlambat: dariDb.notifikasiTerlambat ?? defaultAturan.notifikasiTerlambat,
      notifikasiJatuhTempoHariIni: dariDb.notifikasiJatuhTempoHariIni ?? defaultAturan.notifikasiJatuhTempoHariIni,
    }
  } catch (err) {
    console.error('Gagal ambil aturan notifikasi, pakai default:', err)
    return { ...defaultAturan }
  }
}

function bangunNotifikasiPinjaman(item, aturan, opsi = {}) {
  const sekarang = new Date()
  sekarang.setHours(0, 0, 0, 0)

  const jatuhTempo = new Date(item.tanggalKembali)
  jatuhTempo.setHours(0, 0, 0, 0)

  const selisihHari = Math.round((jatuhTempo - sekarang) / (1000 * 60 * 60 * 24))
  const masaTenggang = item.masaTenggang || 0
  const hariTerlambatEfektif = -selisihHari - masaTenggang
  const hasil = []

  const dendaBerlaku = opsi.dendaBerlaku !== false
  const hariPengingat = Math.max(0, Number(aturan.hariSebelumJatuhTempo) || 0)

  if (selisihHari < 0 && hariTerlambatEfektif > 0 && aturan.notifikasiTerlambat) {
    let pesan = `"${item.judul}" terlambat ${hariTerlambatEfektif} hari`

    if (dendaBerlaku) {
      let estimasi = hariTerlambatEfektif * (item.nominalDendaPerHari || 0)
      if (item.dendaMaksimal > 0 && estimasi > item.dendaMaksimal) {
        estimasi = item.dendaMaksimal
      }
      if (estimasi > 0) {
        pesan += `. Estimasi denda Rp${estimasi.toLocaleString('id-ID')}`
      }
    }

    hasil.push({
      id: `terlambat-${item.id}`,
      tipe: 'terlambat',                   
      judul: 'Buku terlambat dikembalikan',
      pesan
    })
  } else if (selisihHari < 0 && hariTerlambatEfektif <= 0 && aturan.pengingatJatuhTempo) {
    hasil.push({
      id: `tenggang-${item.id}`,
      tipe: 'jatuh_tempo',
      judul: 'Masih dalam masa tenggang',
      pesan: `"${item.judul}" sudah lewat jatuh tempo, segera kembalikan sebelum masa tenggang habis`,
    })
  } else if (selisihHari === 0 && aturan.notifikasiJatuhTempoHariIni && aturan.pengingatJatuhTempo) {
    hasil.push({
      id: `hari-ini-${item.id}`,
      tipe: 'jatuh_tempo',
      judul: 'Jatuh tempo hari ini',
      pesan: `"${item.judul}" harus dikembalikan hari ini`,
    })
  } else if (
    selisihHari > 0 &&
    selisihHari <= hariPengingat &&
    aturan.pengingatJatuhTempo
  ) {
    hasil.push({
      id: `jatuh-tempo-${item.id}`,
      tipe: 'jatuh_tempo',
      judul: 'Buku hampir jatuh tempo',
      pesan: `"${item.judul}" jatuh tempo dalam ${selisihHari} hari`,
    })
  }

  return hasil
}

module.exports = { ambilAturanNotifikasi, bangunNotifikasiPinjaman }