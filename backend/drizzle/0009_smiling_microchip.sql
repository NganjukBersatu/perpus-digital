-- Kolom di tabel buku
ALTER TABLE "buku" ADD COLUMN IF NOT EXISTS "kategori_id" integer;
ALTER TABLE "buku" ADD COLUMN IF NOT EXISTS "tersedia" integer DEFAULT 0;
ALTER TABLE "buku" ADD COLUMN IF NOT EXISTS "lokasi" varchar(50);
ALTER TABLE "buku" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'Tersedia';

-- Kolom di tabel anggota
ALTER TABLE "anggota" ADD COLUMN IF NOT EXISTS "nis" varchar(30);
ALTER TABLE "anggota" ADD COLUMN IF NOT EXISTS "tanggal_lahir" date;
ALTER TABLE "anggota" ADD COLUMN IF NOT EXISTS "username" varchar(100);
ALTER TABLE "anggota" ADD COLUMN IF NOT EXISTS "password_hash" text;

-- Ganti FK lama dengan versi nama standar Drizzle
ALTER TABLE "buku" DROP CONSTRAINT IF EXISTS "buku_kategori_id_fk";
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'buku_kategori_id_kategori_id_fk'
  ) THEN
    ALTER TABLE "buku" ADD CONSTRAINT "buku_kategori_id_kategori_id_fk"
      FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

-- Unique constraints di anggota
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anggota_nis_unique') THEN
    ALTER TABLE "anggota" ADD CONSTRAINT "anggota_nis_unique" UNIQUE("nis");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anggota_nip_unique') THEN
    ALTER TABLE "anggota" ADD CONSTRAINT "anggota_nip_unique" UNIQUE("nip");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anggota_username_unique') THEN
    ALTER TABLE "anggota" ADD CONSTRAINT "anggota_username_unique" UNIQUE("username");
  END IF;
END $$;