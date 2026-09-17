const {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  date,
  text,
  jsonb,
  boolean,
  index,
} = require("drizzle-orm/pg-core")

// ============================================================
// 1. TABEL YANG TIDAK PUNYA FK (didefinisikan paling atas)
// ============================================================

const adminAkun = pgTable("admin_akun", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  namaLengkap: varchar("nama_lengkap", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  telepon: varchar("telepon", { length: 20 }),
  jabatan: varchar("jabatan", { length: 100 }),
  nipNik: varchar("nip_nik", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
})

const pengaturanPerpustakaan = pgTable("pengaturan_perpustakaan", {
  id: serial("id").primaryKey(),
  namaSekolah: varchar("nama_sekolah", { length: 255 }).notNull().default(""),
  namaPerpustakaan: varchar("nama_perpustakaan", { length: 255 }).notNull().default(""),
  alamat: text("alamat"),
  detail: jsonb("detail"),
  updatedAt: timestamp("updated_at").defaultNow(),
})

const kategori = pgTable("kategori", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 100 }).unique().notNull(),
  deskripsi: text("deskripsi"),
  createdAt: timestamp("created_at").defaultNow(),
})

const kelas = pgTable("kelas", {
  id: serial("id").primaryKey(),
  namaKelas: varchar("nama_kelas", { length: 50 }).unique().notNull(),
})

const anggota = pgTable("anggota", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  kelas: varchar("kelas", { length: 50 }),

  // Untuk Siswa
  nis: varchar("nis", { length: 30 }).unique(),
  tanggalLahir: date("tanggal_lahir"),

  // Untuk Guru
  nip: varchar("nip", { length: 50 }).unique(),
  password: varchar("password", { length: 255 }),

  mapel: varchar("mapel", { length: 100 }),
  peran: varchar("peran", { length: 20 }).notNull().default("siswa"), // siswa | guru | admin
}, (table) => ({
  peranIdx: index("anggota_peran_idx").on(table.peran),
  namaIdx: index("anggota_nama_idx").on(table.nama),
}))

// ============================================================
// 2. TABEL YANG PUNYA FK
// ============================================================

// ⚠️ `kategoriId` -> kategori.id : kalau kategori dihapus, buku tetap ada
//    (kategori jadi null) supaya koleksi buku tidak ikut hilang.
const buku = pgTable("buku", {
  id: serial("id").primaryKey(),
  judul: varchar("judul", { length: 255 }).notNull(),
  penulis: varchar("penulis", { length: 255 }),
  penerbit: varchar("penerbit", { length: 255 }),
  isbn: varchar("isbn", { length: 20 }),
  kategoriId: integer("kategori_id").references(() => kategori.id, {
    onDelete: "set null",
  }),
  stok: integer("stok").notNull().default(0),
  tersedia: integer("tersedia").default(0),
  lokasi: varchar("lokasi", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Tersedia"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  kategoriIdIdx: index("buku_kategori_id_idx").on(table.kategoriId),
  judulIdx: index("buku_judul_idx").on(table.judul),
  isbnIdx: index("buku_isbn_idx").on(table.isbn),
}))

// ⚠️ `bukuId` -> buku.id : CASCADE.
//    Kalau buku dihapus, semua eksemplarnya ikut terhapus otomatis.
const eksemplarBuku = pgTable("eksemplar_buku", {
  id: serial("id").primaryKey(),
  bukuId: integer("buku_id")
    .notNull()
    .references(() => buku.id, { onDelete: "cascade" }),
  barcode: varchar("barcode", { length: 50 }).unique().notNull(),
  status: varchar("status", { length: 20 }).default("tersedia"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bukuIdIdx: index("eksemplar_buku_buku_id_idx").on(table.bukuId),
  statusIdx: index("eksemplar_buku_status_idx").on(table.status),
}))

// ⚠️ `eksemplarId` & `anggotaId` -> RESTRICT.
//    Tujuannya melindungi riwayat peminjaman: eksemplar atau anggota
//    yang punya riwayat peminjaman TIDAK BISA dihapus sembarangan.
const peminjaman = pgTable("peminjaman", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 255 }),
  kelas: varchar("kelas", { length: 50 }),
  eksemplarId: integer("eksemplar_id")
    .notNull()
    .references(() => eksemplarBuku.id, { onDelete: "restrict" }),
  anggotaId: integer("anggota_id")
    .notNull()
    .references(() => anggota.id, { onDelete: "restrict" }),
  tanggalPinjam: date("tanggal_pinjam"),
  tanggalKembali: date("tanggal_kembali"),
  tanggalDikembalikan: date("tanggal_dikembalikan"),
  denda: integer("denda").default(0),
  statusDenda: varchar("status_denda", { length: 20 }).default("belum_dibayar"),
  tanggalBayarDenda: date("tanggal_bayar_denda"),
  nominalDendaPerHari: integer("nominal_denda_per_hari").default(0),
  dendaMaksimal: integer("denda_maksimal").default(0),
  dendaGuruAktif: boolean("denda_guru_aktif").default(false),
  masaTenggang: integer("masa_tenggang").default(0),
  jumlahPerpanjangan: integer("jumlah_perpanjangan").default(0),
}, (table) => ({
  eksemplarIdIdx: index("peminjaman_eksemplar_id_idx").on(table.eksemplarId),
  anggotaIdIdx: index("peminjaman_anggota_id_idx").on(table.anggotaId),
  tanggalPinjamIdx: index("peminjaman_tanggal_pinjam_idx").on(table.tanggalPinjam),
  tanggalKembaliIdx: index("peminjaman_tanggal_kembali_idx").on(table.tanggalKembali),
  tanggalDikembalikanIdx: index("peminjaman_tanggal_dikembalikan_idx").on(table.tanggalDikembalikan),
}))

module.exports = {
  adminAkun,
  pengaturanPerpustakaan,
  kategori,
  kelas,
  anggota,
  buku,
  eksemplarBuku,
  peminjaman,
}