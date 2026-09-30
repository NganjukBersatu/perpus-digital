// Jalankan SEKALI dari folder backend: node scripts/perbaikiBarcodeRusak.js
// Mencari eksemplar dengan barcode yang "rusak" (hasil object ke-stringify,
// seperti {"isTrusted":true,...}) dan menggantinya dengan barcode aman
// bertanda AUTO-, supaya tidak melanggar constraint unique/notNull.

// [BARU] Muat .env DULU, sebelum require('../db') — supaya kredensial
// database (DATABASE_URL, dst) sudah tersedia saat koneksi dibuat.
// Ini sama seperti yang dilakukan index.js di baris paling atasnya.
require('dotenv').config()

const db = require('../db')
const { eksemplarBuku } = require('../db/schema')
const { eq, or, ilike } = require('drizzle-orm')

async function main() {
  const rusak = await db
    .select()
    .from(eksemplarBuku)
    .where(
      or(
        ilike(eksemplarBuku.barcode, '{%'),
        ilike(eksemplarBuku.barcode, '%isTrusted%'),
        ilike(eksemplarBuku.barcode, '[object%')
      )
    )

  if (rusak.length === 0) {
    console.log('Tidak ada barcode rusak ditemukan. Aman.')
    process.exit(0)
  }

  console.log(`Ditemukan ${rusak.length} barcode rusak, memperbaiki...`)

  for (const eks of rusak) {
    const barcodeBaru = `AUTO-${eks.bukuId}-${Date.now()}-${eks.id}`
    await db.update(eksemplarBuku).set({ barcode: barcodeBaru }).where(eq(eksemplarBuku.id, eks.id))
    console.log(`  id=${eks.id} (bukuId=${eks.bukuId}): "${eks.barcode}" -> "${barcodeBaru}"`)
  }

  console.log('Selesai. Semua barcode rusak sudah diganti.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Gagal memperbaiki barcode:', err)
  process.exit(1)
})