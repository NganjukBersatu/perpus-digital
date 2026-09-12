<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logoutUser, authHeaders } from '@/utils/auth'


const router = useRouter()

const tabs = [
  { id: 'profil', label: 'Profil' },
  { id: 'keamanan', label: 'Keamanan' }
]

const activeTab = ref('profil')
const toast = ref('')
const savedAt = ref('')
const isLoading = ref(true)
const isSaving = ref(false)

const profile = reactive({
  nama: '',
  username: '',
  email: '',
  telepon: '',
  jabatan: '',
  nip: '',
})

const security = reactive({
  passwordLama: '',
  passwordBaru: '',
  konfirmasiPassword: '',
  tampilkanPasswordLama: false,
  tampilkanPasswordBaru: false,
})

const initials = computed(() => {
  return profile.nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
})

const toastTipe = ref('')

function showToast(text, tipe = '') {
  toast.value = text
  toastTipe.value = tipe
  setTimeout(() => {
    toast.value = ''
    toastTipe.value = ''
  }, 2200)
}

async function loadProfile() {
  isLoading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/admin/profil', {
      headers: { ...authHeaders() },
    })
    if (!res.ok) throw new Error('Gagal memuat profil')
    const data = await res.json()

    profile.nama = data.namaLengkap
    profile.username = data.username
    profile.email = data.email || ''
    profile.telepon = data.telepon || ''
    profile.jabatan = data.jabatan || ''
    profile.nip = data.nipNik || ''
  } catch (err) {
    console.error(err)
    showToast('Gagal memuat profil dari server')
  } finally {
    isLoading.value = false
  }
}

async function saveProfile() {
  if (!profile.nama.trim()) {
    showToast('Nama wajib diisi')
    return
  }
  if (!profile.username.trim()) {
    showToast('Username wajib diisi')
    return
  }
  isSaving.value = true
  try {
    const res = await fetch('http://localhost:3000/api/admin/profil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        namaLengkap: profile.nama,
        username: profile.username.trim(),
        email: profile.email,
        telepon: profile.telepon,
        jabatan: profile.jabatan,
        nipNik: profile.nip,
      }),
    })
    const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')

    const userLama = JSON.parse(localStorage.getItem('user') || '{}')
    localStorage.setItem('user', JSON.stringify({
      ...userLama,
      namaLengkap: profile.nama,
      username: profile.username.trim(),
      jabatan: profile.jabatan,
    }))

    window.dispatchEvent(new CustomEvent('admin-profil-updated', {
      detail: {
        namaLengkap: profile.nama,
        username: profile.username.trim(),
        jabatan: profile.jabatan,
      },
    }))

    savedAt.value = new Date().toLocaleString('id-ID')
    showToast('Profil admin berhasil disimpan')
  } catch (err) {
    console.error(err)
    showToast(err.message || 'Gagal menyimpan profil')
  } finally {
    isSaving.value = false
  }
}

async function changePassword() {
  if (!security.passwordLama || !security.passwordBaru || !security.konfirmasiPassword) {
    showToast('Lengkapi password lama, password baru, dan konfirmasi', 'error')
    return
  }
  if (security.passwordBaru.length < 8) {
    showToast('Password baru minimal 8 karakter', 'error')
    return
  }

  // jika tidak sama → ulangi, jangan kirim ke server
  if (security.passwordBaru !== security.konfirmasiPassword) {
    showToast('Password tidak sama', 'error')
    return
  }

  try {
    const res = await fetch('http://localhost:3000/api/admin/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        passwordLama: security.passwordLama,
        passwordBaru: security.passwordBaru,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast(data.error || 'Gagal mengubah password', 'error')
      return
    }

    security.passwordLama = ''
    security.passwordBaru = ''
    security.konfirmasiPassword = ''
    security.tampilkanPasswordLama = false
    security.tampilkanPasswordBaru = false
    showToast('Konfirmasi berhasil', 'sukses')
  } catch (err) {
    console.error(err)
    showToast('Gagal terhubung ke server', 'error')
  }
}

