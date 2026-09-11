<template>
  <div class="content">
    <div class="page-header">
      <h1>Katalog Buku</h1>
      <p>Cari dan cek ketersediaan buku di perpustakaan.</p>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari judul, penulis, atau ISBN..."
        />
      </div>

      <select v-model="selectedKategori" class="kategori-select">
        <option value="">Semua Kategori</option>
        <option v-for="kat in daftarKategori" :key="kat" :value="kat">{{ kat }}</option>
      </select>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Daftar Buku</h2>
        <span class="result-count" v-if="!isLoading && !errorMessage">{{ bukuTerfilter.length }} buku</span>
      </div>

      <div v-if="isLoading" class="empty-state">
        <p>Memuat data buku...</p>
      </div>

      <div v-else-if="errorMessage" class="empty-state">
        <p>{{ errorMessage }}</p>
      </div>

      <div v-else-if="bukuTerfilter.length === 0" class="empty-state">
        <p>Tidak ada buku yang cocok dengan pencarian kamu.</p>
      </div>

      <div v-else class="book-grid">
        <div v-for="item in bukuTerfilter" :key="item.id" class="book-card">
          <div class="stat-icon" :class="statusIconClass(item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>

          <div class="book-info">
            <h3 class="book-title">{{ item.judul }}</h3>
            <p class="book-penulis">{{ item.penulis || 'Penulis tidak diketahui' }}</p>

            <div class="badge-row">
              <span v-if="item.kategori" class="badge">{{ item.kategori }}</span>
              <span class="badge" :class="statusClass(item)">{{ statusLabel(item) }}</span>
            </div>

            <p class="stok-info">{{ item.tersedia }} dari {{ item.totalEksemplar }} tersedia</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_BASE_URL

const daftarBuku = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const searchQuery = ref('')
const selectedKategori = ref('')

async function fetchBuku() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`${API_BASE}/buku`)
    if (!res.ok) throw new Error('Gagal mengambil data buku')
    daftarBuku.value = await res.json()
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Gagal memuat katalog buku'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchBuku)

const daftarKategori = computed(() => {
  const set = new Set(
    daftarBuku.value
      .map(item => item.kategori)
      .filter(k => !!k)
  )
  return Array.from(set).sort()
})

const bukuTerfilter = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return daftarBuku.value.filter(item => {
    const cocokKategori = !selectedKategori.value || item.kategori === selectedKategori.value
    const cocokSearch = !q ||
      item.judul?.toLowerCase().includes(q) ||
      item.penulis?.toLowerCase().includes(q) ||
      item.isbn?.toLowerCase().includes(q)
    return cocokKategori && cocokSearch
  })
})

function statusLabel(item) {
  if (item.tersedia === 0) return 'Habis'
  if (item.tersedia <= item.totalEksemplar * 0.3) return 'Stok Menipis'
  return 'Tersedia'
}

function statusClass(item) {
  if (item.tersedia === 0) return 'badge-habis'
  if (item.tersedia <= item.totalEksemplar * 0.3) return 'badge-menipis'
  return 'badge-tersedia'
}

function statusIconClass(item) {
  if (item.tersedia === 0) return 'red'
  if (item.tersedia <= item.totalEksemplar * 0.3) return 'orange'
  return 'blue'
}
</script>

<style scoped>
.content {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
  color: #0f172a;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 10px;
  padding: 10px 14px;
  color: #64748b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 0.95rem;
  color: #0f172a;
}

.kategori-select {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: white;
  color: #334155;
  font-size: 0.95rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-card {
  background: white;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.result-count {
  font-size: 0.85rem;
  color: #64748b;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.book-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
}

.stat-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.blue { background: #dbeafe; color: #1e40af; }
.stat-icon.orange { background: #ffedd5; color: #c2410c; }
.stat-icon.red { background: #fee2e2; color: #b91c1c; }

.book-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.book-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.book-penulis {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0 2px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-tersedia { background: #dcfce7; color: #15803d; }
.badge-menipis { background: #ffedd5; color: #c2410c; }
.badge-habis { background: #fee2e2; color: #b91c1c; }

.stok-info {
  margin: 0;
  font-size: 0.78rem;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}
</style>