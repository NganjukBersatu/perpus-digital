<script setup>
import { ref, computed } from 'vue'

const keyword = ref('')
const urutan = ref('terbaru')
const tampilan = ref('grid')

const favoritList = ref([
  { id: 1, judul: 'Dasar Pemrograman Web', penulis: 'Abdul Kadir', kategori: 'Teknologi', rating: 4.5, jumlahRating: 128, stok: 5, cover: '#2563eb', ditambahkan: '02 Jun 2026' },
  { id: 2, judul: 'Strategi Pembelajaran Inovatif', penulis: 'Dr. H. Syaiful Bahri', kategori: 'Pendidikan', rating: 4.6, jumlahRating: 96, stok: 3, cover: '#f59e0b', ditambahkan: '28 Mei 2026' },
  { id: 3, judul: 'Algoritma & Pemrograman dengan Python', penulis: 'Munir', kategori: 'Teknologi', rating: 4.7, jumlahRating: 150, stok: 7, cover: '#0f766e', ditambahkan: '20 Mei 2026' },
  { id: 4, judul: 'Database System Concepts', penulis: 'Abraham Silberschatz', kategori: 'Teknologi', rating: 4.3, jumlahRating: 61, stok: 2, cover: '#b45309', ditambahkan: '10 Mei 2026' },
  { id: 5, judul: 'Manajemen Kelas Efektif', penulis: 'Drs. Mulyasa', kategori: 'Pendidikan', rating: 4.4, jumlahRating: 74, stok: 0, cover: '#10b981', ditambahkan: '05 Mei 2026' },
  { id: 6, judul: 'Kecerdasan Artifisial', penulis: 'Suyanto', kategori: 'Sains', rating: 4.5, jumlahRating: 84, stok: 4, cover: '#7c3aed', ditambahkan: '15 Mei 2026' },
  { id: 7, judul: 'Rekayasa Perangkat Lunak', penulis: 'R. Pressman', kategori: 'Teknologi', rating: 4.4, jumlahRating: 88, stok: 3, cover: '#1d4ed8', ditambahkan: '01 Mei 2026' },
  { id: 8, judul: 'Jaringan Komputer', penulis: 'Andrew S. Tanenbaum', kategori: 'Teknologi', rating: 4.6, jumlahRating: 112, stok: 6, cover: '#0f766e', ditambahkan: '22 Apr 2026' }
])

const favoritFiltered = computed(() => {
  const hasil = favoritList.value.filter(b => {
    const kata = keyword.value.toLowerCase()
    return b.judul.toLowerCase().includes(kata) || b.penulis.toLowerCase().includes(kata)
  })

  if (urutan.value === 'judul') {
    return [...hasil].sort((a, b) => a.judul.localeCompare(b.judul, 'id'))
  }
  if (urutan.value === 'rating') {
    return [...hasil].sort((a, b) => b.rating - a.rating)
  }
  return hasil
})

function hapusFavorit(id) {
  favoritList.value = favoritList.value.filter(b => b.id !== id)
}
</script>

<template>
  <div class="favorit-page">
    <!-- HEADER -->
    <div class="page-top">
      <div>
        <h1><span class="title-icon">♥</span> Buku Favorit</h1>
        <p class="muted">Daftar buku yang Anda tandai sebagai favorit.</p>
      </div>

      <div class="view-toggle">
        <button :class="{ active: tampilan === 'grid' }" @click="tampilan = 'grid'">Grid</button>
        <button :class="{ active: tampilan === 'list' }" @click="tampilan = 'list'">List</button>
      </div>
    </div>

    <!-- FILTER -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input v-model="keyword" type="text" placeholder="Cari di daftar favorit..." />
      </div>
      <select v-model="urutan" class="sort-select">
        <option value="terbaru">Terbaru ditambahkan</option>
        <option value="judul">Judul A-Z</option>
        <option value="rating">Rating tertinggi</option>
      </select>
    </div>

    <!-- GRID / LIST -->
    <div v-if="favoritFiltered.length" :class="tampilan === 'grid' ? 'buku-grid' : 'buku-list'">
      <div class="buku-card" v-for="b in favoritFiltered" :key="b.id">
        <div class="buku-cover" :style="{ background: b.cover }">
          <div class="cover-title">{{ b.judul }}</div>
          <button class="btn-fav" title="Hapus dari favorit" @click="hapusFavorit(b.id)">♥</button>
        </div>

        <div class="buku-info">
          <div class="buku-judul">{{ b.judul }}</div>
          <div class="buku-penulis">{{ b.penulis }}</div>
          <div class="buku-rating">★ {{ b.rating }} ({{ b.jumlahRating }})</div>
          <div class="buku-meta">Ditambahkan {{ b.ditambahkan }}</div>

          <div class="aksi">
            <button class="btn-pinjam" :disabled="b.stok === 0">
              {{ b.stok > 0 ? 'Pinjam Buku' : 'Tidak Tersedia' }}
            </button>
            <button class="btn-hapus" @click="hapusFavorit(b.id)">♥</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <h3>{{ keyword ? 'Tidak ada buku yang cocok' : 'Belum ada buku favorit' }}</h3>
      <p>{{ keyword ? 'Coba kata kunci lain.' : 'Tandai buku dari katalog agar muncul di halaman ini.' }}</p>
      <router-link to="/guru/katalog" class="btn-primary">Jelajahi Katalog</router-link>
    </div>
  </div>
</template>

<style scoped>
.favorit-page {
  padding: 24px;
}

.page-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-top h1 {
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
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.view-toggle button {
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
}

.view-toggle button.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin: 18px 0 20px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 10px 16px;
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

.sort-select {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
}

.buku-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

.buku-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.buku-list .buku-card {
  display: flex;
}

.buku-list .buku-cover {
  width: 160px;
  flex-shrink: 0;
}

.buku-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
}

.buku-cover {
  height: 160px;
  color: #fff;
  padding: 14px;
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
  background: rgba(255,255,255,0.9);
  color: #db2777;
  cursor: pointer;
}

.buku-info {
  padding: 12px 14px 14px;
}

.buku-judul {
  font-size: 13px;
  font-weight: 700;
}

.buku-penulis,
.buku-meta {
  font-size: 12px;
  color: #6b7280;
}

.buku-rating {
  font-size: 12px;
  color: #f59e0b;
  margin: 4px 0;
}

.buku-meta {
  margin-bottom: 10px;
}

.aksi {
  display: flex;
  gap: 8px;
}

.btn-pinjam {
  flex: 1;
  border: none;
  background: #4f46e5;
  color: #fff;
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
  cursor: pointer;
}

.btn-pinjam:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-hapus {
  width: 36px;
  border: 1px solid #fecaca;
  background: #fff;
  color: #db2777;
  border-radius: 10px;
  cursor: pointer;
}

.btn-primary {
  display: inline-block;
  margin-top: 12px;
  background: #4f46e5;
  color: #fff;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 10px;
}

.empty-state {
  text-align: center;
  background: #fff;
  border-radius: 16px;
  padding: 56px 24px;
  color: #6b7280;
}

.empty-state h3 {
  margin: 0 0 6px;
  color: #111827;
}
</style>