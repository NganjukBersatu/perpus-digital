ALTER TABLE "peminjaman" ADD COLUMN IF NOT EXISTS "tanggal_kembali" date;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN IF NOT EXISTS "tanggal_dikembalikan" date;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN IF NOT EXISTS "denda" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "peminjaman" DROP COLUMN IF EXISTS "tanggal_kembali_rencana";--> statement-breakpoint
ALTER TABLE "peminjaman" DROP COLUMN IF EXISTS "tanggal_kembali_aktual";