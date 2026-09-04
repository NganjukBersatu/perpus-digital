<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const icons = {
  userCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19.5a6.5 6.5 0 0 1 11 0"/></svg>`
}

const siswa = ref({
  nama: 'Ahmad Fauzi',
  role: 'Siswa',
  kelas: 'X TPM 2',
  nis: '2024001'
})

const notifikasi = ref([
  { judul: 'Buku hampir jatuh tempo' },
  { judul: 'Peminjaman disetujui' }
])

const sidebarOpen = ref(true)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function logout() {
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
        <router-link to="/siswa" class="nav-item" exact-active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </span>
        </router-link>

        <router-link to="/siswa/katalog" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Katalog Buku
          </span>
        </router-link>

        <router-link to="/siswa/riwayat" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Riwayat Pinjam
          </span>
        </router-link>

        <router-link to="/siswa/profil" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profil
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
            <div class="user-name">{{ siswa.nama }}</div>
            <div class="user-role">{{ siswa.role }}</div>
          </div>
        </div>
      </header>
      <router-view :siswa="siswa" />
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