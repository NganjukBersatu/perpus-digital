ALTER TABLE "admin_akun" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sekolah" ADD COLUMN "status" varchar(20) DEFAULT 'menunggu' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_akun" ADD CONSTRAINT "admin_akun_email_unique" UNIQUE("email");