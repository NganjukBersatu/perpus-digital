CREATE TABLE IF NOT EXISTS "admin_akun" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"nama_lengkap" varchar(255) NOT NULL,
	"email" varchar(255),
	"telepon" varchar(20),
	"jabatan" varchar(100),
	"nip_nik" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_akun_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pengaturan_perpustakaan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_sekolah" varchar(255) DEFAULT '' NOT NULL,
	"nama_perpustakaan" varchar(255) DEFAULT '' NOT NULL,
	"alamat" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kategori" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	"deskripsi" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "kategori_nama_unique" UNIQUE("nama")
);
--> statement-breakpoint
ALTER TABLE "buku" ADD COLUMN "stok" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buku" DROP COLUMN "kategori";