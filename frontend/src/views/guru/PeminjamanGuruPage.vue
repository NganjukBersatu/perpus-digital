<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  guru: {
    type: Object,
    default: () => ({ id: null, nama: '', mapel: '', nip: '' })
  }
})

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE_URL

const loading = ref(true)
const error = ref('')
const keyword = ref('')
const filterStatus = ref('Semua')
const peminjamanAktif = ref([])

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
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

async function fetchPeminjaman() {
  loading.value = true
  error.value = ''

  if (!userId.value) {
    error.value = 'Data guru tidak ditemukan. Silakan login ulang.'
    peminjamanAktif.value = []
    loading.value = false
    return
  }

  try {
    const res = await fetch(
      `${API_BASE}/data-peminjaman?anggotaId=${userId.value}`,
      { headers: authHeaders() }
    )

    if (!res.ok) throw new Error('Gagal mengambil data peminjaman')

    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.data || [])

    peminjamanAktif.value = list
      .map((item) => ({
        id: item.id,
        judul: item.judulBuku || item.judul || '-',
        penulis: item.penulisBuku || item.penulis || '',
        kategori: item.kategori || '',
        tanggalPinjam: item.tanggalPinjam,
        batasKembali: item.batasKembali || item.tanggalKembali,
        status: item.status || 'Dipinjam',
        tanggalDikembalikan: item.tanggalDikembalikan || null
      }))
      .filter((p) => !p.tanggalDikembalikan)
  } catch (err) {
    console.error(err)
    error.value = 'Gagal memuat data peminjaman. Coba refresh halaman.'
    peminjamanAktif.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPeminjaman)

watch(userId, (id) => {
  if (id) fetchPeminjaman()
})

function formatTanggal(tanggal) {
  if (!tanggal) return '—'
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function hitungHariTerlambat(item) {
  if (!item.batasKembali) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(item.batasKembali)
  due.setHours(0, 0, 0, 0)
  const selisih = Math.floor((today - due) / (1000 * 60 * 60 * 24))
  return selisih > 0 ? selisih : 0
}

function isTerlambat(item) {
  return item.status === 'Terlambat' || hitungHariTerlambat(item) > 0
}

function isHampirJatuhTempo(item) {
  if (!item.batasKembali || isTerlambat(item)) return false
  const today = new Date()
  const due = new Date(item.batasKembali)
  const diff = (due - today) / (1000 * 60 * 60 * 24)
  return diff <= 3
}

function statusTampil(item) {
  if (isTerlambat(item)) return 'Terlambat'
  if (isHampirJatuhTempo(item)) return 'Hampir Jatuh Tempo'
  return 'Dipinjam'
}

const jumlahDipinjam = computed(() => peminjamanAktif.value.length)
const jumlahHampir = computed(() => peminjamanAktif.value.filter(isHampirJatuhTempo).length)
const jumlahTerlambat = computed(() => peminjamanAktif.value.filter(isTerlambat).length)

const daftarTampil = computed(() => {
  const q = keyword.value.trim().toLowerCase()

  return peminjamanAktif.value.filter((item) => {
    const cocokKeyword =
      !q ||
      item.judul.toLowerCase().includes(q) ||
      item.penulis.toLowerCase().includes(q)

    const status = statusTampil(item)
    const cocokFilter =
      filterStatus.value === 'Semua' ||
      (filterStatus.value === 'Dipinjam' && status === 'Dipinjam') ||
      (filterStatus.value === 'Hampir Jatuh Tempo' && status === 'Hampir Jatuh Tempo') ||
      (filterStatus.value === 'Terlambat' && status === 'Terlambat')

    return cocokKeyword && cocokFilter
  })
})

function goToKatalog() {
  router.push('/guru/katalog')
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Peminjaman Saya</h1>
      <p class="muted">Daftar buku yang sedang Anda pinjam saat ini.</p>
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
          <div class="stat-value">{{ jumlahDipinjam }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Hampir Jatuh Tempo</div>
          <div class="stat-value">{{ jumlahHampir }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Terlambat</div>
          <div class="stat-value">{{ jumlahTerlambat }}</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-toolbar">
        <h2>Daftar Peminjaman</h2>
        <div class="filter-chips">
          <button
            v-for="f in ['Semua', 'Dipinjam', 'Hampir Jatuh Tempo', 'Terlambat']"
            :key="f"
            class="chip"
            :class="{ active: filterStatus === f }"
            @click="filterStatus = f"
          >
            {{ f }}
          </button>
        </div>
      </div>

      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="keyword" type="text" placeholder="Cari judul atau penulis..." />
      </div>

      <div v-if="loading" class="empty-state">Memuat data peminjaman...</div>
      <div v-else-if="error" class="empty-state error">{{ error }}</div>

      <div v-else-if="peminjamanAktif.length === 0" class="empty-state">
        <p>Belum ada buku yang sedang dipinjam.</p>
        <button class="btn-primary" @click="goToKatalog">Cari Buku</button>
      </div>

      <div v-else-if="daftarTampil.length === 0" class="empty-state">
        Tidak ada peminjaman yang cocok dengan pencarian.
      </div>

      <template v-else>
        <div class="table-wrap">
          <table class="tabel">
            <thead>
              <tr>
                <th>Judul Buku</th>
                <th>Tanggal Pinjam</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
                <th>Keterlambatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in daftarTampil" :key="item.id">
                <td>
                  <div class="book-title">{{ item.judul }}</div>
                  <div v-if="item.penulis" class="book-author">{{ item.penulis }}</div>
                </td>
                <td>{{ formatTanggal(item.tanggalPinjam) }}</td>
                <td>{{ formatTanggal(item.batasKembali) }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="{
                      'status-active': statusTampil(item) === 'Dipinjam',
                      'status-soon': statusTampil(item) === 'Hampir Jatuh Tempo',
                      'status-late': statusTampil(item) === 'Terlambat'
                    }"
                  >
                    {{ statusTampil(item) }}
                  </span>
                </td>
                <td>
                  {{ hitungHariTerlambat(item) > 0 ? hitungHariTerlambat(item) + ' hari' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          Menampilkan {{ daftarTampil.length }} dari {{ peminjamanAktif.length }} data
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
.stat-icon.orange { background: #ffedd5; color: #c2410c; }
.stat-icon.red { background: #fee2e2; color: #b91c1c; }

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
  min-width: 680px;
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

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-active { background: #dbeafe; color: #1d4ed8; }
.status-soon { background: #ffedd5; color: #c2410c; }
.status-late { background: #fee2e2; color: #b91c1c; }

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