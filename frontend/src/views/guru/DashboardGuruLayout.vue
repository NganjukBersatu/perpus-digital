<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const icons = {
  userCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19.5a6.5 6.5 0 0 1 11 0"/></svg>`
}

const guru = ref({ id: null, nama: '', role: 'Guru', mapel: '', nip: '' })

onMounted(() => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const userRaw = localStorage.getItem('user')

  if (!token || role !== 'guru' || !userRaw) {
    router.push('/')
    return
  }

  const user = JSON.parse(userRaw)
  guru.value = {
    id: user.id,
    nama: user.nama || 'Guru',
    role: 'Guru',
    mapel: user.mapel || '-',
    nip: user.nip || '-'
  }

  // notifikasi baru bisa di-fetch setelah kita tahu id guru
  fetchNotifikasi()
})

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* ================= NOTIFIKASI (per-guru) ================= */
const NOTIF_STORAGE_KEY = computed(() => `notifikasi_guru_${guru.value.id || 'guest'}`)

const notifikasi = ref([])
const notifOpen = ref(false)
const notifLoading = ref(false)

function muatStatusTersimpan() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY.value)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function simpanStatus(statusMap) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY.value, JSON.stringify(statusMap))
  } catch (err) {
    console.error('Gagal menyimpan status notifikasi', err)
  }
}

async function fetchNotifikasi() {
  notifLoading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/guru/notifikasi', {
      headers: { ...authHeaders() }
    })
    if (!res.ok) throw new Error('Gagal ambil notifikasi')
    const data = await res.json()

    const statusTersimpan = muatStatusTersimpan()
    const sekarang = new Date().toISOString()
    const statusBaru = {}

    notifikasi.value = (Array.isArray(data) ? data : []).map(item => {
      const sebelumnya = statusTersimpan[item.id]
      const waktu = sebelumnya?.waktu || sekarang
      const dibaca = sebelumnya?.dibaca || false

      statusBaru[item.id] = { waktu, dibaca }

      return { ...item, waktu, dibaca }
    })

    simpanStatus(statusBaru)
  } catch (err) {
    console.error('Gagal memuat notifikasi:', err)
    notifikasi.value = []
  } finally {
    notifLoading.value = false
  }
}

const jumlahBelumDibaca = computed(() => notifikasi.value.filter(n => !n.dibaca).length)

function toggleNotif() {
  notifOpen.value = !notifOpen.value
}

function closeNotifOutside(e) {
  if (!e.target.closest('.notif-wrap')) notifOpen.value = false
}

function closeNotifOnScroll() {
  if (notifOpen.value) notifOpen.value = false
}

