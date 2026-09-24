<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'


const API_URL = '/api/riwayat'

const riwayatList = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const filterTipe = ref('semua')
const tipeMenuOpen = ref(false)
const errorMessage = ref('')

const currentPage = ref(1)
const perPage = ref(5)

const filteredRiwayat = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return riwayatList.value.filter((r) => {
    const cocokTipe = filterTipe.value === 'semua' || r.tipe === filterTipe.value
    const cocokSearch =
      !q ||
      r.nama.toLowerCase().includes(q) ||
      r.judul.toLowerCase().includes(q)
    return cocokTipe && cocokSearch
  })
})

const totalData = computed(() => filteredRiwayat.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalData.value / perPage.value)))

const pagedRiwayat = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredRiwayat.value.slice(start, start + perPage.value)
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

function formatTanggal(tgl) {
  if (!tgl) return '-'
  return new Date(tgl).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function labelTipe(tipe) {
  return { pinjam: 'Pinjam', kembali: 'Kembali', telat: 'Telat', denda: 'Bayar Denda' }[tipe] || tipe
}

async function ambilData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error()
    riwayatList.value = await res.json()
  } catch (err) {
    errorMessage.value = 'Gagal memuat riwayat aktivitas. Pastikan backend aktif (node index.js).'
  } finally {
    isLoading.value = false
  }
}

const tipeOptions = [
  { value: 'semua', label: 'Semua Aktivitas' },
  { value: 'pinjam', label: 'Pinjam' },
  { value: 'kembali', label: 'Kembali' },
  { value: 'telat', label: 'Telat' },
  { value: 'denda', label: 'Bayar Denda' },
]

function labelTipeTerpilih() {
  return tipeOptions.find((t) => t.value === filterTipe.value)?.label || 'Semua Aktivitas'
}

function pilihTipe(value) {
  filterTipe.value = value
  tipeMenuOpen.value = false
  resetPage()
}

function tutupFilterMenu(e) {
  if (!e.target.closest?.('.filter-dropdown')) tipeMenuOpen.value = false
}

