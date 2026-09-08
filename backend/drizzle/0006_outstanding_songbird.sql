ALTER TABLE "peminjaman" ADD COLUMN "status_denda" varchar(20) DEFAULT 'belum_dibayar';--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "tanggal_bayar_denda" date;