const { pengaturanPerpustakaan } = require('../db/schema')

const DEFAULT_DENDA = {
  aktif: true,
  nominalPerHari: 1000,
  dendaMaksimal: 50000,
  masaTenggang: 0,
  dendaGuruAktif: false,
}

// Ambil pengaturan denda TERBARU langsung dari DB (bukan cache),
// supaya begitu admin ganti nominal di halaman Pengaturan, langsung kepakai.
async function ambilPengaturanDenda(db) {
  const [row] = await db.select().from(pengaturanPerpustakaan).limit(1)
  return { ...DEFAULT_DENDA, ...(row?.detail?.denda || {}) }
}

// peran: 'siswa' | 'guru' -> dipakai untuk cek toggle "Terapkan denda untuk guru"
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

  let denda = 0
  if (bolehDihitung && hariKenaDenda > 0) {
    denda = hariKenaDenda * (pengaturanDenda.nominalPerHari || 0)
    if (pengaturanDenda.dendaMaksimal > 0) {
      denda = Math.min(denda, pengaturanDenda.dendaMaksimal)
    }
  }

  return { denda, hariTerlambat }
}

const DEFAULT_NOTIFIKASI = {
  pengingatJatuhTempo: true,
  hariSebelumJatuhTempo: 1,
  notifikasiTerlambat: true,
  notifikasiJatuhTempoHariIni: true,
}

async function ambilPengaturanNotifikasi(db) {
  const [row] = await db.select().from(pengaturanPerpustakaan).limit(1)
  return { ...DEFAULT_NOTIFIKASI, ...(row?.detail?.notifikasi || {}) }
}

module.exports = { ambilPengaturanDenda, hitungDenda, ambilPengaturanNotifikasi }