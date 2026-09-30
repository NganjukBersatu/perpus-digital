ALTER TABLE "buku" DROP CONSTRAINT "buku_kategori_id_kategori_id_fk";
--> statement-breakpoint
ALTER TABLE "eksemplar_buku" DROP CONSTRAINT "eksemplar_buku_buku_id_buku_id_fk";
--> statement-breakpoint
ALTER TABLE "peminjaman" DROP CONSTRAINT "peminjaman_eksemplar_id_eksemplar_buku_id_fk";
--> statement-breakpoint
ALTER TABLE "peminjaman" DROP CONSTRAINT "peminjaman_anggota_id_anggota_id_fk";
--> statement-breakpoint
ALTER TABLE "buku" ADD CONSTRAINT "buku_kategori_id_kategori_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eksemplar_buku" ADD CONSTRAINT "eksemplar_buku_buku_id_buku_id_fk" FOREIGN KEY ("buku_id") REFERENCES "public"."buku"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_eksemplar_id_eksemplar_buku_id_fk" FOREIGN KEY ("eksemplar_id") REFERENCES "public"."eksemplar_buku"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_anggota_id_anggota_id_fk" FOREIGN KEY ("anggota_id") REFERENCES "public"."anggota"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buku_kategori_id_idx" ON "buku" USING btree ("kategori_id");--> statement-breakpoint
CREATE INDEX "buku_judul_idx" ON "buku" USING btree ("judul");--> statement-breakpoint
CREATE INDEX "buku_isbn_idx" ON "buku" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "eksemplar_buku_buku_id_idx" ON "eksemplar_buku" USING btree ("buku_id");--> statement-breakpoint
CREATE INDEX "eksemplar_buku_status_idx" ON "eksemplar_buku" USING btree ("status");--> statement-breakpoint
CREATE INDEX "anggota_peran_idx" ON "anggota" USING btree ("peran");--> statement-breakpoint
CREATE INDEX "anggota_nama_idx" ON "anggota" USING btree ("nama");--> statement-breakpoint
CREATE INDEX "peminjaman_eksemplar_id_idx" ON "peminjaman" USING btree ("eksemplar_id");--> statement-breakpoint
CREATE INDEX "peminjaman_anggota_id_idx" ON "peminjaman" USING btree ("anggota_id");--> statement-breakpoint
CREATE INDEX "peminjaman_tanggal_pinjam_idx" ON "peminjaman" USING btree ("tanggal_pinjam");--> statement-breakpoint
CREATE INDEX "peminjaman_tanggal_kembali_idx" ON "peminjaman" USING btree ("tanggal_kembali");--> statement-breakpoint
CREATE INDEX "peminjaman_tanggal_dikembalikan_idx" ON "peminjaman" USING btree ("tanggal_dikembalikan");