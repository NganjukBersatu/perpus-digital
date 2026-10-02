ALTER TABLE "pengaturan_perpustakaan" ALTER COLUMN "sekolah_id" SET NOT NULL;
ALTER TABLE "kategori" ALTER COLUMN "sekolah_id" SET NOT NULL;
ALTER TABLE "kelas" ALTER COLUMN "sekolah_id" SET NOT NULL;
ALTER TABLE "anggota" ALTER COLUMN "sekolah_id" SET NOT NULL;
ALTER TABLE "buku" ALTER COLUMN "sekolah_id" SET NOT NULL;
ALTER TABLE "eksemplar_buku" ALTER COLUMN "sekolah_id" SET NOT NULL;
ALTER TABLE "peminjaman" ALTER COLUMN "sekolah_id" SET NOT NULL;