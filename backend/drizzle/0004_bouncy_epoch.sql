CREATE TABLE "kelas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_kelas" varchar(50) NOT NULL,
	CONSTRAINT "kelas_nama_kelas_unique" UNIQUE("nama_kelas")
);