function logout() {
  logoutUser(router)
}

const showLogoutModal = ref(false)
function mintaLogout() { showLogoutModal.value = true }
function batalLogout() { showLogoutModal.value = false }
function konfirmasiLogout() {
  showLogoutModal.value = false
  logoutUser(router)
}

onMounted(loadProfile)
</script>

<template>
  <div class="akun-page">

    <!-- ================= HEADER DENGAN BANNER ILUSTRASI ================= -->
    <header class="page-head card-banner">
      <div class="page-head-left">
        <div class="page-head-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div>
          <h1>Akun Admin</h1>
          <p>Kelola profil pustakawan, password, dan sesi login.</p>
        </div>
      </div>

      <div class="head-actions">
        <button class="btn ghost" type="button" @click="mintaLogout">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Keluar
        </button>
        <button class="btn primary" type="button" :disabled="isSaving" @click="saveProfile">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ isSaving ? 'Menyimpan...' : 'Simpan Profil' }}
        </button>
      </div>

      <!-- Banner ilustrasi di kanan (dekorasi) -->
      <div class="banner-art" aria-hidden="true">
        <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c7d7ff"/>
              <stop offset="100%" stop-color="#7c9cff"/>
            </linearGradient>
            <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#dbe6ff"/>
              <stop offset="100%" stop-color="#8fb0ff"/>
            </linearGradient>
          </defs>
          <!-- lingkaran dekor -->
          <circle cx="150" cy="50" r="34" fill="#e8efff" opacity="0.8"/>
          <circle cx="60" cy="100" r="22" fill="#eef3ff" opacity="0.9"/>
          <!-- gear -->
          <g transform="translate(120,30)">
            <path d="M22 11a2 2 0 0 1 1.4-.6 2 2 0 0 1 1.4.6l1.2 1.2a2 2 0 0 1 .6 1.4 2 2 0 0 1-.6 1.4l-.5.5a8 8 0 0 1 0 2.9l.5.5a2 2 0 0 1 0 2.8l-1.2 1.2a2 2 0 0 1-2.8 0l-.5-.5a8 8 0 0 1-2.9 0l-.5.5a2 2 0 0 1-2.8 0L13 23.4a2 2 0 0 1 0-2.8l.5-.5a8 8 0 0 1 0-2.9l-.5-.5a2 2 0 0 1 0-2.8l1.2-1.2a2 2 0 0 1 2.8 0l.5.5a8 8 0 0 1 2.9 0l.5-.5z" fill="url(#gA)" opacity="0.85"/>
            <circle cx="16" cy="18" r="4" fill="#fff"/>
          </g>
          <!-- tumpukan buku -->
          <g transform="translate(70,80)">
            <rect x="0" y="20" width="60" height="8" rx="2" fill="url(#gB)"/>
            <rect x="6" y="10" width="48" height="8" rx="2" fill="url(#gA)"/>
            <rect x="12" y="0" width="36" height="8" rx="2" fill="#a6bcff"/>
          </g>
          <!-- sparkle -->
          <g fill="#b7c9ff">
            <path d="M40 40l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>
            <path d="M170 90l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z"/>
          </g>
        </svg>
      </div>
    </header>

    <!-- ================= HERO PROFIL ================= -->
    <section class="hero card">
      <div class="avatar">{{ initials }}</div>
      <div class="hero-info">
        <h2>{{ profile.nama || 'Admin Perpustakaan' }}</h2>
        <p class="hero-meta">
          <span>{{ profile.jabatan || 'Pustakawan' }}</span>
          <span class="dot">·</span>
          <span>@{{ profile.username || 'admin' }}</span>
        </p>
        <p class="hero-email">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {{ profile.email || '-' }}
        </p>
      </div>

      <div class="hero-art" aria-hidden="true">
        <svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="110" cy="90" rx="80" ry="14" fill="#eef3ff"/>
          <rect x="60" y="60" width="100" height="14" rx="3" fill="#c7d7ff"/>
          <rect x="70" y="46" width="80" height="14" rx="3" fill="#a6bcff"/>
          <rect x="80" y="32" width="60" height="14" rx="3" fill="#8fb0ff"/>
          <g stroke="#7c9cff" stroke-width="2" fill="none" opacity="0.7">
            <path d="M30 40l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>
            <path d="M190 30l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z"/>
          </g>
        </svg>
      </div>
    </section>

    <!-- ================= TABS ================= -->
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon" v-if="tab.id === 'profil'">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </span>
        <span class="tab-icon" v-else>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </span>
        {{ tab.label }}
      </button>
    </nav>

    <!-- ================= TAB PROFIL ================= -->
    <section v-show="activeTab === 'profil'" class="card">
      <div class="section-head">
        <div class="section-icon icon-user">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div>
          <h3>Data Profil</h3>
          <p class="hint">Data ini tampil di sidebar dan header dashboard admin.</p>
        </div>
      </div>

      <div class="grid-2">
        <label>
          Nama lengkap
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input v-model="profile.nama" type="text" placeholder="Administrator" />
          </div>
        </label>

        <label>
          Username
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input v-model="profile.username" type="text" autocomplete="username" />
          </div>
        </label>

        <label>
          Email
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input v-model="profile.email" type="email" placeholder="perpustakaan@sekolah.sch.id" />
          </div>
        </label>

        <label>
          Telepon
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </span>
            <input v-model="profile.telepon" type="text" placeholder="08xxxxxxxxxx" />
          </div>
        </label>

        <label>
          Jabatan
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </span>
            <input v-model="profile.jabatan" type="text" placeholder="Pustakawan" />
          </div>
        </label>

        <label>
          NIP / NIK
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <circle cx="8" cy="12" r="2.5"/>
                <path d="M14 10h6M14 14h4"/>
              </svg>
            </span>
            <input v-model="profile.nip" type="text" placeholder="Masukkan NIP / NIK" />
          </div>
        </label>
      </div>
    </section>

    <!-- ================= TAB KEAMANAN ================= -->
    <section v-show="activeTab === 'keamanan'" class="card">
      <div class="section-head">
        <div class="section-icon icon-shield">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <h3>Ubah Password</h3>
          <p class="hint">Gunakan password baru minimal 8 karakter. Jangan bagikan ke siswa atau guru.</p>
        </div>
      </div>

      <div class="form-vertical">
        <label>
          Password saat ini
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              v-model="security.passwordLama"
              :type="security.tampilkanPasswordLama ? 'text' : 'password'"
              placeholder="Masukkan password saat ini"
            />
            <button
              type="button"
              class="input-eye"
              @click="security.tampilkanPasswordLama = !security.tampilkanPasswordLama"
              :title="security.tampilkanPasswordLama ? 'Sembunyikan' : 'Tampilkan'"
            >
              <svg v-if="security.tampilkanPasswordLama" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </label>

        <label>
          Password baru
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              v-model="security.passwordBaru"
              :type="security.tampilkanPasswordBaru ? 'text' : 'password'"
              placeholder="Masukkan password baru"
            />
            <button
              type="button"
              class="input-eye"
              @click="security.tampilkanPasswordBaru = !security.tampilkanPasswordBaru"
            >
              <svg v-if="security.tampilkanPasswordBaru" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </label>

        <label>
          Konfirmasi password baru
          <div class="input-with-icon">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              v-model="security.konfirmasiPassword"
              type="password"
              autocomplete="new-password"
              placeholder="Konfirmasi password baru"
            />
          </div>
        </label>
      </div>

      <div class="actions">
        <button class="btn primary" type="button" @click="changePassword">
          Perbarui Password
        </button>
      </div>
    </section>

    <!-- ================= MODAL LOGOUT ================= -->
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
          <button class="btn ghost" type="button" @click="batalLogout">Batal</button>
          <button class="btn danger" type="button" @click="konfirmasiLogout">Ya, Keluar</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast" :class="toastTipe">{{ toast }}</div>
  </div>
