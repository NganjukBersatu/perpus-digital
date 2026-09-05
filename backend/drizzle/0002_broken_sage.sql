ALTER TABLE "peminjaman" ADD COLUMN "tanggal_kembali" date;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "tanggal_dikembalikan" date;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "denda" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "peminjaman" DROP COLUMN "tanggal_kembali_rencana";--> statement-breakpoint
ALTER TABLE "peminjaman" DROP COLUMN "tanggal_kembali_aktual";