onMounted(() => {
  ambilData()
  document.addEventListener('click', tutupFilterMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', tutupFilterMenu)
})
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Riwayat Aktivitas</h1>
        <p class="subtitle">Riwayat peminjaman, pengembalian, dan pembayaran denda.</p>
      </div>
    </div>

    <div v-if="errorMessage" class="banner error">⚠️ {{ errorMessage }}</div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
          </svg>
        </span>
        <input v-model="searchQuery" class="search" placeholder="Cari nama siswa/guru atau judul buku..." @input="resetPage" />
      </div>

      <div class="filter-dropdown">
        <button
          type="button"
          class="filter-dropdown-btn"
          @click.stop="tipeMenuOpen = !tipeMenuOpen"
        >
          {{ labelTipeTerpilih() }}
        </button>
        <ul v-if="tipeMenuOpen" class="filter-dropdown-list">
          <li
            v-for="t in tipeOptions"
            :key="t.value"
            :class="{ aktif: filterTipe === t.value }"
            @click="pilihTipe(t.value)"
          >
            {{ t.label }}
          </li>
        </ul>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width: 120px">Tanggal</th>
            <th style="width: 110px">Aktivitas</th>
            <th>Nama</th>
            <th style="width: 90px">Kelas</th>
            <th>Keterangan</th>
          </tr>
        </thead>
<tbody>
  <tr v-for="item in pagedRiwayat" :key="item.id">
    <td>{{ formatTanggal(item.tanggal) }}</td>
    <td><span class="badge" :class="item.tipe">{{ labelTipe(item.tipe) }}</span></td>
    <td class="judul">{{ item.nama }}</td>
    <td>{{ item.kelas || '-' }}</td>
    <td>{{ item.keterangan }}</td>
  </tr>

  <tr v-if="!isLoading && filteredRiwayat.length === 0">
    <td colspan="5" class="empty">
      {{ searchQuery ? 'Tidak ada aktivitas yang cocok.' : 'Belum ada aktivitas.' }}
    </td>
  </tr>

  <tr v-if="isLoading">
    <td colspan="5" class="empty">Memuat data...</td>
  </tr>
</tbody>
      </table>
    </div>

    <div v-if="!isLoading && filteredRiwayat.length > 0" class="pagination">
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
.page { padding: 24px; background: #f8f9fb; min-height: 100vh; font-family: sans-serif; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; }
.header h1 { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; }
.subtitle { margin: 6px 0 0; font-size: 13px; color: #6b7280; }

.banner { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.banner.error { background: #fee2e2; color: #b91c1c; }

.toolbar { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.search-box { flex: 1; position: relative; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; display: flex; }
.search { width: 100%; box-sizing: border-box; padding: 8px 12px 8px 34px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; outline: none; }
.search:focus { border-color: #5b4dff; }

.filter-select { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #fff; }

.filter-dropdown { position: relative; flex-shrink: 0; min-width: 150px; }
.filter-dropdown-btn {
  width: 100%; font-family: inherit; font-size: 13px;
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 28px 8px 12px;
  color: #000; text-align: left; cursor: pointer; white-space: nowrap;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 8px center;
}
.filter-dropdown-list {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; margin: 0; padding: 6px 0;
  list-style: none; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); z-index: 40;
}
.filter-dropdown-list li { padding: 8px 12px; font-size: 13px; cursor: pointer; }
.filter-dropdown-list li:hover,
.filter-dropdown-list li.aktif { background: #dbeafe; }

@media (max-width: 640px) {
  .filter-dropdown { min-width: 0; }
  .filter-dropdown-list { width: 100%; max-width: 100%; }
}

.table-wrap {
  background: #fff;
  border-radius: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
thead th { font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; }
tbody tr:hover { background: #f9fafb; }
.judul { font-weight: 600; color: #111827; }
.empty { text-align: center; color: #9ca3af; padding: 28px; }
.icon-svg { width: 16px; height: 16px; display: block; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 4px 0;
  font-size: 13px;
  color: #6b7280;
}
.pages { display: flex; align-items: center; gap: 6px; }
.pages button {
  min-width: 32px; height: 32px; border: 0; background: transparent;
  border-radius: 8px; cursor: pointer; color: #4b5563;
  display: inline-flex; align-items: center; justify-content: center;
}
.pages .page-num.active { background: #5b4dff; color: #fff; }
.pages button:disabled { opacity: 0.4; cursor: default; }
.select-sm { min-width: auto; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.badge.pinjam { background: #dbeafe; color: #1d4ed8; }
.badge.kembali { background: #d1fae5; color: #065f46; }
.badge.telat { background: #fee2e2; color: #b91c1c; }
.badge.denda { background: #fef3c7; color: #92400e; }
@media (max-width: 640px) {
  .page {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .search-box,
  .filter-dropdown {
    width: 100%;
  }
  .select {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  background: #fff;
  color: #000;
  outline: none;
  cursor: pointer;
}

.select:focus {
  border-color: #5b4dff;
}

.select-sm {
  min-width: 110px; 
  width: auto;
}

  .table-wrap {
    border-radius: 10px;
    margin: 0 -4px;
  }

  th, td {
    padding: 10px 12px;
    font-size: 12.5px;
  }

  .subtitle {
    font-size: 12px;
  }

    .pagination {
    flex-direction: row;       
    flex-wrap: wrap;           
    justify-content: center;  
    align-items: center;
    gap: 12px;
    padding-top: 16px;
  }

  .range {
    width: 100%;               
    text-align: center;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .pages {
    justify-content: center;
    width: auto;               
  }

  .select-sm {
    width: auto;               
    min-width: 110px;         
    margin-left: 0;
  }
}
</style>