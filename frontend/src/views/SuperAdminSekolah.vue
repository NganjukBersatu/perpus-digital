<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KendalaInbox from '@/views/KendalaInbox.vue'

const route = useRoute()
const router = useRouter()

const API = import.meta.env.VITE_API_BASE_URL
const KUNCI = 'superadmin_token'

const icons = {
  userCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19.5a6.5 6.5 0 0 1 11 0"/></svg>`
}

const token = ref(localStorage.getItem(KUNCI) || '')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const pesan = ref('')
const memuat = ref(false)
const daftar = ref([])
const filter = ref('menunggu')

const TAB = [
  { nilai: 'menunggu', label: 'Menunggu' },
  { nilai: 'aktif', label: 'Aktif' },
  { nilai: 'ditolak', label: 'Ditolak' },
  { nilai: 'nonaktif', label: 'Nonaktif' },
  { nilai: 'semua', label: 'Semua' },
]

/* ================= MENU / HALAMAN AKTIF ================= */
// /superadmin          -> Persetujuan Sekolah
// /superadmin/kendala  -> Laporan Kendala (dari admin sekolah)
const tabAktif = computed(() =>
  route.path.startsWith('/superadmin/kendala') ? 'kendala' : 'persetujuan'
)
const judulHalaman = computed(() =>
  tabAktif.value === 'kendala' ? 'Laporan Kendala' : 'Persetujuan Sekolah'
)

/* ================= API ================= */
async function panggil(path, opsi = {}) {
  const res = await fetch(API + path, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: 'Bearer ' + token.value } : {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token.value) {
    keluar()
    throw new Error('Sesi berakhir, silakan masuk lagi')
  }
  if (!res.ok) throw new Error(data.error || data.message || 'Terjadi kesalahan')
  return data
}

function keluar() {
  token.value = ''
  localStorage.removeItem(KUNCI)
  daftar.value = []
  jumlahKendalaBaru.value = 0
}

async function masuk() {
  pesan.value = ''
  memuat.value = true
  try {
    // tanpa sekolahId, backend hanya mencari akun superadmin
    const data = await panggil('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.value.trim(), password: password.value }),
    })
    if (data.role !== 'superadmin') throw new Error('Akun ini bukan super admin')
    token.value = data.token
    localStorage.setItem(KUNCI, data.token)
    password.value = ''
    await muat()
    muatJumlahKendala()
  } catch (e) {
    pesan.value = e.message
  } finally {
    memuat.value = false
  }
}

async function muat() {
  memuat.value = true
  pesan.value = ''
  try {
    daftar.value = await panggil('/sekolah')
  } catch (e) {
    pesan.value = e.message
  } finally {
    memuat.value = false
  }
}

