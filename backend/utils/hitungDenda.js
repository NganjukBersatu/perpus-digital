const { pengaturanPerpustakaan } = require("../db/schema")

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

async function ambilPengaturanDenda(db) {
  const [data] = await db.select().from(pengaturanPerpustakaan).limit(1)
  const d = data?.detail?.denda || {}

  return {
    aktif: d.aktif ?? true,
    nominalPerHariSiswa: d.nominalPerHariSiswa ?? 1000,
    nominalPerHariGuru: d.nominalPerHariGuru ?? 1000,
    dendaMaksimalSiswa: d.dendaMaksimalSiswa ?? 50000,
    dendaMaksimalGuru: d.dendaMaksimalGuru ?? 50000,
    masaTenggang: d.masaTenggang ?? 0,
    dendaGuruAktif: d.dendaGuruAktif ?? false,
  }
}

async function ambilPengaturanPeminjaman(db) {
  const [data] = await db.select().from(pengaturanPerpustakaan).limit(1)
  const p = data?.detail?.peminjaman || {}

  return {
    durasiSiswa: p.durasiSiswa ?? 7,
    durasiGuru: p.durasiGuru ?? 14,
    maxBukuSiswa: p.maxBukuSiswa ?? 2,
    maxBukuGuru: p.maxBukuGuru ?? 5,
    bolehPerpanjang: p.bolehPerpanjang ?? true,
    maxPerpanjang: p.maxPerpanjang ?? 1,
    durasiPerpanjang: p.durasiPerpanjang ?? 7,
    minStokPinjam: p.minStokPinjam ?? 1,
  }
}

async function ambilPengaturanNotifikasi(db) {
  const [data] = await db.select().from(pengaturanPerpustakaan).limit(1)
  const n = data?.detail?.notifikasi || {}

  return {
    pengingatJatuhTempo: n.pengingatJatuhTempo ?? true,
    hariSebelumJatuhTempo: n.hariSebelumJatuhTempo ?? 1,
    notifikasiTerlambat: n.notifikasiTerlambat ?? true,
    notifikasiJatuhTempoHariIni: n.notifikasiJatuhTempoHariIni ?? true,
  }
}

module.exports = {
  hitungDenda,
  ambilPengaturanDenda,
  ambilPengaturanNotifikasi,
  ambilPengaturanPeminjaman,
}