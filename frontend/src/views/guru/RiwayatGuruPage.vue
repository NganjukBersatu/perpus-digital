<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  guru: {
    type: Object,
    default: () => ({ id: null, nama: '', mapel: '', nip: '' })
  }
})

const API_BASE = import.meta.env.VITE_API_BASE_URL

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

const userFromStorage = (() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
})()

const userId = computed(() => props.guru?.id || userFromStorage.id || null)

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

async function fetchRiwayat() {
  isLoading.value = true
  errorMessage.value = ''

  if (!userId.value) {
    errorMessage.value = 'Data guru tidak ditemukan. Silakan login ulang.'
    riwayat.value = []
    isLoading.value = false
    return
  }

  try {
    const res = await fetch(
      `${API_BASE}/data-peminjaman?anggotaId=${userId.value}`,
      { headers: authHeaders() }
    )

    if (!res.ok) throw new Error('Gagal mengambil riwayat peminjaman')

    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.data || [])

    riwayat.value = list.map((item) => ({
      id: item.id,
      judul: item.judulBuku || item.judul || '-',
      penulis: item.penulisBuku || item.penulis || '',
      kategori: item.kategori || '',
      tanggalPinjam: item.tanggalPinjam,
      tanggalKembali: item.batasKembali || item.tanggalKembali,
      tanggalDikembalikan: item.tanggalDikembalikan || null,
      status: item.status || 'Dipinjam',
      denda: Number(item.denda || 0)
    }))
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Gagal memuat riwayat. Coba periksa koneksi kamu.'
    riwayat.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchRiwayat)

watch(userId, (id) => {
  if (id) fetchRiwayat()
})

const ringkasan = computed(() => ({
  dipinjam: riwayat.value.filter((r) => r.status === 'Dipinjam' && !r.tanggalDikembalikan).length,
  dikembalikan: riwayat.value.filter((r) => r.status === 'Dikembalikan' || r.tanggalDikembalikan).length,
  terlambat: riwayat.value.filter((r) => r.status === 'Terlambat').length
}))

const riwayatTerfilter = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()

  return riwayat.value.filter((item) => {
    const statusAsli = item.tanggalDikembalikan ? 'Dikembalikan' : item.status

    const cocokStatus =
      filterStatus.value === 'semua' ||
      statusAsli === filterStatus.value ||
      item.status === filterStatus.value

    const cocokSearch =
      !q ||
      item.judul.toLowerCase().includes(q) ||
      item.penulis.toLowerCase().includes(q)

    return cocokStatus && cocokSearch
  })
})

function statusClass(status) {
  if (status === 'Dikembalikan') return 'status-done'
  if (status === 'Terlambat') return 'status-late'
  return 'status-active'
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

<template>
  <div class="page">
    <div class="page-header">
      <h1>Riwayat Peminjaman</h1>
      <p class="muted">
        Lihat seluruh riwayat peminjaman buku Anda, dari yang masih berjalan sampai yang sudah selesai.
      </p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Sedang Dipinjam</div>
          <div class="stat-value">{{ ringkasan.dipinjam }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Sudah Dikembalikan</div>
          <div class="stat-value">{{ ringkasan.dikembalikan }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Pernah Terlambat</div>
          <div class="stat-value">{{ ringkasan.terlambat }}</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-toolbar">
        <h2>Semua Riwayat</h2>
        <div class="filter-chips">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="chip"
            :class="{ active: filterStatus === tab.value }"
            @click="filterStatus = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Cari judul atau penulis..." />
      </div>

      <div v-if="isLoading" class="empty-state">Memuat riwayat peminjaman...</div>

      <div v-else-if="errorMessage" class="empty-state error">
        <p>{{ errorMessage }}</p>
        <button class="btn-primary" @click="fetchRiwayat">Coba Lagi</button>
      </div>

      <div v-else-if="riwayatTerfilter.length === 0" class="empty-state">
        Tidak ada riwayat peminjaman yang cocok.
      </div>

      <template v-else>
        <div class="table-wrap">
          <table class="tabel">
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
              <tr v-for="item in riwayatTerfilter" :key="item.id">
                <td>
                  <div class="book-title">{{ item.judul }}</div>
                  <div v-if="item.penulis" class="book-author">{{ item.penulis }}</div>
                </td>
                <td>
                  <span v-if="item.kategori" class="kategori-badge">{{ item.kategori }}</span>
                  <span v-else>—</span>
                </td>
                <td>{{ formatTanggal(item.tanggalPinjam) }}</td>
                <td>{{ formatTanggal(item.tanggalKembali) }}</td>
                <td>{{ item.tanggalDikembalikan ? formatTanggal(item.tanggalDikembalikan) : '—' }}</td>
                <td>
                  <span class="status-badge" :class="statusClass(item.status)">
                    {{ item.status }}
                  </span>
                </td>
                <td>
                  <span v-if="item.denda > 0" class="denda-text">
                    Rp{{ formatRupiah(item.denda) }}
                  </span>
                  <span v-else class="denda-kosong">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          Menampilkan {{ riwayatTerfilter.length }} dari {{ riwayat.length }} data
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 28px;
}

.page-header h1 {
  margin: 0;
  font-size: 1.6rem;
  color: #0f172a;
}

.muted {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  max-width: 560px;
  line-height: 1.5;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin: 20px 0 16px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.blue { background: #dbeafe; color: #2563eb; }
.stat-icon.green { background: #dcfce7; color: #15803d; }
.stat-icon.orange { background: #ffedd5; color: #c2410c; }

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.table-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px 20px 0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.card-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.card-toolbar h2 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 999px;
}

.chip {
  border: none;
  background: transparent;
  color: #475569;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
}

.chip.active {
  background: #fff;
  color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border-radius: 10px;
  padding: 10px 12px;
  color: #94a3b8;
  margin-bottom: 8px;
  max-width: 280px;
}

.search-box input {
  border: none;
  outline: none;
  width: 100%;
  background: transparent;
  font-size: 13px;
  color: #0f172a;
}

.table-wrap {
  overflow-x: auto;
}

.tabel {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

.tabel th {
  text-align: left;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
  padding: 12px 10px;
  border-bottom: 1px solid #eef2f7;
}

.tabel td {
  padding: 14px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #334155;
  vertical-align: middle;
}

.book-title {
  font-weight: 700;
  color: #0f172a;
}

.book-author {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.kategori-badge {
  display: inline-block;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-active { background: #dbeafe; color: #1d4ed8; }
.status-done { background: #dcfce7; color: #15803d; }
.status-late { background: #fee2e2; color: #b91c1c; }

.denda-text {
  color: #b91c1c;
  font-weight: 600;
}

.denda-kosong {
  color: #cbd5e1;
}

.table-footer {
  padding: 12px 4px 16px;
  font-size: 12px;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: #64748b;
}

.empty-state.error {
  color: #dc2626;
}

.btn-primary {
  margin-top: 12px;
  background: #4f46e5;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 800px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>