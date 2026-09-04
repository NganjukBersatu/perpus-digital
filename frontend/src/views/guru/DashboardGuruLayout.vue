<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const icons = {
  userCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19.5a6.5 6.5 0 0 1 11 0"/></svg>`
}

const guru = ref({
  nama: 'Andi Prasetyo',
  role: 'Guru',
  mapel: 'Guru RPL',
  nip: '198005152010011005'
})

const notifikasi = ref([
  { judul: 'Peminjaman disetujui' },
  { judul: 'Pengembalian segera' },
  { judul: 'Buku baru tersedia' },
  { judul: 'Rekomendasi buku baru' }
])

const sidebarOpen = ref(true)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function logout() {
  console.log('logout guru')
  router.push('/')
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
          <div class="brand-title">PERPUSTAKAAN DIGITAL</div>
          <div class="brand-sub">SMK NEGERI 1 KERTOSONO</div>
        </div>
        <button class="sidebar-toggle-inside" @click="toggleSidebar">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav class="nav">
        <router-link to="/guru" class="nav-item" exact-active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Beranda
          </span>
        </router-link>

        <div class="nav-section">KOLEKSI</div>
        <router-link to="/guru/katalog" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Katalog Buku
          </span>
        </router-link>
        <router-link to="/guru/favorit" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .58 1.42l9.58 9.58a2 2 0 0 0 2.83 0l4.36-4.36a2 2 0 0 0 0-2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Buku Favorit
          </span>
        </router-link>
        <router-link to="/guru/rekomendasi" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v4M12 17v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M3 12h4M17 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" />
            </svg>
            Rekomendasi
          </span>
        </router-link>

        <div class="nav-section">PEMINJAMAN</div>
        <router-link to="/guru/peminjaman-saya" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
            Peminjaman Saya
          </span>
        </router-link>
        <router-link to="/guru/riwayat" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Riwayat Peminjaman
          </span>
        </router-link>
        <router-link to="/guru/pengembalian" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
            Pengembalian
          </span>
        </router-link>

        <div class="nav-section">LAINNYA</div>
        <router-link to="/guru/notifikasi" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notifikasi
          </span>
          <span class="badge">{{ notifikasi.length }}</span>
        </router-link>
        <router-link to="/guru/bantuan" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Bantuan
          </span>
        </router-link>

        <div class="profile-card">
          <div class="avatar avatar-icon" v-html="icons.userCircle"></div>
          <div class="profile-text">
            <div class="profile-greet">Selamat datang,</div>
            <div class="profile-name">{{ guru.nama }}</div>
            <div class="profile-role">{{ guru.mapel }}</div>
          </div>
          <button class="btn-outline-light">Lihat Profil</button>
        </div>
      </nav>

      <button class="btn-logout" @click="logout">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Keluar
      </button>
    </aside>

    <main class="main" :class="{ 'main-expanded': !sidebarOpen }">
      <header class="topbar">
        <button class="hamburger" @click="toggleSidebar" v-if="!sidebarOpen">
          <svg class="icon icon-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div class="topbar-right">
          <div class="notif-icon">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span class="notif-dot">{{ notifikasi.length }}</span>
          </div>
          <div class="avatar-sm avatar-icon" v-html="icons.userCircle"></div>
          <div>
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
  transition: transform 0.25s ease;
  z-index: 50;
}

.sidebar-closed {
  transform: translateX(-100%);
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
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.5);
  transition: background 0.2s ease, transform 0.2s ease;
}

.sidebar-toggle-inside:hover {
  background: #1d4ed8;
  transform: scale(1.08);
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
  scrollbar-width: thin;
  scrollbar-color: #3b5bdb transparent;
}

.nav::-webkit-scrollbar {
  width: 5px;
}

.nav::-webkit-scrollbar-track {
  background: transparent;
}

.nav::-webkit-scrollbar-thumb {
  background-color: #3b5bdb;
  border-radius: 999px;
}

.nav-section {
  font-size: 11px;
  opacity: 0.5;
  margin: 12px 0 4px;
  letter-spacing: 0.5px;
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
  margin-top: 1cm;
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
  margin-left: 0;
}

.topbar {
  background: #fff;
  padding: 14px 24px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
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
  width: 24px;
  height: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.5);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.notif-icon {
  position: relative;
  display: flex;
  color: #374151;
}

.notif-dot {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  border-radius: 999px;
  padding: 0 5px;
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
</style>