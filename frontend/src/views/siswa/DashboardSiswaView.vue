<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  siswa: {
    type: Object,
    default: () => ({})
  }
})

const router = useRouter()
const dataSiswa = computed(() => props.siswa)

const API_BASE = import.meta.env.VITE_API_BASE_URL

const pinjamanAktif = ref([])
const stats = ref({ sedangDipinjam: 0, hampirJatuhTempo: 0, sudahDikembalikan: 0 })
const isLoading = ref(true)
const errorMessage = ref('')

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

async function fetchStats() {
  const res = await fetch(`${API_BASE}/dashboard-siswa/stats`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Gagal mengambil statistik')
  stats.value = await res.json()
}

async function fetchPeminjamanAktif() {
  const res = await fetch(`${API_BASE}/dashboard-siswa/peminjaman-aktif`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Gagal mengambil data peminjaman')
  const data = await res.json()
  pinjamanAktif.value = data.map((item) => ({
    id: item.id,
    judul: item.judul,
    penulis: item.penulis || item.penulisBuku || '',
    kategori: item.kategori || '',
    tanggalPinjam: item.tanggalPinjam,
    jatuhTempo: item.tanggalKembali || item.batasKembali
  }))
}

onMounted(async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([fetchStats(), fetchPeminjamanAktif()])
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Gagal memuat data dashboard'
  } finally {
    isLoading.value = false
  }
})

function isAlmostDue(tanggal) {
  if (!tanggal) return false
  const today = new Date()
  const due = new Date(tanggal)
  const diff = (due - today) / (1000 * 60 * 60 * 24)
  return diff <= 3 && diff >= 0
}

function formatTanggal(tanggal) {
  if (!tanggal) return '—'
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

async function kembalikan(item) {
  if (!confirm(`Yakin ingin mengembalikan "${item.judul}"?`)) return

  try {
    const res = await fetch(`${API_BASE}/dashboard-siswa/kembalikan/${item.id}`, {
      method: 'PATCH',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error('Gagal mengembalikan buku')

    pinjamanAktif.value = pinjamanAktif.value.filter((p) => p.id !== item.id)
    stats.value.sedangDipinjam = Math.max(0, stats.value.sedangDipinjam - 1)
    stats.value.sudahDikembalikan += 1
    alert(`Buku "${item.judul}" berhasil dikembalikan.`)
  } catch (err) {
    console.error(err)
    alert('Gagal mengembalikan buku, coba lagi.')
  }
}

function goToKatalog() {
  router.push('/siswa/katalog')
}

function goToPeminjaman() {
  router.push('/siswa/peminjaman')
}
</script>

<template>
  <div class="page">
    <div class="welcome-banner">
      <div class="welcome-text">
        <h1>Halo, {{ dataSiswa.nama }}!</h1>
        <p>NIS: {{ dataSiswa.nis }} · Kelas {{ dataSiswa.kelas }}</p>
        <p class="welcome-desc">
          Selamat datang di sistem perpustakaan digital.
          Kamu bisa mencari, meminjam, dan mengembalikan buku sendiri.
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
          <div class="stat-value">{{ stats.sedangDipinjam }}</div>
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
          <div class="stat-label">Hampir Jatuh Tempo</div>
          <div class="stat-value">{{ stats.hampirJatuhTempo }}</div>
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
          <div class="stat-value">{{ stats.sudahDikembalikan }}</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-toolbar">
        <h2>Buku yang Sedang Dipinjam</h2>
        <button class="btn-link" @click="goToPeminjaman">Lihat semua</button>
      </div>

      <div v-if="isLoading" class="empty-state">Memuat data...</div>
      <div v-else-if="errorMessage" class="empty-state error">{{ errorMessage }}</div>

      <div v-else-if="pinjamanAktif.length === 0" class="empty-state">
        <p>Kamu belum meminjam buku apa pun.</p>
        <button class="btn-primary" @click="goToKatalog">Cari Buku</button>
      </div>

      <div v-else class="table-wrap">
        <table class="tabel">
          <thead>
            <tr>
              <th>Judul Buku</th>
              <th>Kategori</th>
              <th>Tanggal Pinjam</th>
              <th>Jatuh Tempo</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pinjamanAktif" :key="item.id">
              <td>
                <div class="book-title">{{ item.judul }}</div>
                <div v-if="item.penulis" class="book-author">{{ item.penulis }}</div>
              </td>
              <td>
                <span v-if="item.kategori && item.kategori !== '-'" class="kategori-badge">
                  {{ item.kategori }}
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ formatTanggal(item.tanggalPinjam) }}</td>
              <td>
                <span :class="{ 'due-warning': isAlmostDue(item.jatuhTempo) }">
                  {{ formatTanggal(item.jatuhTempo) }}
                </span>
              </td>
              <td>
                <button class="btn-return" @click="kembalikan(item)">Kembalikan</button>
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
.stat-icon.orange { background: #ffedd5; color: #c2410c; }
.stat-icon.green { background: #dcfce7; color: #15803d; }

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

.due-warning {
  color: #ea580c;
  font-weight: 600;
}

.btn-return {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 36px 16px;
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
  .welcome-illustration {
    display: none;
  }
}
</style>