function formatWaktu(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

async function tandaiSudahDibaca(item) {
  if (item.dibaca) return
  item.dibaca = true

  const statusTersimpan = muatStatusTersimpan()
  statusTersimpan[item.id] = { waktu: item.waktu, dibaca: true }
  simpanStatus(statusTersimpan)

  try {
    await fetch(`http://localhost:3000/api/guru/notifikasi/${item.id}/baca`, {
      method: 'PATCH',
      headers: { ...authHeaders() }
    })
  } catch (err) {
    console.error('Gagal sinkron status baca ke server:', err)
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') fetchNotifikasi()
}

let notifInterval = null

onMounted(() => {
  window.addEventListener('click', closeNotifOutside)
  window.addEventListener('scroll', closeNotifOnScroll, { capture: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)

  notifInterval = setInterval(fetchNotifikasi, 30000)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeNotifOutside)
  window.removeEventListener('scroll', closeNotifOnScroll, { capture: true })
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (notifInterval) clearInterval(notifInterval)
})
/* ============================================================ */

const sidebarOpen = ref(true)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  router.push('/')
}
</script>

<template>
  <div class="layout">
   <aside class="sidebar" :class="{ 'sidebar-closed': !sidebarOpen, 'mobile-open': mobileMenuOpen }">
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

     <nav class="nav" @click="closeMobileMenu">
        <router-link to="/guru" class="nav-item" exact-active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span class="nav-label">Beranda</span>
          </span>
        </router-link>

        <router-link to="/guru/katalog" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span class="nav-label">Katalog Buku</span>
          </span>
        </router-link>

        <router-link to="/guru/peminjaman" class="nav-item" active-class="active">
          <span class="nav-item-left">
           <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span class="nav-label">Peminjaman Saya</span>
          </span>
        </router-link>

        <router-link to="/guru/riwayat" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <circle cx="12" cy="12" r="10" />
                 <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="nav-label">Riwayat Peminjaman</span>
          </span>
        </router-link>

        <router-link to="/guru/profil" class="nav-item" active-class="active">
          <span class="nav-item-left">
           <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span class="nav-label">Profil</span>
          </span>
        </router-link>
        
        <!-- Profile Card -->
        <div class="profile-card">
          <div class="avatar avatar-icon" v-html="icons.userCircle"></div>
          <div class="profile-text">
            <div class="profile-greet">Selamat datang,</div>
            <div class="profile-name">{{ guru.nama }}</div>
            <div class="profile-role">{{ guru.mapel || 'Guru' }}</div>
          </div>
          <router-link to="/guru/profil" class="btn-outline-light">Lihat Profil</router-link>
        </div>
      </nav>

      <button class="btn-logout" @click="logout">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span class="nav-label">Keluar</span>
      </button>
    </aside>

    <div v-if="mobileMenuOpen" class="sidebar-overlay" @click="closeMobileMenu"></div>

    <main class="main" :class="{ 'main-expanded': !sidebarOpen }">
      <header class="topbar">
        <button class="hamburger hamburger-mobile" type="button" @click="toggleMobileMenu">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <button class="hamburger hamburger-desktop" type="button" @click="toggleSidebar" v-if="!sidebarOpen">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div class="topbar-right">
          <div class="notif-wrap">
            <button class="notif-icon" @click="toggleNotif">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span v-if="jumlahBelumDibaca > 0" class="notif-dot">{{ jumlahBelumDibaca }}</span>
            </button>

            <div v-if="notifOpen" class="notif-dropdown">
              <div class="notif-header">Notifikasi</div>

              <div v-if="notifLoading" class="notif-empty">Memuat...</div>

              <template v-else>
                <div
                  v-for="item in notifikasi"
                  :key="item.id"
                  class="notif-item"
                  :class="{ 'notif-unread': !item.dibaca }"
                  @click="tandaiSudahDibaca(item)"
                >
                  <div class="notif-item-title">
                    <!-- terlambat: ikon buku (sama seperti admin) -->
                    <svg
                      v-if="item.tipe === 'terlambat'"
                      class="icon notif-icon-inline"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>

                    <!-- jatuh tempo: ikon jam (sama seperti admin) -->
                    <svg
                      v-else-if="item.tipe === 'jatuh_tempo'"
                      class="icon notif-icon-inline"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>

                    <!-- disetujui: ikon centang -->
                    <svg
                      v-else-if="item.tipe === 'disetujui'"
                      class="icon notif-icon-inline"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>

                    <!-- default: ikon lonceng -->
                    <svg
                      v-else
                      class="icon notif-icon-inline"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>

                    {{ item.judul }}
                    <span class="notif-dot-inline" v-if="!item.dibaca"></span>
                  </div>
                  <div class="notif-item-body">{{ item.pesan }}</div>
                  <div class="notif-item-time">{{ formatWaktu(item.waktu) }}</div>
                </div>

                <div class="notif-empty" v-if="!notifikasi.length">
                  Tidak ada notifikasi
                </div>
              </template>
            </div>
          </div>

          <div class="avatar-sm avatar-icon" v-html="icons.userCircle"></div>
          <div class="user-meta">
            <div class="user-name">{{ guru.nama }}</div>
            <div class="user-role">{{ guru.role }}</div>
          </div>
        </div>
      </header>
      <router-view :guru="guru" />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  font-family: 'Segoe UI', sans-serif;
  background: #f4f6fb;
  overflow-x: hidden;
}

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.icon-lg {
  width: 26px;
  height: 26px;
}

.sidebar {
  width: 260px;
  background: #0b1a3a;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow: hidden;
  transition: transform 0.25s ease, width 0.25s ease;
  z-index: 50;
}

.sidebar-closed {
  width: 76px;
  padding: 16px 10px;
  align-items: center;
}

.sidebar-closed .brand .icon-lg {
  display: none;
}

.sidebar-closed .brand {
  flex-direction: column;
  justify-content: center;
  margin-bottom: 12px;
}

.sidebar-closed .sidebar-toggle-inside,
.sidebar-closed .brand {
  display: none;
}

.sidebar-closed .brand-text,
.sidebar-closed .nav-label,
.sidebar-closed .profile-text,
.sidebar-closed .btn-outline-light,
.sidebar-closed .badge {
  display: none;
}

.sidebar-closed .nav-item,
.sidebar-closed .btn-logout {
  justify-content: center;
  padding: 10px 0;
}

.sidebar-closed .nav-item-left {
  justify-content: center;
  gap: 0;
}

.sidebar-closed .profile-card {
  justify-content: center;
  padding: 10px 0;
  background: transparent;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 24px;
}

.brand-text {
  flex: 1;
  min-width: 0;
}

.sidebar-toggle-inside {
  background: #2563eb;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.icon-toggle {
  width: 16px;
  height: 16px;
}

.brand-title {
  font-weight: 700;
  font-size: 13px;
}

.brand-sub {
  font-size: 11px;
  opacity: 0.7;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
}