async function ubahStatus(s, status, tanya) {
  if (!window.confirm(`${tanya} "${s.nama}"?`)) return
  pesan.value = ''
  try {
    const baru = await panggil(`/sekolah/${s.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    s.status = baru.status
    s.aktif = baru.aktif
  } catch (e) {
    pesan.value = e.message
  }
}

const tampil = computed(() =>
  filter.value === 'semua' ? daftar.value : daftar.value.filter((s) => s.status === filter.value)
)
const jumlah = (st) =>
  st === 'semua' ? daftar.value.length : daftar.value.filter((s) => s.status === st).length
const tanggal = (t) =>
  t ? new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

/* ================= BADGE LAPORAN KENDALA ================= */
const jumlahKendalaBaru = ref(0)

async function muatJumlahKendala() {
  if (!token.value) return
  try {
    const data = await panggil('/superadmin/kendala/jumlah')
    jumlahKendalaBaru.value = data.baru || 0
  } catch {
    // badge tidak kritis, abaikan kalau gagal
  }
}

// Setelah pindah kembali ke Persetujuan, segarkan angka badge kendala
watch(tabAktif, (tab) => {
  if (tab === 'persetujuan') muatJumlahKendala()
})

/* ================= SIDEBAR ================= */
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

function closeSidebarOutside(e) {
  // Hanya berlaku di tampilan mobile
  if (!window.matchMedia('(max-width: 768px)').matches) return

  // Klik di dalam sidebar, tombol hamburger, atau modal: abaikan
  if (e.target.closest('.sidebar, .hamburger, .modal-overlay')) return

  if (mobileMenuOpen.value) closeMobileMenu()
}

/* ================= LOGOUT ================= */
const showLogoutModal = ref(false)

function mintaLogout() {
  showLogoutModal.value = true
}

function batalLogout() {
  showLogoutModal.value = false
}

function konfirmasiLogout() {
  showLogoutModal.value = false
  keluar()
  router.push('/superadmin')
}

onMounted(() => {
  if (token.value) {
    muat()
    muatJumlahKendala()
  }
  window.addEventListener('click', closeSidebarOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeSidebarOutside)
})
</script>

<template>
  <!-- ===================== FORM MASUK ===================== -->
  <main v-if="!token" class="lg-shell">
    <div class="lg-card">
      <!-- PANEL ILUSTRASI -->
      <div class="lg-art">
        <div class="lg-blob lg-blob--1"></div>
        <div class="lg-blob lg-blob--2"></div>

        <div class="lg-brand">
          <img src="/logo.png" alt="Logo" />
          <div class="lg-brand-title">MANAGEMENT PERPUSTAKAAN</div>
        </div>

        <svg class="lg-illustration" viewBox="0 0 360 300" fill="none">
          <!-- jendela dashboard -->
          <rect x="30" y="36" width="270" height="200" rx="14" fill="#0b1a3a" />
          <circle cx="52" cy="58" r="5" fill="#f87171" />
          <circle cx="68" cy="58" r="5" fill="#f5b942" />
          <circle cx="84" cy="58" r="5" fill="#4ade80" />
          <rect x="30" y="76" width="270" height="2" fill="#1e3a6e" />

          <!-- baris sekolah menunggu persetujuan -->
          <rect x="48" y="94" width="234" height="32" rx="8" fill="#dbeafe" />
          <rect x="60" y="106" width="90" height="8" rx="4" fill="#0b1a3a" />
          <rect x="226" y="101" width="46" height="18" rx="9" fill="#2864e8" />

          <rect x="48" y="136" width="234" height="32" rx="8" fill="#93c5fd" />
          <rect x="60" y="148" width="110" height="8" rx="4" fill="#0b1a3a" />
          <rect x="226" y="143" width="46" height="18" rx="9" fill="#2864e8" />

          <rect x="48" y="178" width="150" height="32" rx="8" fill="#4f8ff7" />
          <rect x="60" y="190" width="70" height="8" rx="4" fill="#ffffff" />

          <!-- perisai persetujuan -->
          <path d="M270 160 L314 177 V212 C314 244 292 262 270 272 C248 262 226 244 226 212 V177 Z"
                fill="#2864e8" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" />
          <polyline points="250 216 265 231 291 200" stroke="#ffffff" stroke-width="9"
                    stroke-linecap="round" stroke-linejoin="round" />

          <!-- bintang kecil -->
          <path d="M320 70 L325 82 L338 83 L328 92 L331 105 L320 98 L309 105 L312 92 L302 83 L315 82 Z" fill="#f5b942" />
        </svg>

        <p class="lg-caption">Kelola persetujuan sekolah dan laporan kendala dari satu tempat.</p>
      </div>

      <!-- PANEL FORM -->
      <div class="lg-form-panel">
        <div class="lg-form-inner">
          <span class="lg-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Khusus Pengelola Sistem
          </span>
          <h1>Masuk Super Admin</h1>
          <p class="lg-subtitle">Gunakan akun super admin untuk melanjutkan.</p>

          <form @submit.prevent="masuk">
            <div class="lg-field">
              <label>Username</label>
              <div class="lg-input-wrap">
                <svg class="lg-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M5 21a7 7 0 0 1 14 0" />
                </svg>
                <input v-model="username" type="text" placeholder="Masukkan username" autocomplete="username" required />
              </div>
            </div>

            <div class="lg-field">
              <label>Password</label>
              <div class="lg-input-wrap">
                <svg class="lg-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Masukkan password"
                  autocomplete="current-password"
                  required
                />
                <button type="button" class="lg-eye" tabindex="-1" @click="showPassword = !showPassword">
                  <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 4.22-5.06M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="pesan" class="lg-error">{{ pesan }}</p>

            <button
              type="submit"
              class="lg-btn"
              :disabled="memuat"
              :style="{ opacity: memuat ? 0.7 : 1, cursor: memuat ? 'not-allowed' : 'pointer' }"
            >
              {{ memuat ? 'Memproses...' : 'Masuk' }}
            </button>
          </form>

          <router-link to="/" class="lg-back">← Kembali ke halaman login utama</router-link>
        </div>
      </div>
    </div>
  </main>

  <!-- ===================== DASHBOARD + SIDEBAR ===================== -->
  <div v-else class="layout">
    <aside class="sidebar" :class="{ 'sidebar-closed': !sidebarOpen, 'mobile-open': mobileMenuOpen }">
      <div class="brand" @click="bukaSidebarJikaTertutup">
        <img src="/logo.png" alt="Logo" class="icon icon-lg" />
        <div class="brand-text">
          <div class="brand-title">MANAGEMENT PERPUSTAKAAN</div>
        </div>
        <button class="sidebar-toggle-inside" type="button" @click.stop="toggleSidebar">
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
        <router-link to="/superadmin" class="nav-item" exact-active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span class="nav-label">Persetujuan Sekolah</span>
          </span>
          <span v-if="jumlah('menunggu') > 0" class="badge">{{ jumlah('menunggu') }}</span>
        </router-link>

        <router-link to="/superadmin/kendala" class="nav-item" active-class="active">
          <span class="nav-item-left">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span class="nav-label">Laporan Kendala</span>
          </span>
          <span v-if="jumlahKendalaBaru > 0" class="badge">{{ jumlahKendalaBaru }}</span>
        </router-link>

        <!-- Profile Card -->
        <div class="profile-card">
          <div class="avatar avatar-icon" v-html="icons.userCircle"></div>
          <div class="profile-text">
            <div class="profile-greet">Selamat datang,</div>
            <div class="profile-name">Super Admin</div>
            <div class="profile-role">Pengelola Sistem</div>
          </div>
        </div>
      </nav>

      <button class="btn-logout" type="button" @click="mintaLogout">
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

        <h2 class="page-title">{{ judulHalaman }}</h2>

        <div class="topbar-right">
          <div class="avatar-sm avatar-icon" v-html="icons.userCircle"></div>
          <div class="user-meta">
            <div class="user-name">Super Admin</div>
            <div class="user-role">Pengelola Sistem</div>
          </div>
        </div>
      </header>

      <div class="konten">
        <!-- ========== MENU 1: PERSETUJUAN SEKOLAH ========== -->
        <section v-if="tabAktif === 'persetujuan'" class="kartu">
          <header class="atas">
            <h1>Persetujuan Sekolah</h1>
            <div>
              <button class="kecil" :disabled="memuat" @click="muat">Muat ulang</button>
            </div>
          </header>

          <nav class="tab">
            <button v-for="t in TAB" :key="t.nilai" :class="{ pilih: filter === t.nilai }" @click="filter = t.nilai">
              {{ t.label }} ({{ jumlah(t.nilai) }})
            </button>
          </nav>

          <p v-if="pesan" class="galat">{{ pesan }}</p>
          <p v-if="!memuat && tampil.length === 0" class="kosong">Tidak ada sekolah pada status ini.</p>

          <div v-if="tampil.length" class="bungkus">
            <table>
              <thead>
                <tr><th>Sekolah</th><th>Admin</th><th>Terdaftar</th><th>Status</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in tampil" :key="s.id">
                  <td>{{ s.nama }}</td>
                  <td>{{ s.adminUsername }}<br /><small>{{ s.adminEmail }}</small></td>
                  <td>{{ tanggal(s.createdAt) }}</td>
                  <td><span class="lencana" :class="s.status">{{ s.status }}</span></td>
                  <td class="aksi">
                    <template v-if="s.status === 'menunggu'">
                      <button class="ya" @click="ubahStatus(s, 'aktif', 'Setujui')">Setujui</button>
                      <button class="tidak" @click="ubahStatus(s, 'ditolak', 'Tolak')">Tolak</button>
                    </template>
                    <button v-else-if="s.status === 'aktif'" class="tidak" @click="ubahStatus(s, 'nonaktif', 'Nonaktifkan')">Nonaktifkan</button>
                    <button v-else class="ya" @click="ubahStatus(s, 'aktif', 'Aktifkan')">Aktifkan</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ========== MENU 2: LAPORAN KENDALA (dari admin sekolah) ========== -->
        <KendalaInbox
          v-else
          endpoint="/superadmin/kendala"
          judul="Laporan Kendala dari Admin Sekolah"
          :token="token"
          tampil-sekolah
          @jumlah-baru="(n) => (jumlahKendalaBaru = n)"
          @sesi-berakhir="keluar"
        />
      </div>

      <div v-if="showLogoutModal" class="modal-overlay" @click.self="batalLogout">
        <div class="modal-box" role="dialog">
          <div class="modal-header">
            <h2>Keluar dari akun?</h2>
            <button class="modal-close" type="button" @click="batalLogout">×</button>
          </div>
          <div class="modal-body">
            <p>Anda akan keluar dari dashboard super admin.</p>
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
/* ===================== KARTU (Persetujuan Sekolah) ===================== */
.kartu { width: 100%; max-width: 1000px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.08); display: flex; flex-direction: column; gap: 12px; font-family: system-ui, sans-serif; }
.kartu h1 { margin: 0; font-size: 1.3rem; color: #0f172a; }
.kartu button { cursor: pointer; border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 600; background: #e2e8f0; color: #0f172a; }
.kartu button:disabled { opacity: .6; cursor: not-allowed; }
.atas { display: flex; justify-content: space-between; align-items: center; }
.kecil { margin-left: 6px; padding: 6px 12px !important; }
.tab { display: flex; gap: 6px; flex-wrap: wrap; }
.tab .pilih { background: #2563eb !important; color: #fff !important; }
.bungkus { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
small { color: #64748b; }
.aksi { white-space: nowrap; }
.aksi button { margin-right: 6px; }
.ya { background: #16a34a !important; color: #fff !important; }
.tidak { background: #dc2626 !important; color: #fff !important; }
.lencana { padding: 2px 10px; border-radius: 999px; font-size: .8rem; background: #e2e8f0; }
.lencana.menunggu { background: #fef3c7; color: #92400e; }
.lencana.aktif { background: #dcfce7; color: #166534; }
.lencana.ditolak { background: #fee2e2; color: #991b1b; }
.galat { color: #dc2626; margin: 0; }
.kosong { color: #64748b; }

/* ===================== HALAMAN MASUK SUPER ADMIN ===================== */
.lg-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #eaf1ff 0%, #ffffff 100%);
  font-family: 'Segoe UI', sans-serif;
}

.lg-card {
  width: 100%;
  max-width: 920px;
  min-height: 520px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  background: #1e3a6e;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(11, 26, 58, 0.25);
}

.lg-art {
  position: relative;
  background: #ffffff;
  border-radius: 28px 90px 90px 28px;
  padding: 36px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lg-blob {
  position: absolute;
  border-radius: 50%;
  background: #eaf1ff;
  z-index: 0;
}
.lg-blob--1 { width: 320px; height: 320px; top: -70px; right: -100px; }
.lg-blob--2 { width: 190px; height: 190px; bottom: -60px; left: -60px; background: #dbeafe; }

.lg-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0b1a3a;
}
.lg-brand img { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; }
.lg-brand-title { font-weight: 700; font-size: 20px; letter-spacing: 0.3px; }

.lg-illustration {
  position: relative;
  z-index: 1;
  width: 100%;
  flex: 1;
  margin: 16px 0;
}

.lg-caption {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 13px;
  color: #64748b;
  text-align: center;
  line-height: 1.5;
}

.lg-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lg-form-inner { width: 100%; max-width: 330px; }

.lg-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: rgba(79, 143, 247, 0.16);
  color: #93c5fd;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.lg-chip svg { width: 13px; height: 13px; }

.lg-form-inner h1 { margin: 0 0 6px; font-size: 26px; font-weight: 700; color: #ffffff; }
.lg-subtitle { margin: 0 0 26px; font-size: 13px; color: #9fb0d1; }

.lg-field { margin-bottom: 16px; }
.lg-field label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #c7d2e5; }

.lg-input-wrap { position: relative; display: flex; align-items: center; }
.lg-field-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: #6b7fa3;
  pointer-events: none;
}
.lg-input-wrap input {
  width: 100%;
  padding: 11px 38px 11px 36px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.lg-input-wrap input::placeholder { color: #6b7fa3; }
.lg-input-wrap input:focus { border-color: #2864e8; background: rgba(255, 255, 255, 0.08); }

.lg-eye {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #6b7fa3;
  cursor: pointer;
  padding: 4px;
}
.lg-eye svg { width: 16px; height: 16px; }
.lg-eye:hover { color: #9fb0d1; }

.lg-error { margin: 8px 0 4px; font-size: 13px; color: #f87171; text-align: center; line-height: 1.5; }

.lg-btn {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(135deg, #2864e8, #4f8ff7);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(40, 100, 232, 0.35);
  transition: filter 0.15s ease, transform 0.1s ease;
}
.lg-btn:hover { filter: brightness(1.05); }
.lg-btn:active { transform: translateY(1px); }

.lg-back {
  display: block;
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #9fb0d1;
  text-decoration: none;
}
.lg-back:hover { color: #ffffff; text-decoration: underline; }

@media (max-width: 860px) {
  .lg-card { grid-template-columns: 1fr; max-width: 440px; }
  .lg-art { border-radius: 28px 28px 0 0; padding: 28px; min-height: 240px; }
  .lg-illustration { margin: 10px 0; }
  .lg-form-panel { padding: 32px 28px 36px; }
}

@media (max-width: 480px) {
  .lg-shell { padding: 16px; }
  .lg-card { border-radius: 20px; min-height: auto; display: block; }
  .lg-art { display: none; }
  .lg-form-panel { padding: 32px 24px; }
  .lg-form-inner { max-width: 100%; }
}

/* ===================== LAYOUT + SIDEBAR (gaya sama seperti dashboard guru) ===================== */
.layout {
  display: flex;
  min-height: 100vh;
  font-family: 'Segoe UI', sans-serif;
  background: #f4f6fb;
  overflow-x: hidden;
  overflow-x: clip;
}

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.icon-lg {
  width: 26px;
  height: 26px;
  object-fit: contain;
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
  height: 100dvh;
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
  color: #fff;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.btn-logout {
  margin-top: 12px;
  flex-shrink: 0;
  margin-bottom: env(safe-area-inset-bottom, 0px);
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
  padding-top: 64px;
  transition: margin-left 0.25s ease;
}

.main-expanded .topbar { left: 76px; }

.konten {
  flex: 1;
  min-width: 0;
  width: 100%;
  padding: 24px;
}

.topbar {
  background: #fff;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  position: fixed;
  top: 0;
  left: 260px;
  right: 0;
  z-index: 40;
}

.page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
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

.modal-body p { margin: 0; }

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

/* ==================== RESPONSIVE MOBILE ==================== */
@media (max-width: 768px) {
  .sidebar-toggle-inside {
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

  .sidebar.sidebar-closed .brand {
    display: flex !important;
    width: auto !important;
    height: auto !important;
    margin: 0 0 24px !important;
    background: transparent !important;
  }

  .sidebar.sidebar-closed .brand-text,
  .sidebar.sidebar-closed .nav-label,
  .sidebar.sidebar-closed .profile-text {
    display: block !important;
  }

  .sidebar.sidebar-closed .badge {
    display: inline-flex !important;
  }

  .sidebar.sidebar-closed .nav-item,
  .sidebar.sidebar-closed .btn-logout {
    justify-content: flex-start !important;
    padding: 8px 10px !important;
  }

  .sidebar.sidebar-closed .nav-item {
    justify-content: space-between !important;
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
    padding: 12px 16px;
    gap: 10px;
    left: 0 !important;
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

  .konten {
    padding: 16px;
  }
}
</style>