const { pgTable, serial, varchar, integer, timestamp, date } = require("drizzle-orm/pg-core")

const buku = pgTable("buku", {
  id: serial("id").primaryKey(),
  judul: varchar("judul", { length: 255 }).notNull(),
  penulis: varchar("penulis", { length: 255 }),
  penerbit: varchar("penerbit", { length: 255 }),
  isbn: varchar("isbn", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
})

const eksemplarBuku = pgTable("eksemplar_buku", {
  id: serial("id").primaryKey(),
  bukuId: integer("buku_id").notNull().references(() => buku.id),
  barcode: varchar("barcode", { length: 50 }).unique().notNull(),
  status: varchar("status", { length: 20 }).default("tersedia"),
  createdAt: timestamp("created_at").defaultNow(),
})

const anggota = pgTable("anggota", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  kelas: varchar("kelas", { length: 50 }),
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
})

module.exports = { buku, eksemplarBuku, anggota, peminjaman }