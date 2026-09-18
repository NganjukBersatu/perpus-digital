<script setup>
import { ref, onMounted, watch } from 'vue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const profil = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

// ===== TAB =====
const activeTab = ref('profil') // 'profil' | 'password'

// ===== GANTI PASSWORD =====
const wajibGantiPassword = ref(false)
const passwordBaru = ref('')
const konfirmasiPassword = ref('')
const showPasswordBaru = ref(false)
const showKonfirmasi = ref(false)
const gantiPasswordError = ref('')
const gantiPasswordSukses = ref(false)
const isSavingPassword = ref(false)

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

function getUserLocal() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

function switchTab(tab) {
  // Selama wajib ganti password, tab "Profil" dikunci
  if (wajibGantiPassword.value && tab === 'profil') return
  activeTab.value = tab
}

async function fetchProfil() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(`${API_BASE}/dashboard-guru/profil`, {
      headers: authHeaders()
    })

    if (res.ok) {
      profil.value = await res.json()
      return
    }

    const user = getUserLocal()
    if (user && (user.nama || user.nip)) {
      profil.value = {
        nama: user.nama || '',
        nip: user.nip || '',
        mapel: user.mapel || '',
        email: user.email || '',
        tanggalLahir: user.tanggalLahir || null
      }
      return
    }

    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Gagal mengambil profil')
  } catch (err) {
    console.error(err)

    const user = getUserLocal()
    if (user && (user.nama || user.nip)) {
      profil.value = {
        nama: user.nama || '',
        nip: user.nip || '',
        mapel: user.mapel || '',
        email: user.email || '',
        tanggalLahir: user.tanggalLahir || null
      }
      errorMessage.value = ''
    } else {
      errorMessage.value = 'Gagal memuat profil. Coba periksa koneksi kamu.'
    }
  } finally {
    isLoading.value = false
  }
}

function getInitial(nama) {
  if (!nama) return '?'
  return nama.trim().charAt(0).toUpperCase()
}

function formatTanggal(tanggal) {
  if (!tanggal) return '—'
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

async function handleGantiPassword() {
  gantiPasswordError.value = ''
  gantiPasswordSukses.value = false

  if (passwordBaru.value.length < 8) {
    gantiPasswordError.value = 'Password baru minimal 8 karakter'
    return
  }
  if (passwordBaru.value !== konfirmasiPassword.value) {
    gantiPasswordError.value = 'Konfirmasi password tidak cocok'
    return
  }

  isSavingPassword.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/guru/ganti-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ passwordBaru: passwordBaru.value })
    })

    const data = await res.json()

    if (!res.ok) {
      gantiPasswordError.value = data.error || 'Gagal mengganti password'
      return
    }

    // Perbarui localStorage supaya kunci tab & notifikasi "wajib ganti" hilang
    const user = getUserLocal()
    user.harusGantiPassword = false
    localStorage.setItem('user', JSON.stringify(user))
    wajibGantiPassword.value = false
    activeTab.value = 'profil'

    gantiPasswordSukses.value = true
    passwordBaru.value = ''
    konfirmasiPassword.value = ''
  } catch (err) {
    console.error('GANTI PASSWORD ERROR:', err)
    gantiPasswordError.value = 'Tidak bisa terhubung ke server'
  } finally {
    isSavingPassword.value = false
  }
}

onMounted(() => {
  fetchProfil()
  const user = getUserLocal()
  wajibGantiPassword.value = !!user.harusGantiPassword
  if (wajibGantiPassword.value) activeTab.value = 'password'
})

