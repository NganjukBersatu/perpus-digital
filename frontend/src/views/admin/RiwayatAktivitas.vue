<script setup>
import { ref, computed, onMounted } from 'vue'

const API_URL = 'http://localhost:3000/api/riwayat'

const riwayatList = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const filterTipe = ref('semua')
const errorMessage = ref('')

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

onMounted(ambilData)
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
        <input v-model="searchQuery" class="search" placeholder="Cari nama siswa/guru atau judul buku..." />
      </div>

      <select v-model="filterTipe" class="filter-select">
        <option value="semua">Semua Aktivitas</option>
        <option value="pinjam">Pinjam</option>
        <option value="kembali">Kembali</option>
        <option value="telat">Telat</option>
        <option value="denda">Bayar Denda</option>
      </select>
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
          <tr v-for="item in filteredRiwayat" :key="item.id">
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

.table-wrap { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
thead th { font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; }
tbody tr:hover { background: #f9fafb; }
.judul { font-weight: 600; color: #111827; }
.empty { text-align: center; color: #9ca3af; padding: 28px; }
.icon-svg { width: 16px; height: 16px; display: block; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.badge.pinjam { background: #dbeafe; color: #1d4ed8; }
.badge.kembali { background: #d1fae5; color: #065f46; }
.badge.telat { background: #fee2e2; color: #b91c1c; }
.badge.denda { background: #fef3c7; color: #92400e; }
</style>