<script setup>
import { ref, computed, onMounted } from 'vue'
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
const errorMsg = ref('')

const totalBuku = ref(0)
const semuaPeminjamanSaya = ref([])

const peminjamanAktif = computed(() =>
  semuaPeminjamanSaya.value.filter((p) => !p.tanggalDikembalikan)
)

const riwayatSelesai = computed(() =>
  semuaPeminjamanSaya.value.filter((p) => p.tanggalDikembalikan)
)

const jumlahDipinjam = computed(
  () => peminjamanAktif.value.filter((p) => p.status === 'Dipinjam').length
)
const jumlahTerlambat = computed(
  () => peminjamanAktif.value.filter((p) => p.status === 'Terlambat').length
)
const jumlahSelesai = computed(() => riwayatSelesai.value.length)

async function muatData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    const [resBuku, resPeminjaman] = await Promise.all([
      fetch(`${API_BASE}/buku`, { headers }),
      fetch(`${API_BASE}/data-peminjaman?anggotaId=${props.guru.id}`, { headers })
    ])

    if (resBuku.ok) {
      const dataBuku = await resBuku.json()
      totalBuku.value = Array.isArray(dataBuku) ? dataBuku.length : 0
    }

    if (resPeminjaman.ok) {
      const dataPeminjaman = await resPeminjaman.json()
      semuaPeminjamanSaya.value = dataPeminjaman.data || []
    }
  } catch (err) {
    console.error('Gagal memuat data dashboard guru:', err)
    errorMsg.value = 'Gagal memuat data. Coba muat ulang halaman.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.guru.id) muatData()
})

function formatTanggal(tanggal) {
  if (!tanggal) return '—'
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function isAlmostDue(tanggal) {
  if (!tanggal) return false
  const today = new Date()
  const due = new Date(tanggal)
  const diff = (due - today) / (1000 * 60 * 60 * 24)
  return diff <= 3 && diff >= 0
}

function goToKatalog() {
  router.push('/guru/katalog')
}

function goToPeminjaman() {
  router.push('/guru/peminjaman')
}
</script>

<template>
  <div class="page">
    <div class="welcome-banner">
      <div class="welcome-text">
        <h1>Halo, {{ props.guru.nama }}!</h1>
        <p>NIP: {{ props.guru.nip || '-' }} · {{ props.guru.mapel || 'Guru' }}</p>
        <p class="welcome-desc">
          Selamat datang di sistem perpustakaan digital.
          Anda bisa mencari, meminjam, dan mengelola buku dengan mudah.
        </p>
        <div class="banner-actions">
          <button class="btn-banner" @click="goToKatalog">Cari Buku Sekarang</button>
          <button class="btn-banner-outline" @click="goToPeminjaman">Lihat Peminjaman Saya</button>
        </div>
      </div>
      <div class="welcome-illustration">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="72" height="72">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
    </div>

    <p v-if="errorMsg" class="info-text error">{{ errorMsg }}</p>
    <p v-else-if="loading" class="info-text">Memuat data...</p>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Total Koleksi</div>
          <div class="stat-value">{{ totalBuku }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
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
          <div class="stat-label">Terlambat</div>
          <div class="stat-value">{{ jumlahTerlambat }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div class="stat-label">Sudah Dikembalikan</div>
          <div class="stat-value">{{ jumlahSelesai }}</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-toolbar">
        <h2>Buku yang Sedang Dipinjam</h2>
        <button class="btn-link" @click="goToPeminjaman">Lihat semua</button>
      </div>

      <div v-if="!loading && peminjamanAktif.length === 0" class="empty-state">
        <p>Anda belum meminjam buku apa pun.</p>
        <button class="btn-primary" @click="goToKatalog">Cari Buku</button>
      </div>

      <div v-else-if="peminjamanAktif.length" class="table-wrap">
        <table class="tabel">
          <thead>
            <tr>
              <th>Judul Buku</th>
              <th>Penulis</th>
              <th>Tanggal Pinjam</th>
              <th>Batas Kembali</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in peminjamanAktif" :key="item.id">
              <td>
                <div class="book-title">{{ item.judulBuku || item.judul }}</div>
              </td>
              <td>{{ item.penulisBuku || item.penulis || '—' }}</td>
              <td>{{ formatTanggal(item.tanggalPinjam) }}</td>
              <td>
                <span :class="{ 'due-warning': isAlmostDue(item.batasKembali) }">
                  {{ formatTanggal(item.batasKembali) }}
                </span>
              </td>
              <td>
                <span
                  class="status-badge"
                  :class="item.status === 'Terlambat' ? 'status-late' : 'status-active'"
                >
                  {{ item.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 28px;
}

.welcome-banner {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  margin-bottom: 16px;
}

.welcome-text h1 {
  margin: 0 0 4px;
  font-size: 1.45rem;
}

.welcome-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 13px;
}

.welcome-desc {
  margin: 10px 0 16px !important;
  max-width: 420px;
  line-height: 1.5;
  opacity: 0.85 !important;
}

.banner-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-banner {
  background: #fff;
  color: #1e40af;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.btn-banner-outline {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.7);
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.welcome-illustration {
  opacity: 0.9;
}

.info-text {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px;
}

.info-text.error {
  color: #dc2626;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;
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
.stat-icon.purple { background: #ede9fe; color: #7c3aed; }

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
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.card-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-toolbar h2 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.btn-link {
  background: none;
  border: none;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
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

.due-warning {
  color: #ea580c;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-active { background: #dcfce7; color: #15803d; }
.status-late { background: #fee2e2; color: #b91c1c; }

.empty-state {
  text-align: center;
  padding: 36px 16px;
  color: #64748b;
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

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .welcome-illustration {
    display: none;
  }
}
</style>