</template>

<style scoped>
.akun-page {
  padding: 24px 28px 48px;
  color: #0f172a;
}

/* ================= HEADER ================= */
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
  position: relative;
  overflow: hidden;
}

.card-banner {
  background: linear-gradient(120deg, #eef3ff 0%, #e5edff 60%, #dde6ff 100%);
  border: 1px solid #dbe4ff;
  border-radius: 16px;
  padding: 20px 24px;
  min-height: 120px;
}

.page-head-left {
  display: flex;
  gap: 14px;
  align-items: center;
  z-index: 1;
}

.page-head-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #fff;
  color: #2563eb;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
}

.page-head-icon svg {
  width: 26px;
  height: 26px;
}

.page-head h1 {
  margin: 0;
  font-size: 22px;
  color: #1e293b;
}

.page-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.head-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  z-index: 1;
}

/* Banner ilustrasi di kanan */
.banner-art {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 280px;
  pointer-events: none;
  opacity: 0.95;
}

.banner-art svg {
  width: 100%;
  height: 100%;
}

/* ================= HERO PROFIL ================= */
.hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
  padding: 20px 24px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(120deg, #ffffff 0%, #f6f9ff 100%);
  border: 1px solid #e6ecf8;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.hero-info {
  flex: 1;
  min-width: 0;
  z-index: 1;
}

