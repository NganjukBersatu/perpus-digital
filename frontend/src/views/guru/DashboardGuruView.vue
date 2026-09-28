<script setup>
import { ref, computed, watch } from 'vue'
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

function isAlmostDue(tanggal) {
  if (!tanggal) return false
  const today = new Date()
  const due = new Date(tanggal)
  const diff = (due - today) / (1000 * 60 * 60 * 24)
  return diff <= 3 && diff >= 0
}

const jumlahHampirJatuhTempo = computed(
  () => peminjamanAktif.value.filter((p) => isAlmostDue(p.batasKembali)).length
)

const jumlahSelesai = computed(() => riwayatSelesai.value.length)

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function muatData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetch(`${API_BASE}/data-peminjaman?anggotaId=${props.guru.id}`, {
      headers: authHeaders()
    })

    if (res.ok) {
      const data = await res.json()
      semuaPeminjamanSaya.value = data.data || []
    }
  } catch (err) {
    console.error('Gagal memuat data dashboard guru:', err)
    errorMsg.value = 'Gagal memuat data. Coba muat ulang halaman.'
  } finally {
    loading.value = false
  }
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
  if (!confirm(`Yakin ingin mengembalikan "${item.judulBuku || item.judul}"?`)) return

  try {
    const res = await fetch(`${API_BASE}/pengembalian/${item.id}`, {
      method: 'PATCH',
      headers: authHeaders()
    })
    if (!res.ok) throw new Error('Gagal mengembalikan buku')

    const hasil = await res.json()

    semuaPeminjamanSaya.value = semuaPeminjamanSaya.value.map((p) =>
      p.id === item.id ? { ...p, tanggalDikembalikan: new Date().toISOString(), denda: hasil.denda } : p
    )
    alert(`Buku "${item.judulBuku || item.judul}" berhasil dikembalikan.`)
  } catch (err) {
    console.error(err)
    alert('Gagal mengembalikan buku, coba lagi.')
  }
}

function goToKatalog() {
  router.push('/guru/katalog')
}

function goToPeminjaman() {
  router.push('/guru/peminjaman')
}

watch(
  () => props.guru.id,
  (id) => {
    if (id) muatData()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page">
    <!-- Banner -->
    <div class="welcome-banner">
      <div class="welcome-text">
        <h1>Halo, {{ props.guru.nama }}!</h1>
        <p>NIP: {{ props.guru.nip || '-' }} · {{ props.guru.mapel || 'Guru' }}</p>
        <p class="welcome-desc">
          Selamat datang di sistem perpustakaan digital. Anda bisa mencari, meminjam, dan mengelola buku dengan mudah.
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

    <p v-if="errorMsg" class="empty-state error">{{ errorMsg }}</p>

    <!-- Statistik -->
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
          <div class="stat-value">{{ loading ? '—' : jumlahDipinjam }}</div>
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
          <div class="stat-value">{{ loading ? '—' : jumlahHampirJatuhTempo }}</div>
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
          <div class="stat-value">{{ loading ? '—' : jumlahSelesai }}</div>
        </div>
      </div>
    </div>

    <!-- Daftar Buku -->
    <div class="table-card">
      <div class="card-toolbar">
        <h2>Buku yang Sedang Dipinjam</h2>
        <button class="btn-link" @click="goToPeminjaman">Lihat semua</button>
      </div>

      <div v-if="loading" class="empty-state">Memuat data...</div>

      <div v-else-if="peminjamanAktif.length === 0" class="empty-state">
        <p>Anda belum meminjam buku apa pun.</p>
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
            <tr v-for="item in peminjamanAktif" :key="item.id">
              <td data-label="Judul">
                <div class="book-title">{{ item.judulBuku || item.judul }}</div>
                <div v-if="item.penulisBuku || item.penulis" class="book-author">
                  {{ item.penulisBuku || item.penulis }}
                </div>
              </td>
              <td data-label="Kategori">
                <span v-if="item.kategori && item.kategori !== '-'" class="kategori-badge">
                  {{ item.kategori }}
                </span>
                <span v-else>—</span>
              </td>
              <td data-label="Tanggal Pinjam">{{ formatTanggal(item.tanggalPinjam) }}</td>
              <td data-label="Jatuh Tempo">
                <span :class="{ 'due-warning': isAlmostDue(item.batasKembali) }">
                  {{ formatTanggal(item.batasKembali) }}
                </span>
              </td>
              <td data-label="Aksi">
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
  .page {
    padding: 16px 12px 24px;
  }

  .welcome-banner {
    padding: 16px;
    align-items: flex-start;
  }

  .welcome-illustration {
    display: none;
  }

  .welcome-text h1 {
    font-size: 1.2rem;
  }

  .welcome-desc {
    max-width: none;
    margin: 8px 0 12px !important;
  }

  .banner-actions {
    width: 100%;
  }

  .btn-banner,
  .btn-banner-outline {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .stats-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .stat-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 8px;
    gap: 8px;
    border-radius: 12px;
  }

  .stat-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .stat-icon svg {
    width: 14px;
    height: 14px;
  }

  .stat-label {
    font-size: 10px;
    line-height: 1.25;
  }

  .stat-value {
    font-size: 18px;
  }

  .table-card {
    padding: 14px 12px;
  }

  .card-toolbar h2 {
    font-size: 14px;
  }

  .tabel {
    min-width: 0;
  }

  .tabel thead {
    display: none;
  }

  .tabel,
  .tabel tbody,
  .tabel tr,
  .tabel td {
    display: block;
    width: 100%;
  }

  .tabel tr {
    border: 1px solid #eef2f7;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 10px;
  }

  .tabel td {
    border: none;
    padding: 6px 0;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .tabel td::before {
    content: attr(data-label);
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .tabel td:first-child {
    display: block;
  }

  .tabel td:first-child::before {
    display: none;
  }

  .tabel td:last-child {
    padding-top: 10px;
  }

  .btn-return {
    width: 100%;
  }
}
</style>