<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <span class="logo-text">PerpusDigital</span>
      </div>

      <nav class="menu">
        <a href="#" class="menu-item active">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Dashboard
        </a>
        <a href="#" class="menu-item" @click.prevent="goToKatalog">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Katalog Buku
        </a>
        <a href="#" class="menu-item">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Riwayat Pinjam
        </a>
        <a href="#" class="menu-item">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Profil
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="btn-logout" @click="logout">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="main">
<!-- Top Header (Sticky) -->
<header class="topbar">
  <div class="search-box">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input type="text" placeholder="Cari buku..." />
  </div>
  <div class="topbar-right">
    <button class="icon-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </button>
    <div class="user-chip">
      <div class="avatar">{{ siswa.nama.charAt(0) }}</div>
      <span>{{ siswa.nama }}</span>
    </div>
  </div>
</header>

      <!-- Content -->
      <div class="content">
        <!-- Welcome Banner -->
        <div class="welcome-banner">
          <div class="welcome-text">
            <h1>Halo, {{ siswa.nama }}!</h1>
            <p>NIS: {{ siswa.nis }} · Kelas {{ siswa.kelas }}</p>
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

        <!-- Stats -->
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

        <!-- Pinjaman Aktif -->
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
                  <td>
                    <span class="badge">{{ item.kategori }}</span>
                  </td>
                  <td>{{ formatTanggal(item.tanggalPinjam) }}</td>
                  <td>
                    <span :class="{ 'due-warning': isAlmostDue(item.jatuhTempo) }">
                      {{ formatTanggal(item.jatuhTempo) }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-return" @click="kembalikan(item)">
                      Kembalikan
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const siswa = ref({
  nama: 'Ahmad Fauzi',
  nis: '2024001',
  kelas: 'X IPA 2'
})

const pinjamanAktif = ref([
  {
    id: 1,
    judul: 'Laskar Pelangi',
    kategori: 'Fiksi',
    tanggalPinjam: '2026-08-28',
    jatuhTempo: '2026-09-11'
  },
  {
    id: 2,
    judul: 'Bumi Manusia',
    kategori: 'Fiksi',
    tanggalPinjam: '2026-09-01',
    jatuhTempo: '2026-09-15'
  },
  {
    id: 3,
    judul: 'Filosofi Teras',
    kategori: 'Non-Fiksi',
    tanggalPinjam: '2026-09-02',
    jatuhTempo: '2026-09-07'
  }
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
  alert('Halaman Katalog belum dibuat')
}

function logout() {
  router.push('/')
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.layout {
  display: flex;
  min-height: 100vh;
  background: #f0f5ff;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ========== SIDEBAR (Fixed) ========== */
.sidebar {
  width: 240px;
  background: #1e40af;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  overflow-y: auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 28px;
  font-size: 1.2rem;
  font-weight: 700;
}

.logo-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

.menu-item.active {
  background: white;
  color: #1e40af;
  font-weight: 600;
}

.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

/* ========== MAIN ========== */
.main {
  margin-left: 240px;
  width: calc(100% - 240px);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ========== TOPBAR (Fixed) ========== */
.topbar {
  position: fixed;
  top: 0;
  left: 240px;
  right: 0;
  height: 68px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  background: white;
  border-bottom: 1px solid #e0e7ff;
  z-index: 90;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.search-box input {
  width: 280px;
  height: 42px;
  padding: 0 16px 0 42px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  font-size: 0.95rem;
  background: #f8fafc;
  outline: none;
}

.search-box input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-btn {
  background: #f1f5f9;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
  flex-shrink: 0;
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
}

.avatar {
  width: 36px;
  height: 36px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

/* Content harus diberi jarak dari topbar */
.content {
  padding: 28px;
  padding-top: 100px; /* naikkan dari 96px */
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Content */
.content {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Welcome Banner */
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
  font-size: 0.95rem;
}

.btn-banner:hover {
  background: #eff6ff;
}

.welcome-illustration {
  opacity: 0.9;
  color: white;
}

/* Stats */
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

/* Section Card */
.section-card {
  background: white;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

/* Table */
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
  letter-spacing: 0.03em;
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
  font-weight: 500;
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
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-return:hover {
  background: #dc2626;
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
  font-weight: 500;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 900px) {
  .sidebar {
    width: 72px;
    padding: 20px 10px;
  }

  .logo-text,
  .menu-item span:not(.menu-icon),
  .btn-logout span:not(.menu-icon) {
    display: none;
  }

  .menu-item,
  .btn-logout {
    justify-content: center;
  }

  .main {
    margin-left: 72px;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .welcome-illustration {
    display: none;
  }
}
</style>