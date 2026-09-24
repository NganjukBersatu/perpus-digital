<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const icons = {
  userCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19.5a6.5 6.5 0 0 1 11 0"/></svg>`
}

const userTersimpan = JSON.parse(localStorage.getItem('user') || '{}')
const siswa = ref({
  id: userTersimpan.id || null,
  nama: userTersimpan.nama || '',
  role: 'Siswa',
  kelas: userTersimpan.kelas || '',
  nis: userTersimpan.nis || ''
})

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const NOTIF_STORAGE_KEY = computed(() => `notifikasi_siswa_${siswa.value.id || 'guest'}`)

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
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/siswa/notifikasi`, {
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
    notifikasi.value = [
      { id: 'dummy-1', tipe: 'jatuh_tempo', judul: 'Buku hampir jatuh tempo', pesan: 'Rekayasa Perangkat Lunak Jilid 2 jatuh tempo 2 hari lagi', waktu: new Date().toISOString(), dibaca: false },
      { id: 'dummy-2', tipe: 'disetujui', judul: 'Peminjaman disetujui', pesan: 'Peminjaman buku kamu sudah disetujui admin', waktu: new Date().toISOString(), dibaca: false }
    ]
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
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/siswa/notifikasi/${item.id}/baca`, {
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

const sidebarOpen = ref(true)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function bukaSidebarJikaTertutup() {
  if (!sidebarOpen.value) sidebarOpen.value = true
}

const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

const showLogoutModal = ref(false)

function mintaLogout() {
  showLogoutModal.value = true
}

function batalLogout() {
  showLogoutModal.value = false
}

function konfirmasiLogout() {
  showLogoutModal.value = false
  router.push('/')
}

onMounted(() => {
  fetchNotifikasi()
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
</script>

<template>
  <div class="layout">
    <aside class="sidebar" :class="{ 'sidebar-closed': !sidebarOpen, 'mobile-open': mobileMenuOpen }">
      <div class="brand" @click="bukaSidebarJikaTertutup">
        <img src="/logo.png" alt="Logo" class="icon icon-lg" />
        <div class="brand-text">
          <div class="brand-title">MANAGEMENT PERPUSTAKAAN</div>
        </div>
        <button class="sidebar-toggle-inside" @click.stop="toggleSidebar">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="sidebar-open-hint" aria-hidden="true">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>

      <nav class="nav" @click="closeMobileMenu">
        <router-link to="/siswa" class="nav-item" exact-active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span class="nav-label">Dashboard</span>
          </span>
        </router-link>

        <router-link to="/siswa/katalog" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span class="nav-label">Katalog Buku</span>
          </span>
        </router-link>

        <router-link to="/siswa/peminjaman" class="nav-item" active-class="active">
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

        <router-link to="/siswa/riwayat" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="nav-label">Riwayat Peminjaman</span>
          </span>
        </router-link>

        <router-link to="/siswa/profil" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span class="nav-label">Profil</span>
          </span>
        </router-link>

        <div class="profile-card">
          <div class="avatar avatar-icon" v-html="icons.userCircle"></div>
          <div class="profile-text">
            <div class="profile-greet">Selamat datang,</div>
            <div class="profile-name">{{ siswa.nama }}</div>
            <div class="profile-role">{{ siswa.kelas }}</div>
          </div>
          <router-link to="/siswa/profil" class="btn-outline-light">Lihat Profil</router-link>
        </div>
      </nav>

      <button class="btn-logout" @click="mintaLogout">
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

        <div class="topbar-right">
          <div class="notif-wrap">
            <button class="notif-icon" type="button" @click="toggleNotif">
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
                    <svg
                      v-else-if="item.tipe === 'jatuh_tempo' || item.tipe === 'hampir_jatuh_tempo'"
                      class="icon notif-icon-inline"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
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
                <div class="notif-empty" v-if="!notifikasi.length">Tidak ada notifikasi</div>
              </template>
            </div>
          </div>

          <div class="avatar-sm avatar-icon" v-html="icons.userCircle"></div>
          <div class="user-meta">
            <div class="user-name">{{ siswa.nama }}</div>
            <div class="user-role">{{ siswa.role }}</div>
          </div>
        </div>
      </header>

      <div class="page-wrap">
        <router-view :siswa="siswa" />
      </div>
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
            <p>Anda akan keluar dari dashboard {{ 'siswa' }}. Simpan perubahan yang belum disimpan sebelum keluar.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-modal ghost" type="button" @click="batalLogout">Batal</button>
            <button class="btn-modal danger" type="button" @click="konfirmasiLogout">Ya, Keluar</button>
          </div>
        </div>
      </div>
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

.icon { width: 18px; height: 18px; flex-shrink: 0; }
.icon-lg { width: 26px; height: 26px; object-fit: contain; }

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
.sidebar-closed .sidebar-toggle-inside {
  display: none;
}

.sidebar-open-hint {
  display: none;
}

.sidebar-closed .brand {
  position: relative;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  border-radius: 12px;
  background: #12235a;
}

.sidebar-closed .brand:hover {
  background: #3c70ff;
}

.sidebar-closed .brand:hover .icon-lg {
  display: none;
}

.sidebar-closed .brand:hover .sidebar-open-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.sidebar-closed .brand-text,
.sidebar-closed .nav-label,
.sidebar-closed .profile-text,
.sidebar-closed .btn-outline-light,
.sidebar-closed .badge { display: none; }
.sidebar-closed .nav-item,
.sidebar-closed .btn-logout {
  justify-content: center;
  padding: 10px 0;
}
.sidebar-closed .nav-item-left { justify-content: center; gap: 0; }
.sidebar-closed .profile-card {
  justify-content: center;
  padding: 10px 0;
  background: transparent;
}

.brand { display: flex; gap: 10px; align-items: center; margin-bottom: 24px; }
.brand-text { flex: 1; min-width: 0; }

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

.icon-toggle { width: 16px; height: 16px; }
.brand-title {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.3px;
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
  align-items: center;
}
.nav-item-left { display: flex; align-items: center; gap: 10px; }
.nav-item.active, .nav-item:hover { background: #1d4ed8; color: #fff; }

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

.avatar { width: 36px; height: 36px; border-radius: 50%; }
.avatar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1d4ed8;
  color: #fff;
}
.avatar-icon :deep(svg) { width: 70%; height: 70%; }

.profile-text { flex: 1; }
.profile-greet { font-size: 11px; opacity: 0.7; }
.profile-name { font-size: 13px; font-weight: 600; }
.profile-role { font-size: 11px; opacity: 0.7; }

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
  transition: 
  background-color 0.15s ease, color 0.15s ease;
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
.main-expanded { margin-left: 76px; }

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

.notif-wrap { position: relative; }
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
}
.notif-icon:hover { background-color: #f3f4f6; color: #2563eb; }

.notif-dot {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
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
.notif-item:hover { background: #f3f4f6; }
.notif-unread { background: #eff6ff; }

.notif-item-title {
  font-size: 13px;
  font-weight: 700;
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
  margin-left: auto;
}

.notif-item-body { font-size: 12px; color: #374151; }
.notif-item-time { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.notif-empty { padding: 16px; font-size: 13px; color: #9ca3af; text-align: center; }

.avatar-sm { width: 32px; height: 32px; border-radius: 50%; }
.user-name { font-size: 13px; font-weight: 600; }
.user-role { font-size: 11px; color: #6b7280; }

.sidebar-overlay { display: none; }

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

.modal-header h2 { margin: 0; font-size: 16px; }

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

.modal-close:hover { background: #f3f4f6; color: #111827; }

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

.btn-modal.ghost { background: #e2e8f0; color: #0f172a; }
.btn-modal.ghost:hover { background: #cbd5e1; }
.btn-modal.danger { background: #dc2626; color: #fff; }
.btn-modal.danger:hover { background: #b91c1c; }

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
    width: 260px !important;
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

  .topbar {
    padding: 10px 12px;
  }

  .user-meta,
  .user-name,
  .user-role {
    display: none !important;
  }

  .notif-dropdown {
    width: min(280px, calc(100vw - 24px));
    right: 0;
  }
}
</style>