<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const roles = [
  { value: 'siswa', label: 'Siswa' },
  { value: 'guru', label: 'Guru' },
  { value: 'admin', label: 'Admin' }
]

const selectedRole = ref('siswa')

const form = ref({
  nis: '',
  tanggalLahir: '',
  username: '',
  password: '',
  nip: ''
})

const errorMessage = ref('')
const isLoading = ref(false)

const roleLabel = computed(() => {
  const found = roles.find(r => r.value === selectedRole.value)
  return found ? found.label : ''
})

watch(selectedRole, () => {
  form.value = { nis: '', tanggalLahir: '', username: '', password: '', nip: '' }
  errorMessage.value = ''
})

async function handleLogin() {
  errorMessage.value = ''
  isLoading.value = true

  let payload = { role: selectedRole.value }

  if (selectedRole.value === 'siswa') {
    payload = { ...payload, nis: form.value.nis, tanggalLahir: form.value.tanggalLahir }
  } else if (selectedRole.value === 'guru') {
    payload = { ...payload, nip: form.value.nip, password: form.value.password }
  } else {
    payload = { ...payload, username: form.value.username, password: form.value.password }
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      errorMessage.value = data.message || 'Login gagal'
      return
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('role', data.role || selectedRole.value)
    localStorage.setItem('user', JSON.stringify({
      role: data.role || selectedRole.value,
      nama: data.nama
    }))

    const tujuan = {
      admin: '/admin',
      siswa: '/siswa',
      guru: '/guru'
    }

    router.push(tujuan[selectedRole.value] || '/admin')
  } catch (err) {
    errorMessage.value = 'Tidak bisa terhubung ke server'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="login-card">
      <!-- PANEL ILUSTRASI -->
      <div class="art-panel">
        <div class="art-blob art-blob--1"></div>
        <div class="art-blob art-blob--2"></div>

        <div class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <div>
            <div class="brand-title">MANAGEMENT PERPUSTAKAAN</div>
            <div class="brand-sub">SMK NEGERI 1 KERTOSONO</div>
          </div>
        </div>

        <svg class="shelf-illustration" viewBox="0 0 360 300" fill="none">
          <!-- rak -->
          <rect x="30" y="70" width="300" height="16" rx="3" fill="#0b1a3a" />
          <rect x="30" y="180" width="300" height="16" rx="3" fill="#0b1a3a" />
          <rect x="30" y="70" width="16" height="126" fill="#0b1a3a" />
          <rect x="314" y="70" width="16" height="126" fill="#0b1a3a" />

          <!-- buku baris atas -->
          <rect x="52" y="30" width="20" height="40" rx="2" fill="#2864e8" />
          <rect x="76" y="24" width="18" height="46" rx="2" fill="#93c5fd" />
          <rect x="98" y="34" width="16" height="36" rx="2" fill="#0b1a3a" />
          <rect x="118" y="20" width="20" height="50" rx="2" fill="#4f8ff7" />
          <rect x="142" y="30" width="18" height="40" rx="2" fill="#dbeafe" />
          <rect x="164" y="26" width="16" height="44" rx="2" fill="#2864e8" />
          <rect x="184" y="34" width="20" height="36" rx="2" fill="#93c5fd" />
          <rect x="208" y="22" width="18" height="48" rx="2" fill="#0b1a3a" />
          <rect x="230" y="30" width="16" height="40" rx="2" fill="#4f8ff7" />
          <rect x="250" y="28" width="20" height="42" rx="2" fill="#dbeafe" />
          <rect x="274" y="32" width="18" height="38" rx="2" fill="#2864e8" />

          <!-- buku baris bawah -->
          <rect x="52" y="140" width="18" height="40" rx="2" fill="#0b1a3a" />
          <rect x="74" y="132" width="20" height="48" rx="2" fill="#4f8ff7" />
          <rect x="98" y="144" width="16" height="36" rx="2" fill="#93c5fd" />
          <rect x="118" y="136" width="18" height="44" rx="2" fill="#2864e8" />
          <rect x="140" y="142" width="20" height="38" rx="2" fill="#dbeafe" />
          <rect x="164" y="130" width="16" height="50" rx="2" fill="#0b1a3a" />
          <rect x="184" y="140" width="18" height="40" rx="2" fill="#93c5fd" />
          <rect x="206" y="134" width="20" height="46" rx="2" fill="#4f8ff7" />
          <rect x="230" y="144" width="16" height="36" rx="2" fill="#2864e8" />
          <rect x="250" y="138" width="18" height="42" rx="2" fill="#dbeafe" />
          <rect x="272" y="142" width="20" height="38" rx="2" fill="#0b1a3a" />

          <!-- meja baca -->
          <rect x="90" y="230" width="180" height="10" rx="3" fill="#0b1a3a" />
          <rect x="100" y="240" width="10" height="30" fill="#0b1a3a" />
          <rect x="250" y="240" width="10" height="30" fill="#0b1a3a" />

          <!-- buku terbuka di meja -->
          <path d="M150 224 L180 216 L210 224 L210 234 L180 226 L150 234 Z" fill="#2864e8" />

          <!-- lampu baca -->
          <line x1="290" y1="270" x2="290" y2="200" stroke="#0b1a3a" stroke-width="4" />
          <path d="M290 200 L270 175 L310 175 Z" fill="#f5b942" />
          <circle cx="290" cy="270" r="6" fill="#0b1a3a" />
        </svg>

        <p class="art-caption">Kelola dan pinjam koleksi buku perpustakaan dengan mudah.</p>
      </div>

      <!-- PANEL FORM -->
      <div class="form-panel">
        <div class="form-inner">
          <h1>Masuk ke akun Anda</h1>
          <p class="form-subtitle">Pilih peran Anda untuk melanjutkan.</p>

          <div class="role-selector">
            <button
              v-for="role in roles"
              :key="role.value"
              type="button"
              class="role-option"
              :class="{ active: selectedRole === role.value }"
              @click="selectedRole = role.value"
            >
              {{ role.label }}
            </button>
          </div>

          <form @submit.prevent="handleLogin">
            <template v-if="selectedRole === 'siswa'">
              <div class="field">
                <label>NIS</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                  <input v-model="form.nis" type="text" placeholder="Masukkan NIS" required />
                </div>
              </div>
              <div class="field">
                <label>Tanggal Lahir</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <input v-model="form.tanggalLahir" type="date" required />
                </div>
              </div>
            </template>

            <template v-else-if="selectedRole === 'guru'">
              <div class="field">
                <label>NIP</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 21a7 7 0 0 1 14 0" />
                  </svg>
                  <input v-model="form.nip" type="text" placeholder="Masukkan NIP" required />
                </div>
              </div>
              <div class="field">
                <label>Password</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input v-model="form.password" type="password" placeholder="Masukkan password" required />
                </div>
              </div>
            </template>

            <template v-else>
              <div class="field">
                <label>Username</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 21a7 7 0 0 1 14 0" />
                  </svg>
                  <input v-model="form.username" type="text" placeholder="Masukkan username" required />
                </div>
              </div>
              <div class="field">
                <label>Password</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input v-model="form.password" type="password" placeholder="Masukkan password" required />
                </div>
              </div>
            </template>

            <!-- TAMBAHKAN INI: tampilkan error -->
  <p v-if="errorMessage" style="color: #f87171; font-size: 13px; margin: 8px 0 4px; text-align: center;">
    {{ errorMessage }}
  </p>

  <button 
    type="submit" 
    class="btn-login"
    :disabled="isLoading"
    :style="{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }"
  >
    {{ isLoading ? 'Memproses...' : `Masuk sebagai ${roleLabel}` }}
  </button>
</form>

          <p class="form-footer">
            Ada kendala saat masuk? Hubungi admin perpustakaan.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.login-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #eaf1ff 0%, #ffffff 100%);
  font-family: 'Segoe UI', sans-serif;
}

.login-card {
  width: 100%;
  max-width: 980px;
  min-height: 560px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #1e3a6e;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(11, 26, 58, 0.25);
}

/* ===== PANEL ILUSTRASI ===== */
.art-panel {
  position: relative;
  background: #ffffff;
  border-radius: 28px 90px 90px 28px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.art-blob {
  position: absolute;
  border-radius: 50%;
  background: #eaf1ff;
  z-index: 0;
}
.art-blob--1 {
  width: 340px;
  height: 340px;
  top: -60px;
  right: -100px;
}
.art-blob--2 {
  width: 200px;
  height: 200px;
  bottom: -60px;
  left: -60px;
  background: #dbeafe;
}

.brand-mark {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0b1a3a;
}
.brand-mark svg {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}
.brand-title {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.3px;
}
.brand-sub {
  font-size: 11px;
  opacity: 0.6;
}

.shelf-illustration {
  position: relative;
  z-index: 1;
  width: 100%;
  flex: 1;
  margin: 20px 0;
}

.art-caption {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 13px;
  color: #64748b;
  text-align: center;
  line-height: 1.5;
}

/* ===== PANEL FORM ===== */
.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-inner {
  width: 100%;
  max-width: 340px;
}

.form-inner h1 {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  color: #ffffff;
}

.form-subtitle {
  margin: 0 0 24px;
  font-size: 13px;
  color: #9fb0d1;
}

.role-selector {
  display: flex;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  padding: 5px;
  border-radius: 10px;
  margin-bottom: 22px;
}

.role-option {
  flex: 1;
  padding: 9px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #9fb0d1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.role-option.active {
  background: #2864e8;
  color: #ffffff;
}

.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #c7d2e5;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.field-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: #6b7fa3;
  pointer-events: none;
}
.input-wrap input {
  width: 100%;
  padding: 11px 12px 11px 36px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.input-wrap input::placeholder {
  color: #6b7fa3;
}
.input-wrap input:focus {
  border-color: #2864e8;
  background: rgba(255, 255, 255, 0.08);
}
.input-wrap input[type="date"] {
  color-scheme: dark;
}

.btn-login {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(135deg, #2864e8, #4f8ff7);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(40, 100, 232, 0.35);
  transition: filter 0.15s ease, transform 0.1s ease;
}
.btn-login:hover {
  filter: brightness(1.05);
}
.btn-login:active {
  transform: translateY(1px);
}

.form-footer {
  margin: 20px 0 0;
  font-size: 12px;
  color: #6b7fa3;
  text-align: center;
  line-height: 1.5;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 860px) {
  .login-card {
    grid-template-columns: 1fr;
    max-width: 440px;
  }
  .art-panel {
    border-radius: 28px 28px 0 0;
    padding: 28px;
    min-height: 260px;
  }
  .shelf-illustration {
    margin: 12px 0;
  }
  .form-panel {
    padding: 32px 28px 36px;
  }
}

@media (max-width: 480px) {
  .login-shell {
    padding: 0;
  }
  .login-card {
    border-radius: 0;
    min-height: 100vh;
  }
  .art-panel {
    border-radius: 0;
    min-height: 220px;
    padding: 24px;
  }
  .art-caption {
    display: none;
  }
}

.error-text {
  color: #dc2626;
  font-size: 0.85rem;
  margin: -10px 0 14px;
  text-align: center;
}
</style>