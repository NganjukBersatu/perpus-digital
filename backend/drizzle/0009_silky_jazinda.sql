ALTER TABLE "anggota" DROP CONSTRAINT "anggota_username_unique";--> statement-breakpoint
ALTER TABLE "pengaturan_perpustakaan" ADD COLUMN "detail" jsonb;--> statement-breakpoint
ALTER TABLE "anggota" ADD COLUMN "password" varchar(255);--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "nominal_denda_per_hari" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "denda_maksimal" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "denda_guru_aktif" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "peminjaman" ADD COLUMN "masa_tenggang" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "anggota" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "anggota" DROP COLUMN "password_hash";