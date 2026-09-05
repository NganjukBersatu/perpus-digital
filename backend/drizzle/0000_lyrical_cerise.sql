CREATE TABLE "buku" (
	"id" serial PRIMARY KEY NOT NULL,
	"judul" varchar(255) NOT NULL,
	"penulis" varchar(255),
	"penerbit" varchar(255),
	"isbn" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eksemplar_buku" (
	"id" serial PRIMARY KEY NOT NULL,
	"buku_id" integer NOT NULL,
	"barcode" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'tersedia',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "eksemplar_buku_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "anggota" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(255) NOT NULL,
	"kelas" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "peminjaman" (
	"id" serial PRIMARY KEY NOT NULL,
	"eksemplar_id" integer NOT NULL,
	"anggota_id" integer NOT NULL,
	"tanggal_pinjam" date,
	"tanggal_kembali_rencana" date,
	"tanggal_kembali_aktual" date
);
--> statement-breakpoint
ALTER TABLE "eksemplar_buku" ADD CONSTRAINT "eksemplar_buku_buku_id_buku_id_fk" FOREIGN KEY ("buku_id") REFERENCES "public"."buku"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_eksemplar_id_eksemplar_buku_id_fk" FOREIGN KEY ("eksemplar_id") REFERENCES "public"."eksemplar_buku"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_anggota_id_anggota_id_fk" FOREIGN KEY ("anggota_id") REFERENCES "public"."anggota"("id") ON DELETE no action ON UPDATE no action;