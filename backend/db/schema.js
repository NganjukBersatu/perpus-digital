const { pgTable, serial, varchar, integer, timestamp, date, text, jsonb, boolean } = require("drizzle-orm/pg-core")

const adminAkun = pgTable('admin_akun', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  namaLengkap: varchar('nama_lengkap', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  telepon: varchar('telepon', { length: 20 }),
  jabatan: varchar('jabatan', { length: 100 }),
  nipNik: varchar('nip_nik', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
})

const pengaturanPerpustakaan = pgTable('pengaturan_perpustakaan', {
  id: serial('id').primaryKey(),
  namaSekolah: varchar('nama_sekolah', { length: 255 }).notNull().default(''),
  namaPerpustakaan: varchar('nama_perpustakaan', { length: 255 }).notNull().default(''),
  alamat: text('alamat'),
  detail: jsonb('detail'),
  updatedAt: timestamp('updated_at').defaultNow(),
})

const buku = pgTable("buku", {
  id: serial("id").primaryKey(),
  judul: varchar("judul", { length: 255 }).notNull(),
  penulis: varchar("penulis", { length: 255 }),
  penerbit: varchar("penerbit", { length: 255 }),
  isbn: varchar("isbn", { length: 20 }),
  kategoriId: integer("kategori_id").references(() => kategori.id),
  tersedia: integer("tersedia").default(0),
  lokasi: varchar("lokasi", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Tersedia"),
  createdAt: timestamp("created_at").defaultNow(),
  stok: integer('stok').notNull().default(0),
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
  statusDenda: varchar("status_denda", { length: 20 }).default("belum_dibayar"),
  tanggalBayarDenda: date("tanggal_bayar_denda"),
  nominalDendaPerHari: integer("nominal_denda_per_hari").default(0),
  dendaMaksimal: integer("denda_maksimal").default(0),
  dendaGuruAktif: boolean("denda_guru_aktif").default(false),
  masaTenggang: integer("masa_tenggang").default(0),
})

const kategori = pgTable("kategori", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 100 }).unique().notNull(),
  deskripsi: text("deskripsi"),
  createdAt: timestamp("created_at").defaultNow(),
})

module.exports = { adminAkun, pengaturanPerpustakaan, buku, eksemplarBuku, anggota, peminjaman, kelas, kategori }