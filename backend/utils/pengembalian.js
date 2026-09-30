const { eq, and, isNull } = require('drizzle-orm')
const { db } = require('../db/client')
const { peminjaman, eksemplarBuku, anggota } = require('../db/schema')
const { hitungDenda } = require('./hitungDenda')
const { tanggalHariIniLokal } = require('./tanggal')
const { ErrorBisnis } = require('./errorBisnis')

// anggotaId (opsional): kalau diisi, peminjaman harus milik anggota tsb.
async function prosesPengembalian(peminjamanId, { anggotaId } = {}) {
  return db.transaction(async (tx) => {
    const kondisi = [eq(peminjaman.id, peminjamanId)]
    if (anggotaId) kondisi.push(eq(peminjaman.anggotaId, anggotaId))

    const [row] = await tx
      .select({
        id: peminjaman.id,
        tanggalKembali: peminjaman.tanggalKembali,
        tanggalDikembalikan: peminjaman.tanggalDikembalikan,
        eksemplarId: peminjaman.eksemplarId,
        nominalDendaPerHari: peminjaman.nominalDendaPerHari,
        dendaMaksimal: peminjaman.dendaMaksimal,
        dendaGuruAktif: peminjaman.dendaGuruAktif,
        masaTenggang: peminjaman.masaTenggang,
        peran: anggota.peran,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .where(and(...kondisi))

    if (!row) throw new ErrorBisnis(404, 'Data peminjaman tidak ditemukan')
    if (row.tanggalDikembalikan) throw new ErrorBisnis(400, 'Buku ini sudah dikembalikan')

    const tanggalDikembalikan = tanggalHariIniLokal()
    const { denda } = hitungDenda({
      tanggalKembali: row.tanggalKembali,
      tanggalDikembalikan,
      peran: row.peran,
      pengaturanDenda: {
        aktif: (row.nominalDendaPerHari || 0) > 0,
        nominalPerHari: row.nominalDendaPerHari || 0,
        dendaMaksimal: row.dendaMaksimal || 0,
        dendaGuruAktif: row.dendaGuruAktif ?? false,
        masaTenggang: row.masaTenggang ?? 0,
      },
    })

    // guard isNull: kalau request lain sudah lebih dulu, baris ini tidak ikut ter-update
    const [updated] = await tx
      .update(peminjaman)
      .set({ tanggalDikembalikan, denda })
      .where(and(eq(peminjaman.id, row.id), isNull(peminjaman.tanggalDikembalikan)))
      .returning()
    if (!updated) throw new ErrorBisnis(400, 'Buku ini sudah dikembalikan')

    const [ek] = await tx
      .update(eksemplarBuku)
      .set({ status: 'tersedia' })
      .where(eq(eksemplarBuku.id, row.eksemplarId))
      .returning({ bukuId: eksemplarBuku.bukuId })

    return { updated, denda, bukuId: ek?.bukuId }
  })
}

module.exports = { prosesPengembalian }