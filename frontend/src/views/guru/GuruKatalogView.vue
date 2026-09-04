<script setup>
import { ref, computed } from 'vue'

const keyword = ref('')
const kategoriAktif = ref('Semua')

const kategoriList = ['Semua', 'Teknologi', 'Pendidikan', 'Fiksi', 'Sains', 'Anak', 'Sejarah', 'Bahasa']

const statistik = [
  { label: 'Total Koleksi', value: '1.250', satuan: 'Buku', warna: '#7c3aed', bg: '#f3e8ff', icon: 'book' },
  { label: 'Tersedia', value: '980', satuan: 'Buku', warna: '#16a34a', bg: '#dcfce7', icon: 'check' },
  { label: 'Dipinjam', value: '210', satuan: 'Buku', warna: '#d97706', bg: '#fef3c7', icon: 'clock' },
  { label: 'Favorit Saya', value: '8', satuan: 'Buku', warna: '#db2777', bg: '#fce7f3', icon: 'heart' }
]

const bukuList = ref([
  { judul: 'Dasar Pemrograman Web', penulis: 'Abdul Kadir', kategori: 'Teknologi', rating: 4.5, jumlahRating: 128, stok: 5, cover: '#2563eb', favorit: false },
  { judul: 'Strategi Pembelajaran Inovatif', penulis: 'Dr. H. Syaiful Bahri', kategori: 'Pendidikan', rating: 4.6, jumlahRating: 96, stok: 3, cover: '#f59e0b', favorit: true },
  { judul: 'Manajemen Kelas Efektif', penulis: 'Drs. Mulyasa', kategori: 'Pendidikan', rating: 4.4, jumlahRating: 74, stok: 0, cover: '#10b981', favorit: false },
  { judul: 'Algoritma & Pemrograman dengan Python', penulis: 'Munir', kategori: 'Teknologi', rating: 4.7, jumlahRating: 150, stok: 7, cover: '#0f766e', favorit: false },
  { judul: 'Database System Concepts', penulis: 'Abraham Silberschatz', kategori: 'Teknologi', rating: 4.3, jumlahRating: 61, stok: 2, cover: '#b45309', favorit: false },
  { judul: 'Kecerdasan Artifisial', penulis: 'Suyanto', kategori: 'Sains', rating: 4.5, jumlahRating: 84, stok: 4, cover: '#7c3aed', favorit: true }
])

const bukuFiltered = computed(() => {
  return bukuList.value.filter(b => {
    const cocokKategori = kategoriAktif.value === 'Semua' || b.kategori === kategoriAktif.value
    const kata = keyword.value.toLowerCase()
    const cocokKeyword =
      b.judul.toLowerCase().includes(kata) ||
      b.penulis.toLowerCase().includes(kata)
    return cocokKategori && cocokKeyword
  })
})

function toggleFavorit(buku) {
  buku.favorit = !buku.favorit
}
</script>

<template>
  <div class="katalog-page">
    <!-- HEADER + STATISTIK -->
    <div class="page-top">
      <div class="page-header">
        <h1>
          <span class="title-icon">♥</span>
          Katalog Buku
        </h1>
        <p class="muted">Temukan berbagai koleksi buku yang tersedia di perpustakaan.</p>
      </div>

      <div class="stats-row">
        <div class="stat-mini" v-for="s in statistik" :key="s.label">
          <div class="stat-icon" :style="{ background: s.bg, color: s.warna }">
            <span v-if="s.icon === 'book'">📘</span>
            <span v-else-if="s.icon === 'check'">✓</span>
            <span v-else-if="s.icon === 'clock'">⏱</span>
            <span v-else>♥</span>
          </div>
          <div>
            <div class="stat-label">{{ s.label }}</div>
            <div class="stat-value" :style="{ color: s.warna }">{{ s.value }}</div>
            <div class="stat-satuan">{{ s.satuan }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- PENCARIAN -->
    <div class="search-box">
      <span class="search-icon">⌕</span>
      <input v-model="keyword" type="text" placeholder="Cari judul, penulis, atau ISBN..." />
    </div>

    <!-- KATEGORI -->
    <div class="kategori-list">
      <button
        v-for="k in kategoriList"
        :key="k"
        class="kategori-chip"
        :class="{ active: kategoriAktif === k }"
        @click="kategoriAktif = k"
      >
        {{ k }}
      </button>
    </div>

    <!-- GRID BUKU -->
    <div class="buku-grid">
      <div class="buku-card" v-for="b in bukuFiltered" :key="b.judul">
        <div class="buku-cover" :style="{ background: b.cover }">
          <div class="cover-title">{{ b.judul }}</div>
          <button
            class="btn-fav"
            :class="{ on: b.favorit }"
            @click="toggleFavorit(b)"
          >
            ♥
          </button>
        </div>

        <div class="buku-info">
          <div class="buku-judul">{{ b.judul }}</div>
          <div class="buku-penulis">{{ b.penulis }}</div>
          <div class="buku-rating">★ {{ b.rating }} ({{ b.jumlahRating }})</div>
          <div class="buku-kategori">{{ b.kategori }}</div>
          <div class="buku-stok" :class="{ habis: b.stok === 0 }">
            {{ b.stok > 0 ? `Tersedia (${b.stok})` : 'Stok habis' }}
          </div>
        </div>
      </div>

      <p v-if="bukuFiltered.length === 0" class="empty-state">
        Tidak ada buku yang cocok dengan pencarian.
      </p>
    </div>
  </div>
</template>

<style scoped>
.katalog-page {
  padding: 24px;
}

.page-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #7c3aed;
}

.muted {
  color: #6b7280;
  margin: 6px 0 0;
  font-size: 14px;
}

.stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-mini {
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 140px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
}

.stat-satuan {
  font-size: 11px;
  color: #9ca3af;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.search-icon {
  color: #9ca3af;
}

.search-box input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 14px;
}

.kategori-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.kategori-chip {
  border: none;
  background: #f3f4f6;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.kategori-chip.active {
  background: #4f46e5;
  color: #fff;
}

.buku-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

.buku-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
}

.buku-cover {
  height: 170px;
  color: #fff;
  padding: 16px;
  position: relative;
  display: flex;
  align-items: flex-end;
}

.cover-title {
  font-weight: 700;
  font-size: 15px;
  line-height: 1.3;
}

.btn-fav {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.85);
  color: #d1d5db;
  cursor: pointer;
}

.btn-fav.on {
  color: #db2777;
}

.buku-info {
  padding: 12px 14px 16px;
}

.buku-judul {
  font-size: 13px;
  font-weight: 700;
}

.buku-penulis {
  font-size: 12px;
  color: #6b7280;
  margin: 2px 0 6px;
}

.buku-rating {
  font-size: 12px;
  color: #f59e0b;
  margin-bottom: 6px;
}

.buku-kategori {
  display: inline-block;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.buku-stok {
  font-size: 12px;
  color: #16a34a;
  font-weight: 600;
}

.buku-stok.habis {
  color: #dc2626;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #6b7280;
  padding: 40px 0;
}

@media (max-width: 900px) {
  .page-top {
    flex-direction: column;
  }
}
</style>