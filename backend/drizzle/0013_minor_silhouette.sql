CREATE TABLE "sekolah" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(255) NOT NULL,
	"npsn" varchar(20),
	"alamat" text,
	"logo_url" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sekolah_npsn_unique" UNIQUE("npsn")
);
--> statement-breakpoint
ALTER TABLE "kategori" DROP CONSTRAINT "kategori_nama_unique";--> statement-breakpoint
ALTER TABLE "kelas" DROP CONSTRAINT "kelas_nama_kelas_unique";--> statement-breakpoint
ALTER TABLE "anggota" DROP CONSTRAINT "anggota_nis_unique";--> statement-breakpoint
ALTER TABLE "anggota" DROP CONSTRAINT "anggota_nip_unique";--> statement-breakpoint
ALTER TABLE "eksemplar_buku" DROP CONSTRAINT "eksemplar_buku_barcode_unique";--> statement-breakpoint
ALTER TABLE "admin_akun" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "admin_akun" ADD COLUMN "peran" varchar(20) DEFAULT 'admin_sekolah' NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_perpustakaan" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "kategori" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "kelas" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "anggota" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "buku" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "eksemplar_buku" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "sekolah_id" integer;--> statement-breakpoint
ALTER TABLE "admin_akun" ADD CONSTRAINT "admin_akun_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaturan_perpustakaan" ADD CONSTRAINT "pengaturan_perpustakaan_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kategori" ADD CONSTRAINT "kategori_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anggota" ADD CONSTRAINT "anggota_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buku" ADD CONSTRAINT "buku_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eksemplar_buku" ADD CONSTRAINT "eksemplar_buku_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anggota_sekolah_id_idx" ON "anggota" USING btree ("sekolah_id");--> statement-breakpoint
CREATE INDEX "buku_sekolah_id_idx" ON "buku" USING btree ("sekolah_id");--> statement-breakpoint
CREATE INDEX "eksemplar_buku_sekolah_id_idx" ON "eksemplar_buku" USING btree ("sekolah_id");--> statement-breakpoint
CREATE INDEX "peminjaman_sekolah_id_idx" ON "peminjaman" USING btree ("sekolah_id");--> statement-breakpoint
ALTER TABLE "pengaturan_perpustakaan" ADD CONSTRAINT "pengaturan_perpustakaan_sekolah_id_unique" UNIQUE("sekolah_id");--> statement-breakpoint
ALTER TABLE "kategori" ADD CONSTRAINT "kategori_nama_sekolah_unique" UNIQUE("sekolah_id","nama");--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_nama_sekolah_unique" UNIQUE("sekolah_id","nama_kelas");--> statement-breakpoint
ALTER TABLE "anggota" ADD CONSTRAINT "anggota_nis_sekolah_unique" UNIQUE("sekolah_id","nis");--> statement-breakpoint
ALTER TABLE "anggota" ADD CONSTRAINT "anggota_nip_sekolah_unique" UNIQUE("sekolah_id","nip");--> statement-breakpoint
ALTER TABLE "eksemplar_buku" ADD CONSTRAINT "eksemplar_barcode_sekolah_unique" UNIQUE("sekolah_id","barcode");