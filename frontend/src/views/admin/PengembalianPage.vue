<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const summary = ref({ totalDikembalikan: 0, hariIni: 0, tepatWaktu: 0, terlambat: 0 })
const data = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(5)
const search = ref('')
const status = ref('Semua')
const totalPages = ref(1)

const fetchSummary = async () => {
  const res = await axios.get('http://localhost:3000/api/pengembalian/summary')
  summary.value = res.data
}

const fetchData = async () => {
  const res = await axios.get('http://localhost:3000/api/pengembalian', {
    params: { search: search.value, status: status.value, page: page.value, limit: limit.value },
  })
  data.value = res.data.data
  total.value = res.data.total
  totalPages.value = Math.max(1, Math.ceil(total.value / limit.value))
}

const persenTepatWaktu = () => summary.value.totalDikembalikan ? Math.round((summary.value.tepatWaktu / summary.value.totalDikembalikan) * 100) : 0
const persenTerlambat = () => summary.value.totalDikembalikan ? Math.round((summary.value.terlambat / summary.value.totalDikembalikan) * 100) : 0

const formatTanggal = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const initial = (nama) => nama ? nama.charAt(0).toUpperCase() : '?'

onMounted(() => { fetchSummary(); fetchData() })
watch([search, status, limit], () => { page.value = 1; fetchData() })
watch(page, fetchData)
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Pengembalian</h1>
        <p class="subtitle">Daftar buku yang telah dikembalikan.</p>
      </div>
      <button class="btn-outline">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        1 - 4 September 2026
      </button>
    </div>

    <div class="cards">
      <div class="card">
        <div class="icon green">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <p class="label">Total Dikembalikan</p>
        <p class="value">{{ summary.totalDikembalikan }}</p>
        <p class="unit">buku</p>
        <a class="link">Lihat detail →</a>
      </div>

      <div class="card">
        <div class="icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <p class="label">Hari Ini</p>
        <p class="value">{{ summary.hariIni }}</p>
        <p class="unit">buku</p>
        <a class="link">Lihat detail →</a>
      </div>

      <div class="card">
        <div class="icon orange">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <p class="label">Tepat Waktu</p>
        <p class="value">{{ summary.tepatWaktu }}</p>
        <p class="unit">buku ({{ persenTepatWaktu() }}%)</p>
        <a class="link">Lihat detail →</a>
      </div>
    
      <div class="card">
        <div class="icon red">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="13" r="8"/>
            <path d="M12 9v4l2 2"/>
            <path d="M5 3 3 5"/>
            <path d="M22 5l-2-2"/>
            <path d="M6.5 3.5 5 5"/>
          </svg>
        </div>
        <p class="label">Terlambat</p>
        <p class="value">{{ summary.terlambat }}</p>
        <p class="unit">buku ({{ persenTerlambat() }}%)</p>
        <a class="link">Lihat detail →</a>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="search" placeholder="Cari nama peminjam, buku, atau ISBN..." class="search" />
      <select v-model="status" class="select">
        <option value="Semua">Semua Status</option>
        <option value="Tepat Waktu">Tepat Waktu</option>
        <option value="Terlambat">Terlambat</option>
      </select>
      <button class="btn-outline">01/09/2026 - 04/09/2026</button>
      <button class="btn-outline">▽ Filter</button>
      <button class="btn-primary">⭳ Export</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th><th>Peminjam</th><th>Buku</th><th>Tanggal Pinjam</th>
            <th>Batas Kembali</th><th>Tanggal Kembali</th><th>Status</th>
            <th>Keterlambatan</th><th>Denda</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in data" :key="row.id">
            <td>{{ (page - 1) * limit + i + 1 }}</td>
            <td>
              <div class="peminjam">
                <div class="avatar">{{ initial(row.namaPeminjam) }}</div>
                <div>
                  <p class="nama">{{ row.namaPeminjam }}</p>
                  <p class="kelas">{{ row.kelasPeminjam }}</p>
                </div>
              </div>
            </td>
            <td>
              <p class="nama">{{ row.judulBuku }}</p>
              <p class="kelas">{{ row.penulisBuku }}</p>
            </td>
            <td>{{ formatTanggal(row.tanggalPinjam) }}</td>
            <td>{{ formatTanggal(row.batasKembali) }}</td>
            <td>{{ formatTanggal(row.tanggalDikembalikan) }}</td>
            <td>
              <span :class="['badge', row.status === 'Terlambat' ? 'badge-red' : 'badge-green']">
                {{ row.status }}
              </span>
            </td>
            <td>{{ row.keterlambatan }}</td>
            <td>Rp{{ (row.denda || 0).toLocaleString('id-ID') }}</td>
            <td><button class="btn-link">📄 Detail</button></td>
          </tr>
          <tr v-if="data.length === 0">
            <td colspan="10" class="empty">Belum ada data pengembalian</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <span>Menampilkan {{ data.length }} dari {{ total }} data</span>
        <div class="pagination">
          <button :disabled="page === 1" @click="page--">‹</button>
          <button
            v-for="p in Math.min(totalPages, 3)" :key="p"
            :class="{ active: page === p }" @click="page = p"
          >{{ p }}</button>
          <span v-if="totalPages > 3">...</span>
          <button :disabled="page === totalPages" @click="page++">›</button>
        </div>
        <select v-model="limit" class="select">
          <option :value="5">5 / halaman</option>
          <option :value="10">10 / halaman</option>
          <option :value="20">20 / halaman</option>
        </select>
      </div>
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

