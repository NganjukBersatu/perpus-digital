const { pengaturanPerpustakaan } = require('../db/schema')

// Nilai default dipakai kalau baris pengaturan belum ada di DB,
// atau kalau sub-objeknya (peminjaman/denda/notifikasi) belum pernah disimpan.
const DEFAULT_PEMINJAMAN = {
  durasiSiswa: 7,
  durasiGuru: 14,
  maxBukuSiswa: 2,
  maxBukuGuru: 5,
  minStokPinjam: 1,
  bolehPerpanjang: true,
  maxPerpanjang: 1,
  durasiPerpanjang: 7,
}

const DEFAULT_DENDA = {
  aktif: true,
  dendaGuruAktif: false,
  masaTenggang: 0,
  nominalPerHari: 1000,
  nominalPerHariSiswa: 1000,
  nominalPerHariGuru: 1000,
  dendaMaksimal: 50000,
  dendaMaksimalSiswa: 50000,
  dendaMaksimalGuru: 50000,
}

const DEFAULT_NOTIFIKASI = {
  notifikasiTerlambat: true,
  notifikasiJatuhTempoHariIni: true,
  pengingatJatuhTempo: true,
  hariSebelumJatuhTempo: 1,
}

async function ambilBarisPengaturan(db) {
  const [data] = await db.select().from(pengaturanPerpustakaan).limit(1)
  return data?.detail || {}
}

async function ambilPengaturanPeminjaman(db) {
  const detail = await ambilBarisPengaturan(db)
  return { ...DEFAULT_PEMINJAMAN, ...(detail.peminjaman || {}) }
}

async function ambilPengaturanDenda(db) {
  const detail = await ambilBarisPengaturan(db)
  return { ...DEFAULT_DENDA, ...(detail.denda || {}) }
}

async function ambilPengaturanNotifikasi(db) {
  const detail = await ambilBarisPengaturan(db)
  return { ...DEFAULT_NOTIFIKASI, ...(detail.notifikasi || {}) }
}

function hitungDenda({ tanggalKembali, tanggalDikembalikan, peran, pengaturanDenda }) {
  const batas = new Date(tanggalKembali)
  const kembali = new Date(tanggalDikembalikan)
  batas.setHours(0, 0, 0, 0)
  kembali.setHours(0, 0, 0, 0)

  const selisihHari = Math.round((kembali - batas) / 86400000)
  const hariTerlambat = Math.max(0, selisihHari)
  const hariKenaDenda = Math.max(0, hariTerlambat - (pengaturanDenda.masaTenggang || 0))

  const bolehDihitung =
    pengaturanDenda.aktif && (peran !== 'guru' || pengaturanDenda.dendaGuruAktif)

  // Support kedua format (yang dari snapshot & yang dari pengaturan)
  const nominalPerHari =
    peran === 'guru'
      ? (pengaturanDenda.nominalPerHariGuru ?? pengaturanDenda.nominalPerHari ?? 0)
      : (pengaturanDenda.nominalPerHariSiswa ?? pengaturanDenda.nominalPerHari ?? 0)

  const dendaMaksimal =
    peran === 'guru'
      ? (pengaturanDenda.dendaMaksimalGuru ?? pengaturanDenda.dendaMaksimal ?? 0)
      : (pengaturanDenda.dendaMaksimalSiswa ?? pengaturanDenda.dendaMaksimal ?? 0)

  let denda = 0
  if (bolehDihitung && hariKenaDenda > 0) {
    denda = hariKenaDenda * (nominalPerHari || 0)
    if (dendaMaksimal > 0) {
      denda = Math.min(denda, dendaMaksimal)
    }
  }

  return { denda, hariTerlambat }
}

module.exports = {
  hitungDenda,
  ambilPengaturanPeminjaman,
  ambilPengaturanDenda,
  ambilPengaturanNotifikasi,
}