<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const API_BASE = import.meta.env.VITE_API_BASE_URL

const keyword = ref('')
const kategoriAktif = ref('Semua')
const sortBy = ref('terbaru')
const viewMode = ref('grid')
const loading = ref(false)
const error = ref('')

const kategoriList = ref(['Semua'])
const bukuList = ref([])

const coverColors = {
  Teknologi: '#2563eb',
  Pendidikan: '#f59e0b',
  Fiksi: '#ec4899',
  Sains: '#7c3aed',
  Anak: '#10b981',
  Sejarah: '#b45309',
  Bahasa: '#0f766e'
}

function getCoverColor(kategori) {
  return coverColors[kategori] || '#4f46e5'
}

async function fetchKategori() {
  try {
    const res = await fetch(`${API_BASE}/kategori`)
    if (!res.ok) throw new Error('Gagal mengambil kategori')
    const data = await res.json()
    kategoriList.value = ['Semua', ...data.map(k => k.nama)]
  } catch (err) {
    console.error(err)
    // fallback dari data buku
    const set = new Set(bukuList.value.map(b => b.kategori).filter(Boolean))
    kategoriList.value = ['Semua', ...Array.from(set).sort()]
  }
}

async function fetchBuku() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.append('q', keyword.value.trim())
    if (kategoriAktif.value !== 'Semua') params.append('kategoriNama', kategoriAktif.value)

    const res = await fetch(`${API_BASE}/buku?${params.toString()}`)
    if (!res.ok) throw new Error('Gagal mengambil data buku')

    const data = await res.json()

    bukuList.value = data.map((b) => ({
      id: b.id,
      judul: b.judul,
      penulis: b.penulis || 'Penulis tidak diketahui',
      kategori: b.kategori || 'Lainnya',
      stok: b.tersedia ?? b.stok ?? 0,
      totalEksemplar: b.totalEksemplar ?? b.stok ?? 0,
      cover: getCoverColor(b.kategori)
    }))
  } catch (err) {
    console.error(err)
    error.value = 'Gagal memuat data katalog.'
    bukuList.value = []
  } finally {
    loading.value = false
  }
}

const bukuFiltered = computed(() => {
  let result = [...bukuList.value]

  const kata = keyword.value.toLowerCase()
  if (kata) {
    result = result.filter(b =>
      b.judul.toLowerCase().includes(kata) ||
      b.penulis.toLowerCase().includes(kata)
    )
  }

  if (kategoriAktif.value !== 'Semua') {
    result = result.filter(b => b.kategori === kategoriAktif.value)
  }

  if (sortBy.value === 'judul') {
    result.sort((a, b) => a.judul.localeCompare(b.judul))
  } else if (sortBy.value === 'penulis') {
    result.sort((a, b) => a.penulis.localeCompare(b.penulis))
  }

  return result
})

onMounted(async () => {
  await fetchBuku()
  await fetchKategori()
})

watch(kategoriAktif, () => fetchBuku())

let searchTimeout = null
watch(keyword, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchBuku(), 400)
})
</script>

<template>
  <div class="katalog-page">
    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h1>Katalog Buku</h1>
        <p class="muted">Temukan berbagai koleksi buku yang tersedia di perpustakaan.</p>
      </div>

      <div class="view-toggle">
        <button
          class="toggle-btn"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          Grid
        </button>
        <button
          class="toggle-btn"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          List
        </button>
      </div>
    </div>

    <!-- SEARCH + FILTER -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input
          v-model="keyword"
          type="text"
          placeholder="Cari judul, penulis, atau ISBN..."
        />
      </div>

      <select v-model="kategoriAktif" class="filter-select">
        <option v-for="k in kategoriList" :key="k" :value="k">
          {{ k }}
        </option>
      </select>

      <select v-model="sortBy" class="filter-select">
        <option value="terbaru">Terbaru ditambahkan</option>
        <option value="judul">Judul A-Z</option>
        <option value="penulis">Penulis A-Z</option>
      </select>
    </div>

    <!-- LOADING / ERROR -->
    <div v-if="loading" class="empty-state">Memuat katalog...</div>
    <div v-else-if="error" class="empty-state" style="color:#dc2626">{{ error }}</div>

    <!-- ==================== MODE GRID ==================== -->
    <div v-else-if="viewMode === 'grid'" class="buku-grid">
      <div class="buku-card" v-for="b in bukuFiltered" :key="b.id || b.judul">
        <div class="buku-cover" :style="{ background: b.cover }">
          <div class="cover-title">{{ b.judul }}</div>
        </div>

        <div class="buku-info">
          <div class="buku-judul">{{ b.judul }}</div>
          <div class="buku-penulis">{{ b.penulis }}</div>
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

    <!-- ==================== MODE LIST ==================== -->
    <div v-else class="buku-list">
      <div class="list-item" v-for="b in bukuFiltered" :key="b.id || b.judul">
        <div class="list-cover" :style="{ background: b.cover }">
          <div class="list-cover-title">{{ b.judul }}</div>
        </div>

        <div class="list-info">
          <div class="list-judul">{{ b.judul }}</div>
          <div class="list-penulis">{{ b.penulis }}</div>
          <div class="list-meta">
            <span class="buku-kategori">{{ b.kategori }}</span>
          </div>

          <div class="list-actions">
            <button class="btn-pinjam" :disabled="b.stok === 0">
              {{ b.stok > 0 ? 'Pinjam Buku' : 'Stok Habis' }}
            </button>
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

/* ===== HEADER ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
}

.muted {
  color: #6b7280;
  margin: 6px 0 0;
  font-size: 14px;
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s ease;
}

.toggle-btn.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
}

.toggle-btn:hover:not(.active) {
  background: #f9fafb;
}

/* ===== FILTER BAR ===== */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 220px;
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
  background: transparent;
}

.filter-select {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  min-width: 150px;
}

/* ===== GRID ===== */
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

/* ===== LIST MODE ===== */
.buku-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-item {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
  transition: box-shadow 0.15s ease;
}

.list-item:hover {
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.list-cover {
  width: 140px;
  min-height: 160px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  color: white;
}

.list-cover-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.list-info {
  flex: 1;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.list-judul {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.list-penulis {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-pinjam {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-pinjam:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* ===== EMPTY ===== */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #6b7280;
  padding: 40px 0;
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
  }
  .filter-bar {
    flex-direction: column;
  }
  .filter-select {
    width: 100%;
  }
}
</style>