.subtitle { 
    font-size: 13px; 
    color: #9ca3af; 
    margin: 2px 0 0; 
}

.btn-outline { 
    background: #fff; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 12px; 
    font-size: 13px; 
    color: #4b5563; 
    cursor: pointer; 
    display: inline-flex; 
    align-items: center; 
    gap: 6px; 
}

.btn-outline svg { 
    flex-shrink: 0; 
}

.btn-primary { 
    background: #2563eb; 
    color: #fff; 
    border: none; 
    border-radius: 8px; 
    padding: 8px 14px; 
    font-size: 13px; 
    cursor: pointer; 
}

.btn-link { 
    background: none; 
    border: none; 
    color: #2563eb; 
    font-size: 12px; 
    cursor: pointer; 
}

.cards { 
    display: grid; 
    grid-template-columns: repeat(4, 1fr); 
    gap: 16px; 
    margin-bottom: 20px; 
}

.card { 
    background: #fff; 
    border-radius: 12px; 
    padding: 16px; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
}

.icon { 
    width: 36px; 
    height: 36px; 
    border-radius: 8px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    margin-bottom: 10px; 
    font-size: 16px; 
}

.icon.green { 
    background: #d1fae5; 
}

.icon.blue { 
    background: #dbeafe; 
}

.icon.orange { 
    background: #ffedd5; 
}

.icon.red { 
    background: #fee2e2; 
}

.label { 
    font-size: 12px; 
    color: #9ca3af; 
    margin: 0; 
}

.value { 
    font-size: 24px; 
    font-weight: 700; 
    color: #1f2937; 
    margin: 2px 0; 
}

.unit { 
    font-size: 12px; 
    color: #9ca3af; 
    margin: 0 0 8px; 
}

.link { 
    font-size: 12px; 
    color: #2563eb; 
    text-decoration: none; 
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

.select { 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 10px; 
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

thead { 
    background: #f9fafb; 
}

th { 
    text-align: left; 
    padding: 12px 16px; 
    color: #9ca3af; 
    font-weight: 500; 
    font-size: 12px; 
}

td { 
    padding: 12px 16px; 
    border-top: 1px solid #f3f4f6; 
    color: #374151; 
    vertical-align: middle; 
}

.peminjam { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
}

.avatar { 
    width: 28px; 
    height: 28px; 
    border-radius: 50%; 
    background: #dbeafe; 
    color: #2563eb; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 12px; 
    font-weight: 700; 
}

.nama { 
    font-weight: 500; 
    margin: 0; 
}

.kelas { 
    font-size: 12px; 
    color: #9ca3af; 
    margin: 0; 
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

.empty { 
    text-align: center; 
    color: #9ca3af; 
    padding: 24px; 
}

.footer { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 12px 16px; 
    border-top: 1px solid #f3f4f6; 
    font-size: 13px; 
    color: #6b7280; 
}

.pagination { 
    display: flex; 
    gap: 4px; 
}

.pagination button { 
    border: 1px solid #e5e7eb; 
    background: #fff; 
    border-radius: 6px; 
    padding: 4px 10px; 
    cursor: pointer; 
}

.pagination button.active { 
    background: #2563eb; 
    color: #fff; 
    border-color: #2563eb; 
}
</style>