// jaga-jaga kalau flag berubah selama halaman terbuka
watch(wajibGantiPassword, (val) => {
  if (val) activeTab.value = 'password'
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Profil Saya</h1>
      <p class="muted">Lihat informasi akun dan kelola keamanan akun Anda.</p>
    </div>

    <!-- ===== TAB NAV ===== -->
    <div class="tab-nav">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'profil', locked: wajibGantiPassword }"
        :disabled="wajibGantiPassword"
        @click="switchTab('profil')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="3" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
        Profil
        <svg v-if="wajibGantiPassword" class="lock-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4zm-2 7V5a2 2 0 1 1 4 0v3z" />
        </svg>
      </button>

      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'password' }"
        @click="switchTab('password')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Password
      </button>
    </div>

    <p v-if="wajibGantiPassword" class="lock-hint">
      Anda harus mengganti password sebelum bisa membuka menu lain.
    </p>

    <div v-if="isLoading" class="empty-state">
      <p>Memuat profil...</p>
    </div>

    <div v-else-if="errorMessage" class="empty-state">
      <p>{{ errorMessage }}</p>
      <button class="btn-primary" @click="fetchProfil">Coba Lagi</button>
    </div>

    <template v-else-if="profil">
      <!-- ===== TAB: PROFIL ===== -->
      <div v-show="activeTab === 'profil'" class="profile-card">
        <div class="profile-header">
          <div class="avatar">{{ getInitial(profil.nama) }}</div>
          <div>
            <h2>{{ profil.nama }}</h2>
            <p>{{ profil.mapel || 'Guru' }}</p>
          </div>
        </div>

        <div class="profile-info">
          <div class="info-item">
            <span class="info-label">Nama Lengkap</span>
            <span class="info-value">{{ profil.nama || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">NIP</span>
            <span class="info-value">{{ profil.nip || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Mata Pelajaran</span>
            <span class="info-value">{{ profil.mapel || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">{{ profil.email || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Tanggal Lahir</span>
            <span class="info-value">{{ formatTanggal(profil.tanggalLahir) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="status-badge">Guru</span>
          </div>
        </div>
      </div>

      <!-- ===== TAB: PASSWORD ===== -->
      <div v-show="activeTab === 'password'" class="profile-card password-card">
        <div v-if="wajibGantiPassword" class="wajib-banner">
          <strong>Anda masih menggunakan password awal (NIP).</strong>
          <p>Untuk keamanan akun, silakan buat password baru sekarang.</p>
        </div>

        <h2 class="section-title">Ganti Password</h2>
        <p class="muted section-subtitle">
          Gunakan password yang mudah Anda ingat, tapi tidak mudah ditebak orang lain.
        </p>

        <form class="password-form" @submit.prevent="handleGantiPassword">
          <div class="field">
  <label>Password baru</label>
  <div class="password-input-wrap">
    <input
      v-model="passwordBaru"
      :type="showPasswordBaru ? 'text' : 'password'"
      placeholder="Minimal 8 karakter"
      required
    />
    <button
      type="button"
      class="toggle-eye"
      tabindex="-1"
      @click="showPasswordBaru = !showPasswordBaru"
    >
      <svg v-if="!showPasswordBaru" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

<div class="field">
  <label>Konfirmasi password baru</label>
  <div class="password-input-wrap">
    <input
      v-model="konfirmasiPassword"
      :type="showKonfirmasi ? 'text' : 'password'"
      placeholder="Ulangi password baru"
      required
    />
    <button
      type="button"
      class="toggle-eye"
      tabindex="-1"
      @click="showKonfirmasi = !showKonfirmasi"
    >
      <svg v-if="!showKonfirmasi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <p v-if="gantiPasswordError" class="error-text">{{ gantiPasswordError }}</p>
          <p v-if="gantiPasswordSukses" class="success-text">Password berhasil diganti.</p>

          <button type="submit" class="btn-primary" :disabled="isSavingPassword">
            {{ isSavingPassword ? 'Menyimpan...' : 'Simpan password baru' }}
          </button>
        </form>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { padding: 28px; }
.page-header h1 { margin: 0 0 4px; font-size: 1.5rem; color: #0f172a; }
.muted { margin: 0; color: #64748b; max-width: 520px; line-height: 1.5; }

/* ===== TAB NAV ===== */
.tab-nav {
  display: flex;
  gap: 8px;
  margin: 20px 0 6px;
  flex-wrap: wrap;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.tab-btn svg { width: 16px; height: 16px; }
.tab-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.tab-btn.locked {
  cursor: not-allowed;
  opacity: 0.55;
}
.lock-icon { width: 13px; height: 13px; margin-left: 2px; }

.lock-hint {
  margin: 0 0 16px;
  font-size: 0.82rem;
  color: #b45309;
}

.profile-card {
  margin-top: 14px;
  background: #fff;
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  max-width: 800px;
}
.profile-header { display: flex; align-items: center; gap: 18px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: #dbeafe; color: #1e40af; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; }
.profile-header h2 { margin: 0 0 4px; color: #0f172a; font-size: 1.3rem; }
.profile-header p { margin: 0; color: #64748b; }
.profile-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; padding-top: 24px; }
.info-item { display: flex; flex-direction: column; gap: 6px; }
.info-label { font-size: 0.8rem; color: #64748b; }
.info-value { font-size: 0.95rem; font-weight: 600; color: #0f172a; }
.status-badge { width: fit-content; padding: 5px 12px; border-radius: 20px; background: #dbeafe; color: #1d4ed8; font-size: 0.8rem; font-weight: 600; }

.empty-state { margin-top: 20px; background: #fff; border-radius: 14px; padding: 40px 20px; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.wajib-banner { margin-bottom: 20px; padding: 14px 16px; border-radius: 10px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
.wajib-banner strong { display: block; margin-bottom: 2px; font-size: 0.9rem; }
.wajib-banner p { margin: 0; font-size: 0.85rem; }

.section-title { margin: 0 0 4px; color: #0f172a; font-size: 1.15rem; }
.section-subtitle { margin-bottom: 18px; }
.password-form { max-width: 360px; }
.field { margin-bottom: 14px; }
.field label { display: block; margin-bottom: 6px; font-size: 0.8rem; font-weight: 600; color: #334155; }
.field input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.9rem; outline: none; }
.field input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.password-input-wrap input {
  width: 100%;
  padding-right: 40px;
}
.toggle-eye {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}
.toggle-eye svg {
  width: 18px;
  height: 18px;
}
.toggle-eye:hover {
  color: #64748b;
}
.error-text { margin: -4px 0 12px; color: #dc2626; font-size: 0.82rem; }
.success-text { margin: -4px 0 12px; color: #16a34a; font-size: 0.82rem; }

@media (max-width: 700px) {
  .profile-info { grid-template-columns: 1fr; }
}
</style>