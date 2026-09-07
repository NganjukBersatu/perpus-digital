<script setup>
import { ref, computed } from 'vue'

const searchQuery = ref('')
const selectedKategori = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const perPage = ref(5)

const bukuList = ref([
  {
    id: 1,
    judul: 'Dasar Pemrograman Web',
    penulis: 'Abdul Kadir',
    kategori: 'Buku Mata Pelajaran',
    isbn: '978-602-6232-44-1',
    stok: 5,
    tersedia: 4,
    lokasi: 'Rak T-01',
    status: 'Tersedia',
    coverUrl: 'https://placehold.co/48x64/1e3a5f/ffffff?text=Web'
  },
  {
    id: 2,
    judul: 'Laskar Pelangi',
    penulis: 'Andrea Hirata',
    kategori: 'Novel',
    isbn: '978-979-1227-41-5',
    stok: 3,
    tersedia: 2,
    lokasi: 'Rak N-02',
    status: 'Tersedia',
    coverUrl: 'https://placehold.co/48x64/c2410c/ffffff?text=LP'
  },
  {
    id: 3,
    judul: 'Matematika Kelas XII',
    penulis: 'Budi Santoso',
    kategori: 'Buku Mata Pelajaran',
    isbn: '978-602-298-567-8',
    stok: 10,
    tersedia: 7,
    lokasi: 'Rak M-03',
    status: 'Tersedia',
    coverUrl: 'https://placehold.co/48x64/1d4ed8/ffffff?text=MTK'
  },
  {
    id: 4,
    judul: 'Bumi',
    penulis: 'Tere Liye',
    kategori: 'Novel',
    isbn: '978-602-9474-17-6',
    stok: 4,
    tersedia: 1,
    lokasi: 'Rak N-01',
    status: 'Stok Menipis',
    coverUrl: 'https://placehold.co/48x64/7c3aed/ffffff?text=Bumi'
  },
  {
    id: 5,
    judul: 'Sejarah Indonesia',
    penulis: 'Dra. Wulandari',
    kategori: 'Buku Mata Pelajaran',
    isbn: '978-602-437-123-4',
    stok: 2,
    tersedia: 0,
    lokasi: 'Rak S-02',
    status: 'Habis',
    coverUrl: 'https://placehold.co/48x64/b45309/ffffff?text=SI'
  }
])

const filteredList = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return bukuList.value.filter((b) => {
    const matchSearch =
      !q ||
      b.judul.toLowerCase().includes(q) ||
      b.penulis.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q)
    const matchKategori = !selectedKategori.value || b.kategori === selectedKategori.value
    const matchStatus = !selectedStatus.value || b.status === selectedStatus.value
    return matchSearch && matchKategori && matchStatus
  })
})

const totalData = computed(() => filteredList.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalData.value / perPage.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredList.value.slice(start, start + perPage.value)
})

const rangeText = computed(() => {
  if (totalData.value === 0) return 'Menampilkan 0 data'
  const start = (currentPage.value - 1) * perPage.value + 1
  const end = Math.min(currentPage.value * perPage.value, totalData.value)
  return `Menampilkan ${start} - ${end} dari ${totalData.value} data`
})

