<template>
  <div class="content">

    <div class="page-header">
      <h1>Riwayat Pinjam</h1>
      <p>Lihat seluruh riwayat peminjaman buku kamu, dari yang masih berjalan sampai yang sudah selesai.</p>
    </div>

    <div class="stats">

      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>

        <div>
          <p class="stat-label">Sedang Dipinjam</p>
          <p class="stat-value">{{ ringkasan.dipinjam }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <div>
          <p class="stat-label">Sudah Dikembalikan</p>
          <p class="stat-value">{{ ringkasan.dikembalikan }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71 3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div>
          <p class="stat-label">Pernah Terlambat</p>
          <p class="stat-value">{{ ringkasan.terlambat }}</p>
        </div>
      </div>

    </div>

    <div class="section-card">

      <div class="section-header">
        <h2>Semua Riwayat</h2>

        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: filterStatus === tab.value }"
            @click="filterStatus = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari judul buku..."
        />
      </div>

      <div v-if="isLoading" class="empty-state">
        <p>Memuat riwayat peminjaman...</p>
      </div>

      <div v-else-if="errorMessage" class="empty-state">
        <p>{{ errorMessage }}</p>

        <button class="btn-primary" @click="fetchRiwayat">
          Coba Lagi
        </button>
      </div>

      <div v-else-if="riwayatTerfilter.length === 0" class="empty-state">
        <p>Tidak ada riwayat peminjaman yang cocok.</p>
      </div>

      <div v-else class="table-wrapper">

        <table>
          <thead>
            <tr>
              <th>Judul Buku</th>
              <th>Kategori</th>
              <th>Tanggal Pinjam</th>
              <th>Jatuh Tempo</th>
              <th>Tanggal Kembali</th>
              <th>Status</th>
              <th>Denda</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in riwayatTerfilter"
              :key="item.id"
            >
              <td class="book-title">
                {{ item.judul }}
              </td>

              <td>
                <span
                  class="badge"
                  v-if="item.kategori"
                >
                  {{ item.kategori }}
                </span>
              </td>

              <td>
                {{ formatTanggal(item.tanggalPinjam) }}
              </td>

              <td>
                {{ formatTanggal(item.tanggalKembali) }}
              </td>

              <td>
                {{
                  item.tanggalDikembalikan
                    ? formatTanggal(item.tanggalDikembalikan)
                    : '—'
                }}
              </td>

              <td>
                <span
                  class="badge"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>
              </td>

              <td>
                <span
                  v-if="item.denda > 0"
                  class="denda-text"
                >
                  Rp{{ formatRupiah(item.denda) }}
                </span>

                <span
                  v-else
                  class="denda-kosong"
                >
                  —
                </span>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const riwayat = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')
const filterStatus = ref('semua')

const tabs = [
  { label: 'Semua', value: 'semua' },
  { label: 'Dipinjam', value: 'Dipinjam' },
  { label: 'Dikembalikan', value: 'Dikembalikan' },
  { label: 'Terlambat', value: 'Terlambat' }
]

function authHeaders() {
  const token = localStorage.getItem('token')

  return {
    Authorization: `Bearer ${token}`
  }
}

async function fetchRiwayat() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(
      `${API_BASE}/dashboard-siswa/riwayat`,
      {
        headers: authHeaders()
      }
    )

    if (!res.ok) {
      throw new Error('Gagal mengambil riwayat peminjaman')
    }

    riwayat.value = await res.json()

  } catch (err) {
    console.error(err)
    errorMessage.value =
      'Gagal memuat riwayat. Coba periksa koneksi kamu.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchRiwayat)

const ringkasan = computed(() => {
  return {
    dipinjam: riwayat.value.filter(
      r => r.status === 'Dipinjam'
    ).length,

    dikembalikan: riwayat.value.filter(
      r => r.status === 'Dikembalikan'
    ).length,

    terlambat: riwayat.value.filter(
      r => r.status === 'Terlambat'
    ).length
  }
})

const riwayatTerfilter = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()

  return riwayat.value.filter(item => {
    const cocokStatus =
      filterStatus.value === 'semua' ||
      item.status === filterStatus.value

    const cocokSearch =
      !q ||
      item.judul?.toLowerCase().includes(q)

    return cocokStatus && cocokSearch
  })
})

function statusClass(status) {
  if (status === 'Dikembalikan') {
    return 'badge-hijau'
  }

  if (status === 'Terlambat') {
    return 'badge-merah'
  }

  return 'badge-biru'
}

function formatTanggal(tanggal) {
  if (!tanggal) return '—'

  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatRupiah(angka) {
  return Number(angka).toLocaleString('id-ID')
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
  max-width: 520px;
  line-height: 1.5;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.blue {
  background: #dbeafe;
  color: #1e40af;
}

.stat-icon.orange {
  background: #ffedd5;
  color: #c2410c;
}

.stat-icon.green {
  background: #dcfce7;
  color: #15803d;
}

.stat-label {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.stat-value {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.section-card {
  background: white;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.filter-tab {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.filter-tab:hover {
  color: #1e40af;
}

.filter-tab.active {
  background: white;
  color: #1e40af;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.search-box {
  max-width: 320px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border-radius: 10px;
  padding: 9px 14px;
  color: #94a3b8;
}

.search-box input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.9rem;
  color: #0f172a;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
  color: #334155;
  white-space: nowrap;
}

.book-title {
  font-weight: 600;
  color: #0f172a;
  white-space: normal;
  min-width: 160px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}

.badge-biru {
  background: #dbeafe;
  color: #1e40af;
}

.badge-hijau {
  background: #dcfce7;
  color: #15803d;
}

.badge-merah {
  background: #fee2e2;
  color: #b91c1c;
}

.denda-text {
  color: #b91c1c;
  font-weight: 600;
}

.denda-kosong {
  color: #cbd5e1;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

@media (max-width: 700px) {
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>