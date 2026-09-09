<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { logoutUser } from '@/utils/auth'

const router = useRouter()

const admin = ref({
  nama: 'Admin Perpustakaan',
  role: 'Pustakawan'
})

const notifikasi = ref({
  terlambat: { jumlah: 0, waktu: null },
  jatuhTempoHariIni: { jumlah: 0, waktu: null },
})
const notifOpen = ref(false)

const jumlahJenisNotifikasi = computed(() => {
  let jenis = 0
  if (notifikasi.value.terlambat.jumlah > 0) jenis++
  if (notifikasi.value.jatuhTempoHariIni.jumlah > 0) jenis++
  return jenis
})

async function fetchNotifikasi() {
  try {
    const res = await fetch('http://localhost:3000/api/dashboard/notifikasi')
    notifikasi.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil notifikasi', err)
  }
}

function toggleNotif() {
  notifOpen.value = !notifOpen.value
}

function closeNotifOutside(e) {
  if (!e.target.closest('.notif-wrap')) notifOpen.value = false
}

function formatWaktu(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function closeNotifOnScroll() {
  if (notifOpen.value) notifOpen.value = false
}

onMounted(() => {
  fetchNotifikasi()
  window.addEventListener('click', closeNotifOutside)
  window.addEventListener('scroll', closeNotifOnScroll, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeNotifOutside)
  window.removeEventListener('scroll', closeNotifOnScroll, { capture: true })
})

const sidebarOpen = ref(true)

const showLogoutModal = ref(false)

function mintaLogout() {
  showLogoutModal.value = true
}

function batalLogout() {
  showLogoutModal.value = false
}

function konfirmasiLogout() {
  showLogoutModal.value = false
  logoutUser(router)
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

const searchQuery = ref('')
const searchResults = ref({ buku: [], siswa: [], guru: [] })
const searchOpen = ref(false)
let searchTimeout = null

function onSearchInput() {
  clearTimeout(searchTimeout)
  const q = searchQuery.value.trim()

  if (!q) {
    searchResults.value = { buku: [], siswa: [], guru: [] }
    searchOpen.value = false
    return
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`)
      searchResults.value = await res.json()
      searchOpen.value = true
    } catch (err) {
      console.error('Gagal mencari', err)
    }
  }, 300)
}

function pilihHasilBuku(item) {
  searchOpen.value = false
  searchQuery.value = ''
  router.push(`/admin/data-buku?highlight=${item.id}`)
}

function pilihHasilSiswa(item) {
  searchOpen.value = false
  searchQuery.value = ''
  router.push(`/admin/data-siswa?highlight=${item.id}`)
}

function pilihHasilGuru(item) {
  searchOpen.value = false
  searchQuery.value = ''
  router.push(`/admin/data-guru?highlight=${item.id}`)
}

function tutupSearchDelay() {
  setTimeout(() => { searchOpen.value = false }, 150)
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar" :class="{ 'sidebar-closed': !sidebarOpen }">
      <div class="brand">
        <svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <div class="brand-text">
          <div class="brand-title">MANAGEMENT PERPUS</div>
          <div class="brand-sub">SMK NEGERI 1 KERTOSONO</div>
        </div>
        <button class="sidebar-toggle-inside" @click="toggleSidebar">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav class="nav">
        <div class="nav-section">MAIN MENU</div>

        <router-link to="/admin" class="nav-item" exact-active-class="active" title="Dashboard" data-label="Dashboard">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span class="nav-label">Dashboard</span>
          </span>
        </router-link>

        <router-link to="/admin/pinjam" class="nav-item" exact-active-class="active" title="pinjam" data-label="pinjam">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span class="nav-label">Pinjam Buku</span>
          </span>
        </router-link>

        <router-link to="/admin/pengembalian" class="nav-item" exact-active-class="active" title="pengembalian" data-label="pengembalian">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
            <span class="nav-label">Pengembalian</span>
          </span>
        </router-link>

        <router-link to="/admin/data-buku" class="nav-item" exact-active-class="active" title="data-buku" data-label="data-buku">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18" />
            </svg>
            <span class="nav-label">Data Buku</span>
          </span>
        </router-link>

        <router-link to="/admin/kategori-buku" class="nav-item" exact-active-class="active" title="kategori-buku" data-label="kategori-buku">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .58 1.42l9.58 9.58a2 2 0 0 0 2.83 0l4.36-4.36a2 2 0 0 0 0-2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span class="nav-label">Kategori Buku</span>
          </span>
        </router-link>

        <router-link to="/admin/data-siswa" class="nav-item" exact-active-class="active" title="data-siswa" data-label="data-siswa">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="3" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            <span class="nav-label">Data Siswa</span>
          </span>
        </router-link>

        <router-link to="/admin/data-guru" class="nav-item" exact-active-class="active" title="data-guru" data-label="data-guru">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="3" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            <span class="nav-label">Data Guru</span>
          </span>
        </router-link>

        <router-link to="/admin/data-peminjaman" class="nav-item" exact-active-class="active" title="data-peminjaman" data-label="data-peminjaman">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
            </svg>
            <span class="nav-label">Data Peminjaman</span>
          </span>
        </router-link>

        <router-link to="/admin/denda" class="nav-item" exact-active-class="active" title="denda" data-label="denda">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span class="nav-label">Denda</span>
          </span>
        </router-link>

        <div class="nav-section">LAPORAN</div>

        <router-link to="/admin/laporan" class="nav-item" exact-active-class="active" title="laporan" data-label="laporan">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18" />
              <path d="M7 13l4-4 3 3 5-5" />
            </svg>
            <span class="nav-label">Laporan</span>
          </span>
        </router-link>

        <router-link to="/admin/riwayat" class="nav-item" exact-active-class="active" title="riwayat" data-label="riwayat">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="nav-label">Riwayat Aktivitas</span>
          </span>
        </router-link>

        <div class="nav-section">PENGATURAN</div>

        <router-link to="/admin/pengaturan" class="nav-item" exact-active-class="active" title="pengaturan" data-label="pengaturan">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span class="nav-label">Pengaturan</span>
          </span>
        </router-link>

        <router-link to="/admin/akun" class="nav-item" exact-active-class="active" title="akun" data-label="akun">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M6.5 19.5a6.5 6.5 0 0 1 11 0" />
            </svg>
            <span class="nav-label">Akun Admin</span>
          </span>
        </router-link>

        <div class="profile-card">
          <div class="avatar avatar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M6.5 19.5a6.5 6.5 0 0 1 11 0" />
            </svg>
          </div>
          <div class="profile-text">
            <div class="profile-greet">{{ admin.role }}</div>
            <div class="profile-name">{{ admin.nama }}</div>
            <div class="profile-role">
              <span class="dot-online"></span> Online
            </div>
          </div>
        </div>
      </nav>

      <button class="btn-logout" title="Keluar" data-label="Keluar" @click="mintaLogout">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span class="nav-label">Keluar</span>
      </button>
    </aside>

    <main class="main" :class="{ 'main-expanded': !sidebarOpen }">
      <header class="topbar">
        <button class="hamburger" @click="toggleSidebar" v-if="!sidebarOpen">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div class="search-box search-box-wrap">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari buku, siswa, guru, atau ISBN..."
            v-model="searchQuery"
            @input="onSearchInput"
            @focus="searchQuery && (searchOpen = true)"
            @blur="tutupSearchDelay"
          />

          <div v-if="searchOpen" class="search-dropdown">
            <div
              v-if="!searchResults.buku.length && !searchResults.siswa.length && !searchResults.guru.length"
              class="search-empty"
            >
              Tidak ada hasil ditemukan
            </div>

            <div v-if="searchResults.buku.length" class="search-group">
              <div class="search-group-title">Buku</div>
              <div
                v-for="item in searchResults.buku"
                :key="'buku-' + item.id"
                class="search-item"
                @mousedown="pilihHasilBuku(item)"
              >
                <strong>{{ item.judul }}</strong>
                <span>{{ item.penulis || '-' }} · ISBN {{ item.isbn || '-' }}</span>
              </div>
            </div>

            <div v-if="searchResults.siswa.length" class="search-group">
              <div class="search-group-title">Siswa</div>
              <div
                v-for="item in searchResults.siswa"
                :key="'siswa-' + item.id"
                class="search-item"
                @mousedown="pilihHasilSiswa(item)"
              >
                <strong>{{ item.nama }}</strong>
                <span>{{ item.kelas }}</span>
              </div>
            </div>

            <div v-if="searchResults.guru.length" class="search-group">
              <div class="search-group-title">Guru</div>
              <div
                v-for="item in searchResults.guru"
                :key="'guru-' + item.id"
                class="search-item"
                @mousedown="pilihHasilGuru(item)"
              >
                <strong>{{ item.nama }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="topbar-right">
          <div class="notif-wrap">
            <button class="notif-icon" @click="toggleNotif">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span v-if="jumlahJenisNotifikasi > 0" class="notif-dot">{{ jumlahJenisNotifikasi }}</span>
            </button>

            <div v-if="notifOpen" class="notif-dropdown">
              <div class="notif-item">
                <div class="notif-item-title">
                  <svg class="icon notif-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Buku Terlambat
                </div>
                <div class="notif-item-body">
                  {{ notifikasi.terlambat.jumlah }} buku belum dikembalikan melebihi jatuh tempo
                </div>
                <div class="notif-item-time">{{ formatWaktu(notifikasi.terlambat.waktu) }}</div>
              </div>

              <div class="notif-item">
                <div class="notif-item-title">
                  <svg class="icon notif-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Jatuh Tempo Hari Ini
                </div>
              <div class="notif-item-body">
                {{ notifikasi.jatuhTempoHariIni.jumlah }} buku harus dikembalikan hari ini
              </div>
              <div class="notif-item-time">{{ formatWaktu(notifikasi.jatuhTempoHariIni.waktu) }}</div>
              </div>
            </div>
          </div>
          <div class="avatar-sm avatar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M6.5 19.5a6.5 6.5 0 0 1 11 0" />
            </svg>
          </div>
          <div>
            <div class="user-name">{{ admin.nama }}</div>
            <div class="user-role">{{ admin.role }}</div>
          </div>
        </div>
      </header>

      <router-view :admin="admin" />
    </main>

    <div
      v-if="showLogoutModal"
      class="modal-overlay"
      @click.self="batalLogout"
    >
      <div class="modal-box" role="dialog">
        <div class="modal-header">
          <h2>Keluar dari akun?</h2>
          <button class="modal-close" type="button" @click="batalLogout">×</button>
        </div>
        <div class="modal-body">
          <p>Anda akan keluar dari dashboard admin. Simpan perubahan yang belum disimpan sebelum keluar.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-modal ghost" type="button" @click="batalLogout">Batal</button>
          <button class="btn-modal danger" type="button" @click="konfirmasiLogout">Ya, Keluar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- style ini disalin & disesuaikan dari DashboardGuruLayout.vue --- */
.layout {
  display: flex;
  min-height: 100vh;
  font-family: 'Segoe UI', sans-serif;
  background: #f4f6fb;
}
.icon { width: 18px; height: 18px; flex-shrink: 0; }
.icon-lg { width: 26px; height: 26px; }

.sidebar {
  width: 260px;
  background: #0b1a3a;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  overflow: hidden;
  transition: transform 0.25s ease;
  z-index: 50;
}

.sidebar-closed {
  width: 84px;
  padding: 14px 10px;
  align-items: center;
}

.sidebar-closed .brand-text,
.sidebar-closed .nav-section,
.sidebar-closed .nav-label,
.sidebar-closed .profile-text,
.sidebar-closed .sidebar-toggle-inside {
  display: none;
}

.sidebar-closed .brand {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 12px;
  background: #12235a;
}

.sidebar-closed .brand .icon-lg {
  display: block;
  width: 22px;
  height: 22px;
}

.sidebar-closed .nav {
  width: 100%;
  align-items: center;
  gap: 6px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}

.sidebar-closed .nav::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.sidebar-closed .nav-item,
.sidebar-closed .btn-logout {
  width: 44px;
  height: 44px;
  margin: 0 auto;
  padding: 0;
  justify-content: center;
  border-radius: 12px;
  position: relative;
}

.sidebar-closed .nav-item-left {
  justify-content: center;
  gap: 0;
}

.sidebar-closed .nav-item.active,
.sidebar-closed .nav-item:hover,
.sidebar-closed .btn-logout:hover {
  background: #1d4ed8;
  color: #fff;
}

.sidebar-closed .profile-card {
  width: 44px;
  height: 44px;
  margin: 10px auto 0;
  padding: 0;
  justify-content: center;
  background: #12235a;
  border-radius: 12px;
}

.sidebar-closed .avatar {
  width: 28px;
  height: 28px;
}

.sidebar-closed .btn-logout {
  margin-top: 8px;
}

/* tooltip nama menu */
.sidebar-closed .nav-item::after,
.sidebar-closed .btn-logout::after {
  content: attr(data-label);
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: #0f172a;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 80;
}

.sidebar-closed .nav-item:hover::after,
.sidebar-closed .btn-logout:hover::after {
  opacity: 1;
}

.main-expanded {
  margin-left: 84px;
}

.brand { display: flex; gap: 10px; align-items: center; margin-bottom: 24px; }
.brand-text { flex: 1; min-width: 0; }
.sidebar-toggle-inside {
  background: #2563eb; border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 32px; border-radius: 8px; flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.5);
}
.icon-toggle { width: 16px; height: 16px; }
.brand-title { font-weight: 700; font-size: 13px; }
.brand-sub { font-size: 11px; opacity: 0.7; }

.nav {
  flex: 1; display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto; min-height: 0;
  scrollbar-width: thin; scrollbar-color: #3b5bdb transparent;
}
.nav::-webkit-scrollbar { width: 5px; }
.nav::-webkit-scrollbar-thumb { background-color: #3b5bdb; border-radius: 999px; }

.nav-section { font-size: 11px; opacity: 0.5; margin: 12px 0 4px; letter-spacing: 0.5px; }
.nav-item {
  color: #cbd5e1; text-decoration: none; padding: 8px 10px;
  border-radius: 8px; font-size: 14px; display: flex;
  justify-content: space-between; align-items: center;
}
.nav-item-left { display: flex; align-items: center; gap: 10px; }
.nav-item.active, .nav-item:hover { background: #1d4ed8; color: #fff; }

.profile-card {
  background: #12235a; border-radius: 12px; padding: 12px;
  margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
}
.avatar { width: 36px; height: 36px; border-radius: 50%; }
.avatar-icon { display: flex; align-items: center; justify-content: center; background: #1d4ed8; color: #fff; }
.avatar-icon svg { width: 70%; height: 70%; }
.profile-text { flex: 1; }
.profile-greet { font-size: 11px; opacity: 0.7; }
.profile-name { font-size: 13px; font-weight: 600; }
.profile-role { font-size: 11px; opacity: 0.7; display: flex; align-items: center; gap: 5px; }
.dot-online { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; display: inline-block; }

.btn-logout {
  margin-top: 12px; background: transparent; border: none; color: #cbd5e1;
  text-align: left; padding: 8px 10px; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; gap: 10px;width: 100%;
  border-radius: 8px; transition: background-color 0.15s ease, color 0.15s ease;
}

.btn-logout:hover {
  background: #1d4ed8;
  color: #fff;
}

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; margin-left: 260px; transition: margin-left 0.25s ease; }
.main-expanded {
  margin-left: 76px;
}

.topbar {
  background: #fff; padding: 14px 24px; display: flex; align-items: center;
  gap: 16px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 40;
}
.hamburger {
  background: #2563eb; border: none; cursor: pointer; color: #fff;
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 32px; border-radius: 8px; flex-shrink: 0;
}

.search-box {
  flex: 1; max-width: 480px; display: flex; align-items: center; gap: 8px;
  background: #f3f4f6; border-radius: 10px; padding: 8px 14px; color: #6b7280;
}
.search-box input {
  border: none; background: transparent; outline: none; font-size: 13px;
  width: 100%; color: #111827;
}

.search-box-wrap { position: relative; }

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 320px;
  overflow-y: auto;
  z-index: 60;
  padding: 6px;
}

.search-group { margin-bottom: 6px; }
.search-group:last-child { margin-bottom: 0; }

.search-group-title {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  padding: 6px 10px 2px;
  text-transform: uppercase;
}

.search-item {
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-item:hover { background: #f3f4f6; }

.search-item strong { font-size: 13px; color: #111827; }
.search-item span { font-size: 11px; color: #6b7280; }

.search-empty {
  padding: 12px 10px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

.topbar-right { display: flex; align-items: center; gap: 14px; margin-left: auto; }
.notif-wrap { position: relative; }
.notif-icon {
  position: relative; display: flex; align-items: center; justify-content: center;
  color: #374151; background: none; border: none; cursor: pointer;
  padding: 6px; border-radius: 8px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.notif-icon:hover {
  background-color: #f3f4f6;
  color: #2563eb;
}
.notif-dot {
  position: absolute; top: -6px; right: -8px; background: #ef4444; color: #fff;
  font-size: 10px; border-radius: 999px; padding: 0 5px;
}
.notif-dropdown {
  position: absolute; top: calc(100% + 12px); right: 0; width: 280px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); z-index: 70; padding: 8px;
}
.notif-item { padding: 10px; border-radius: 8px; }
.notif-item + .notif-item { border-top: 1px solid #f1f5f9; margin-top: 4px; padding-top: 12px; }
.notif-item-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
.notif-icon-inline { width: 15px; height: 15px; flex-shrink: 0; color: #2563eb;}
.notif-item-body { font-size: 12px; color: #374151; }
.notif-item-time { font-size: 11px; color: #9ca3af; margin-top: 4px; }

.avatar-sm { width: 32px; height: 32px; border-radius: 50%; }
.user-name { font-size: 13px; font-weight: 600; }
.user-role { font-size: 11px; color: #6b7280; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  padding: 16px;
}

.modal-box {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
  color: #0f172a;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
}

.modal-close {
  border: none;
  background: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 22px;
  color: #9ca3af;
  cursor: pointer;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 16px 20px;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-modal {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn-modal.ghost {
  background: #e2e8f0;
  color: #0f172a;
}

.btn-modal.ghost:hover {
  background: #cbd5e1;
}

.btn-modal.danger {
  background: #dc2626;
  color: #fff;
}

.btn-modal.danger:hover {
  background: #b91c1c;
}
</style>