.hero h2 {
  margin: 0 0 4px;
  font-size: 20px;
  color: #1e293b;
}

.hero-meta {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 13px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.hero-meta .dot {
  opacity: 0.6;
}

.hero-email {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hero-art {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 260px;
  pointer-events: none;
}

.hero-art svg {
  width: 100%;
  height: 100%;
}

/* ================= TABS ================= */
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 16px;
}

.tab {
  border: 0;
  background: #eef2ff;
  color: #1e3a8a;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tab:hover {
  background: #dbe4ff;
}

.tab.active {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.tab-icon {
  display: inline-flex;
}

/* ================= CARD ================= */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px 24px 26px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.section-head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.section-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.icon-user {
  background: #eef2ff;
  color: #2563eb;
}

.icon-shield {
  background: #eef2ff;
  color: #2563eb;
}

.card h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #1e293b;
}

.hint {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

/* ================= FORM ================= */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 18px;
}

.form-vertical {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  pointer-events: none;
}

.input-with-icon input,
.input-with-icon textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px 12px 42px;
  font: inherit;
  font-weight: 500;
  color: #0f172a;
  background: #fbfdff;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
  min-height: 44px;
}

.input-with-icon input::placeholder,
.input-with-icon textarea::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.input-with-icon input:focus,
.input-with-icon textarea:focus {
  outline: none;
  border-color: #2563eb;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.input-with-icon textarea {
  padding-top: 12px;
  padding-bottom: 12px;
  resize: vertical;
  min-height: 80px;
}

.input-eye {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  border-radius: 6px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.input-eye:hover {
  color: #2563eb;
  background: #eef2ff;
}

/* ================= ACTIONS ================= */
.actions {
  margin-top: 22px;
  display: flex;
  justify-content: flex-end;
}

/* ================= BUTTONS ================= */
.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn.primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn.ghost {
  background: #fff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}

.btn.ghost:hover {
  background: #f1f5f9;
}

.btn.danger {
  background: #dc2626;
  color: #fff;
}

.btn.danger:hover {
  background: #b91c1c;
}

/* ================= TOAST ================= */
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #0f172a;
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
  z-index: 200;
}

.toast.sukses {
  background: #16a34a;
}

.toast.error {
  background: #dc2626;
}

/* ================= MODAL ================= */
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
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
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
  color: #94a3b8;
  cursor: pointer;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  padding: 16px 20px;
}

.modal-body p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
}

/* ================= RESPONSIVE ================= */
@media (max-width: 900px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .banner-art {
    display: none;
  }

  .hero-art {
    display: none;
  }

  .grid-2 {
    grid-template-columns: 1fr;
  }

  .head-actions {
    width: 100%;
  }

  .head-actions .btn {
    flex: 1;
    justify-content: center;
  }
}
</style>