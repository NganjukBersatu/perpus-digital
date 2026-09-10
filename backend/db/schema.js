const { pgTable, serial, varchar, integer, timestamp, date, text } = require("drizzle-orm/pg-core")

const buku = pgTable("buku", {
  id: serial("id").primaryKey(),
  judul: varchar("judul", { length: 255 }).notNull(),
  penulis: varchar("penulis", { length: 255 }),
  penerbit: varchar("penerbit", { length: 255 }),
  isbn: varchar("isbn", { length: 20 }),
  kategoriId: integer("kategori_id").references(() => kategori.id),
  stok: integer("stok").default(0),
  tersedia: integer("tersedia").default(0),
  lokasi: varchar("lokasi", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Tersedia"),
  createdAt: timestamp("created_at").defaultNow(),
})

const eksemplarBuku = pgTable("eksemplar_buku", {
  id: serial("id").primaryKey(),
  bukuId: integer("buku_id").notNull().references(() => buku.id),
  barcode: varchar("barcode", { length: 50 }).unique().notNull(),
  status: varchar("status", { length: 20 }).default("tersedia"),
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

  // Untuk Guru & Admin
  nip: varchar("nip", { length: 50 }).unique(),
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: text("password_hash"),   // penting!
  
  mapel: varchar("mapel", { length: 100 }),
  peran: varchar("peran", { length: 20 }).notNull().default("siswa"), // siswa | guru | admin
})

const peminjaman = pgTable("peminjaman", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 255 }),
  kelas: varchar("kelas", { length: 50 }),
  eksemplarId: integer("eksemplar_id").notNull().references(() => eksemplarBuku.id),
  anggotaId: integer("anggota_id").notNull().references(() => anggota.id),
  tanggalPinjam: date("tanggal_pinjam"),
  tanggalKembali: date("tanggal_kembali"),
  tanggalDikembalikan: date("tanggal_dikembalikan"),
  denda: integer("denda").default(0),
  statusDenda: varchar("status_denda", { length: 20 }).default("belum_dibayar"), // BARU
  tanggalBayarDenda: date("tanggal_bayar_denda"), // BARU
})

const kategori = pgTable("kategori", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 100 }).unique().notNull(),
  deskripsi: text("deskripsi"),
  createdAt: timestamp("created_at").defaultNow(),
})

module.exports = { buku, eksemplarBuku, anggota, peminjaman, kelas, kategori }