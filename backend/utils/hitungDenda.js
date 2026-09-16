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