function resetPage() {
  currentPage.value = 1
}
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Data Buku</h1>
        <p class="subtitle">Kelola koleksi buku yang tersedia di perpustakaan.</p>
      </div>
      <button class="btn-tambah" type="button">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Tambah Buku
      </button>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
          </svg>
        </span>
        <input
          v-model="searchQuery"
          placeholder="Cari judul, penulis, atau ISBN..."
          class="search"
          @input="resetPage"
        />
      </div>

      <select v-model="selectedKategori" class="select" @change="resetPage">
        <option value="">Semua Kategori</option>
        <option value="Buku Mata Pelajaran">Buku Mata Pelajaran</option>
        <option value="Novel">Novel</option>
      </select>

      <select v-model="selectedStatus" class="select" @change="resetPage">
        <option value="">Semua Status</option>
        <option value="Tersedia">Tersedia</option>
        <option value="Stok Menipis">Stok Menipis</option>
        <option value="Habis">Habis</option>
      </select>

      <button class="btn-filter" type="button">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M7 12h10M10 18h4" stroke-linecap="round" />
        </svg>
        Filter
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Cover</th>
            <th>Judul Buku</th>
            <th>Penulis</th>
            <th>Kategori</th>
            <th>ISBN</th>
            <th>Stok</th>
            <th>Tersedia</th>
            <th>Lokasi</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in pagedList" :key="b.id">
            <td>{{ (currentPage - 1) * perPage + i + 1 }}</td>
            <td>
              <img class="cover" :src="b.coverUrl" :alt="b.judul" />
            </td>
            <td class="judul">{{ b.judul }}</td>
            <td>{{ b.penulis }}</td>
            <td>{{ b.kategori }}</td>
            <td>{{ b.isbn }}</td>
            <td>{{ b.stok }}</td>
            <td>{{ b.tersedia }}</td>
            <td>{{ b.lokasi }}</td>
            <td>
              <span
                class="badge"
                :class="{
                  'badge-green': b.status === 'Tersedia',
                  'badge-orange': b.status === 'Stok Menipis',
                  'badge-red': b.status === 'Habis',
                }"
              >
                {{ b.status }}
              </span>
            </td>
            <td>
              <div class="aksi">
                <button class="icon-btn icon-edit" type="button" title="Edit">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9" stroke-linecap="round" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke-linejoin="round" />
                  </svg>
                </button>
                <button class="icon-btn icon-hapus" type="button" title="Hapus">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16" stroke-linecap="round" />
                    <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="pagedList.length === 0">
            <td colspan="11" class="empty">Belum ada data buku</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="range">{{ rangeText }}</span>

      <div class="pages">
        <button type="button" :disabled="currentPage === 1" @click="currentPage--">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          v-for="n in totalPages"
          :key="n"
          type="button"
          class="page-num"
          :class="{ active: currentPage === n }"
          @click="currentPage = n"
        >
          {{ n }}
        </button>

        <button type="button" :disabled="currentPage === totalPages" @click="currentPage++">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <select v-model.number="perPage" class="select select-sm" @change="resetPage">
        <option :value="5">5 / halaman</option>
        <option :value="10">10 / halaman</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.page { 
    padding: 24px; 
    background: #f8f9fb; 
    min-height: 100vh; 
    font-family: sans-serif; 
}

.header { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-start; 
    margin-bottom: 20px; 
}

.header h1 { 
    font-size: 20px; 
    font-weight: 700; 
    color: #1f2937; 
    margin: 0; 
}

.toolbar { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    background: #fff; 
    border-radius: 12px; 
    padding: 12px; 
    margin-bottom: 16px; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
}

.search { 
    flex: 1; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 12px; 
    font-size: 13px; 
}

.table-wrap { 
    background: #fff; 
    border-radius: 12px; 
    overflow: hidden; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
}

table { 
    width: 100%; 
    border-collapse: collapse; 
    font-size: 13px; 
}

.badge { 
    padding: 4px 10px; 
    border-radius: 999px; 
    font-size: 12px; 
    font-weight: 500; 
}

.badge-green { 
    background: #d1fae5; 
    color: #059669; 
}

.badge-red { 
    background: #fee2e2; 
    color: #dc2626; 
}

.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.btn-tambah {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #5b4dff;
  color: #fff;
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(91, 77, 255, 0.25);
}

.search-box {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  display: flex;
}

.search {
  width: 100%;
  box-sizing: border-box;
  padding-left: 34px;
  outline: none;
}

.select {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  background: #fff;
  color: #374151;
  min-width: 150px;
}

.btn-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

th, td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
  white-space: nowrap;
}

thead th {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #fafafa;
}

tbody tr:hover { background: #f9fafb; }

.judul {
  font-weight: 600;
  color: #111827;
}

.cover {
  width: 36px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

.aksi { display: flex; gap: 8px; }

.icon-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  background: #f3f4f6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-edit { color: #5b4dff; }
.icon-hapus { color: #ef4444; }

.icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 4px 0;
  font-size: 13px;
  color: #6b7280;
}

.pages {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pages button {
  min-width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pages .page-num.active {
  background: #5b4dff;
  color: #fff;
}

.pages button:disabled {
  opacity: 0.4;
  cursor: default;
}

.select-sm { min-width: auto; }

.empty { 
    text-align: center; 
    color: #9ca3af; 
    padding: 24px; 
}

.badge-orange {
  background: #fef3c7;
  color: #b45309;
}
</style>