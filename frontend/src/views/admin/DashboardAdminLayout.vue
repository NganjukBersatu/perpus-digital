<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const admin = ref({
  nama: 'Admin Perpustakaan',
  role: 'Pustakawan'
})

const notifikasi = ref([
  { judul: 'Peminjaman baru' },
  { judul: 'Buku terlambat dikembalikan' },
  { judul: 'Stok buku menipis' }
])

const sidebarOpen = ref(true)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function logout() {
  console.log('logout admin')
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
        <div class="nav-section">MAIN MENU</div>

        <router-link to="/admin" class="nav-item" exact-active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </span>
        </router-link>

        <router-link to="/admin/pinjam" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Pinjam Buku
          </span>
        </router-link>

        <router-link to="/admin/pengembalian" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
            Pengembalian
          </span>
        </router-link>

        <router-link to="/admin/data-buku" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18" />
            </svg>
            Data Buku
          </span>
        </router-link>

        <router-link to="/admin/kategori-buku" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .58 1.42l9.58 9.58a2 2 0 0 0 2.83 0l4.36-4.36a2 2 0 0 0 0-2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Kategori Buku
          </span>
        </router-link>

        <router-link to="/admin/data-siswa" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="3" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            Data Siswa
          </span>
        </router-link>

        <router-link to="/admin/data-guru" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="3" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            Data Guru
          </span>
        </router-link>

        <router-link to="/admin/data-peminjaman" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
            </svg>
            Data Peminjaman
          </span>
        </router-link>

        <router-link to="/admin/denda" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Denda
          </span>
        </router-link>

        <div class="nav-section">LAPORAN</div>

        <router-link to="/admin/laporan" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18" />
              <path d="M7 13l4-4 3 3 5-5" />
            </svg>
            Laporan
          </span>
        </router-link>

        <router-link to="/admin/riwayat" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Riwayat Aktivitas
          </span>
        </router-link>

        <div class="nav-section">PENGATURAN</div>

        <router-link to="/admin/pengaturan" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Pengaturan
          </span>
        </router-link>

        <router-link to="/admin/akun" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M6.5 19.5a6.5 6.5 0 0 1 11 0" />
            </svg>
            Akun Admin
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

        <div class="search-box">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Cari buku, siswa, guru, atau ISBN..." />
        </div>

        <div class="topbar-right">
          <div class="notif-icon">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span class="notif-dot">{{ notifikasi.length }}</span>
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
.sidebar-closed { transform: translateX(-100%); }

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
  display: flex; align-items: center; gap: 10px;
}

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; margin-left: 260px; transition: margin-left 0.25s ease; }
.main-expanded { margin-left: 0; }

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

.topbar-right { display: flex; align-items: center; gap: 14px; margin-left: auto; }
.notif-icon { position: relative; display: flex; color: #374151; }
.notif-dot {
  position: absolute; top: -6px; right: -8px; background: #ef4444; color: #fff;
  font-size: 10px; border-radius: 999px; padding: 0 5px;
}
.avatar-sm { width: 32px; height: 32px; border-radius: 50%; }
.user-name { font-size: 13px; font-weight: 600; }
.user-role { font-size: 11px; color: #6b7280; }
</style>