.nav-item {
  color: #cbd5e1;
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-item.active,
.nav-item:hover {
  background: #1d4ed8;
  color: #fff;
}

.badge {
  background: #ef4444;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 11px;
}

.profile-card {
  background: #12235a;
  border-radius: 12px;
  padding: 12px;
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.avatar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1d4ed8;
  color: #fff;
}

.avatar-icon :deep(svg) {
  width: 70%;
  height: 70%;
}

.profile-text {
  flex: 1;
}

.profile-greet {
  font-size: 11px;
  opacity: 0.7;
}

.profile-name {
  font-size: 13px;
  font-weight: 600;
}

.profile-role {
  font-size: 11px;
  opacity: 0.7;
}

.btn-outline-light {
  width: 100%;
  background: transparent;
  border: 1px solid #3b5bdb;
  color: #fff;
  padding: 6px;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.btn-logout {
  margin-top: 12px; 
  background: transparent; 
  border: none; 
  color: #cbd5e1;
  text-align: left; 
  padding: 8px 10px; 
  cursor: pointer; 
  font-size: 14px;
  display: flex; 
  align-items: center; 
  gap: 10px;
  width: 100%;
  border-radius: 8px; 
  transition: background-color 0.15s ease, color 0.15s ease;
}

.btn-logout:hover {
  background: #1d4ed8;
  color: #fff;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 260px;
  transition: margin-left 0.25s ease;
}

.main-expanded {
  margin-left: 76px;
}

.page-wrap {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.topbar {
  background: #fff;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 40;
}

.hamburger {
  background: #2563eb;
  border: none;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.hamburger-mobile { display: none; }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.notif-wrap {
  position: relative;
}

.notif-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.notif-icon:hover {
  background-color: #f3f4f6;
  color: #2563eb;
}

.notif-dot {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px #fff;
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 280px;
  max-height: 360px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 70;
}

.notif-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  border-bottom: 1px solid #f1f5f9;
  position: sticky;
  top: 0;
  background: #fff;
}

.notif-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f8fafc;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: #f3f4f6;
}

.notif-unread {
  background: #eff6ff;
}

.notif-item-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.notif-icon-inline {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #2563eb;
}

.notif-dot-inline {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
  margin-left: auto;
}

.notif-item-body {
  font-size: 12px;
  color: #374151;
}

.notif-item-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

.notif-empty {
  padding: 16px;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
}

.user-role {
  font-size: 11px;
  color: #6b7280;
}

.sidebar-overlay { display: none; }

/* ==================== RESPONSIVE MOBILE (mirip gambar) ==================== */
@media (max-width: 768px) {
  .sidebar-toggle-inside {
    display: none !important;
  }

  .hamburger-desktop {
    display: none !important;
  }

  .hamburger-mobile {
    display: flex !important;
  }

  .sidebar,
  .sidebar.sidebar-closed {
    width: 280px !important;
    padding: 20px 16px !important;
    align-items: stretch !important;
    transform: translateX(-100%) !important;
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.25);
  }

  .sidebar.mobile-open {
    transform: translateX(0) !important;
  }

  .sidebar.sidebar-closed .brand,
  .sidebar.sidebar-closed .brand-text,
  .sidebar.sidebar-closed .nav-label,
  .sidebar.sidebar-closed .profile-text,
  .sidebar.sidebar-closed .btn-outline-light {
    display: flex !important;
  }

  .sidebar.sidebar-closed .brand-text,
  .sidebar.sidebar-closed .nav-label,
  .sidebar.sidebar-closed .profile-text {
    display: block !important;
  }

  .sidebar.sidebar-closed .nav-item,
  .sidebar.sidebar-closed .btn-logout {
    justify-content: flex-start !important;
    padding: 8px 10px !important;
  }

  .sidebar.sidebar-closed .nav-item-left {
    justify-content: flex-start !important;
    gap: 10px !important;
  }

  .sidebar.sidebar-closed .profile-card {
    justify-content: flex-start !important;
    padding: 12px !important;
    background: #12235a !important;
  }

  .main,
  .main-expanded {
    margin-left: 0 !important;
    width: 100%;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 45;
  }

  /* Topbar mirip gambar */
  .topbar {
    padding: 12px 16px;
    gap: 10px;
  }

  .hamburger {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .user-meta,
  .user-name,
  .user-role {
    display: none !important;
  }

  .topbar-right {
    gap: 10px;
  }

  .avatar-sm {
    width: 36px;
    height: 36px;
  }

  .notif-icon {
    padding: 8px;
  }

  .notif-dropdown {
    width: min(300px, calc(100vw - 24px));
    right: -8px;
    border-radius: 12px;
  }

  /* Pastikan konten di dalam router-view punya spacing yang nyaman di mobile */
  :deep(.page-wrap),
  :deep(.dashboard-content),
  :deep(.content) {
    padding: 16px !important;
  }
}
</style>