<template>
  <div class="content">
    <div class="welcome-banner">
      <div class="welcome-text">
        <h1>Halo, {{ dataSiswa.nama }}!</h1>
        <p>NIS: {{ dataSiswa.nis }} · Kelas {{ dataSiswa.kelas }}</p>
        <p class="welcome-desc">
          Selamat datang di sistem perpustakaan digital.
          Kamu bisa mencari, meminjam, dan mengembalikan buku sendiri.
        </p>
        <button class="btn-banner" @click="goToKatalog">Cari Buku Sekarang</button>
      </div>
      <div class="welcome-illustration">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="80" height="80">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <line x1="12" y1="6" x2="12" y2="14"/>
          <line x1="9" y1="10" x2="15" y2="10"/>
        </svg>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <div>
          <p class="stat-label">Sedang Dipinjam</p>
          <p class="stat-value">{{ pinjamanAktif.length }}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <p class="stat-label">Hampir Jatuh Tempo</p>
          <p class="stat-value">{{ hampirJatuhTempo }}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <p class="stat-label">Sudah Dikembalikan</p>
          <p class="stat-value">12</p>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Buku yang Sedang Dipinjam</h2>
      </div>

      <div v-if="pinjamanAktif.length === 0" class="empty-state">
        <p>Kamu belum meminjam buku apa pun.</p>
        <button class="btn-primary" @click="goToKatalog">Cari Buku</button>
      </div>

      <div v-else class="table-wrapper">
        <table>
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
              <td class="book-title">{{ item.judul }}</td>
              <td><span class="badge">{{ item.kategori }}</span></td>
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

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  siswa: {
    type: Object,
    default: () => ({
      nama: 'Ahmad Fauzi',
      nis: '2024001',
      kelas: 'X TPM 2',
      role: 'Siswa'
    })
  }
})

const router = useRouter()
const dataSiswa = computed(() => props.siswa)

const pinjamanAktif = ref([
  { id: 1, judul: 'Laskar Pelangi', kategori: 'Fiksi', tanggalPinjam: '2026-08-28', jatuhTempo: '2026-09-11' },
  { id: 2, judul: 'Bumi Manusia', kategori: 'Fiksi', tanggalPinjam: '2026-09-01', jatuhTempo: '2026-09-15' },
  { id: 3, judul: 'Filosofi Teras', kategori: 'Non-Fiksi', tanggalPinjam: '2026-09-02', jatuhTempo: '2026-09-07' }
])

const hampirJatuhTempo = computed(() => {
  return pinjamanAktif.value.filter(item => isAlmostDue(item.jatuhTempo)).length
})

function isAlmostDue(tanggal) {
  const today = new Date()
  const due = new Date(tanggal)
  const diff = (due - today) / (1000 * 60 * 60 * 24)
  return diff <= 3 && diff >= 0
}

function formatTanggal(tanggal) {
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function kembalikan(item) {
  if (confirm(`Yakin ingin mengembalikan "${item.judul}"?`)) {
    pinjamanAktif.value = pinjamanAktif.value.filter(p => p.id !== item.id)
    alert(`Buku "${item.judul}" berhasil dikembalikan.`)
  }
}

function goToKatalog() {
  router.push('/siswa/katalog')
}
</script>

<style scoped>
.content {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-banner {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.welcome-text h1 {
  margin: 0 0 6px;
  font-size: 1.6rem;
}

.welcome-text p {
  margin: 0 0 4px;
  opacity: 0.9;
}

.welcome-desc {
  margin: 12px 0 20px !important;
  max-width: 420px;
  line-height: 1.5;
  opacity: 0.85 !important;
}

.btn-banner {
  background: white;
  color: #1e40af;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.welcome-illustration {
  opacity: 0.9;
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
}

.stat-icon.blue { background: #dbeafe; color: #1e40af; }
.stat-icon.orange { background: #ffedd5; color: #c2410c; }
.stat-icon.green { background: #dcfce7; color: #15803d; }

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
}

.section-header h2 {
  margin: 0 0 20px;
  font-size: 1.15rem;
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
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.95rem;
  color: #334155;
}

.book-title {
  font-weight: 600;
  color: #0f172a;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 20px;
  font-size: 0.8rem;
}

.due-warning {
  color: #ea580c;
  font-weight: 600;
}

.btn-return {
  background: #ef4444;
  color: white;
  border: none;
  padding: 7px 14px;
  border-radius: 7px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.btn-primary {
  margin-top: 12px;
  background: #2563eb;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: 1fr;
  }
  .welcome-illustration {
    display: none;
  }
}
</style>