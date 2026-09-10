<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logoutUser } from '@/utils/auth'


const router = useRouter()
const STORAGE_KEY = 'perpus_akun_admin'

const tabs = [
  { id: 'profil', label: 'Profil' },
  { id: 'keamanan', label: 'Keamanan' },
  { id: 'sesi', label: 'Sesi & Aktivitas' }
]

const activeTab = ref('profil')
const toast = ref('')
const savedAt = ref('')

const profile = reactive({
  nama: 'Admin Perpustakaan',
  username: 'admin.perpus',
  email: 'perpustakaan@smkn1kertosono.sch.id',
  telepon: '',
  jabatan: 'Pustakawan',
  nip: '',
  bio: ''
})

const security = reactive({
  passwordLama: '',
  passwordBaru: '',
  konfirmasiPassword: '',
  tampilkanPassword: false
})

const session = reactive({
  lastLogin: '-',
  device: 'Windows / Chrome',
  notifikasiEmail: true,
  simpanSesi: true
})

const initials = computed(() => {
  return profile.nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
})

function showToast(text) {
  toast.value = text
  setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function loadAccount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      session.lastLogin = new Date().toLocaleString('id-ID')
      return
    }
    const data = JSON.parse(raw)
    if (data.profile) Object.assign(profile, data.profile)
    if (data.session) Object.assign(session, data.session)
    savedAt.value = data.savedAt || ''
  } catch (e) {
    console.warn('Gagal memuat akun admin', e)
  }
}

function persist(extra = {}) {
  const payload = {
    profile: { ...profile },
    session: { ...session },
    savedAt: new Date().toLocaleString('id-ID'),
    ...extra
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  savedAt.value = payload.savedAt
}

function saveProfile() {
  if (!profile.nama.trim() || !profile.username.trim()) {
    showToast('Nama dan username wajib diisi')
    return
  }
  persist()
  showToast('Profil admin berhasil disimpan')
}

function changePassword() {
  if (!security.passwordLama || !security.passwordBaru) {
    showToast('Lengkapi password lama dan password baru')
    return
  }
  if (security.passwordBaru.length < 8) {
    showToast('Password baru minimal 8 karakter')
    return
  }
  if (security.passwordBaru !== security.konfirmasiPassword) {
    showToast('Konfirmasi password tidak sama')
    return
  }

  persist({ passwordUpdatedAt: new Date().toLocaleString('id-ID') })
  security.passwordLama = ''
  security.passwordBaru = ''
  security.konfirmasiPassword = ''
  showToast('Password berhasil diperbarui')
}

function saveSessionPref() {
  persist()
  showToast('Preferensi sesi disimpan')
}

function logout() {
  logoutUser(router)
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
  logoutUser(router)
}

onMounted(loadAccount)
</script>

<template>
  <div class="akun-page">
    <header class="page-head">
      <div>
        <h1>Akun Admin</h1>
        <p>Kelola profil pustakawan, password, dan sesi login.</p>
      </div>
      <div class="head-actions">
        <span v-if="savedAt" class="saved-info">Terakhir diubah: {{ savedAt }}</span>
        <button class="btn ghost" type="button" @click="mintaLogout">Keluar</button>
        <button class="btn primary" type="button" @click="saveProfile">Simpan Profil</button>
      </div>
    </header>

    <section class="hero card">
      <div class="avatar">{{ initials }}</div>
      <div>
        <h2>{{ profile.nama }}</h2>
        <p>{{ profile.jabatan }} · @{{ profile.username }}</p>
        <small>{{ profile.email }}</small>
      </div>
    </section>

    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- PROFIL -->
    <section v-show="activeTab === 'profil'" class="card">
      <h3>Data Profil</h3>
      <p class="hint">Data ini tampil di sidebar dan header dashboard admin.</p>

      <div class="grid-2">
        <label>
          Nama lengkap
          <input v-model="profile.nama" type="text" />
        </label>
        <label>
          Username
          <input v-model="profile.username" type="text" />
        </label>
        <label>
          Email
          <input v-model="profile.email" type="email" />
        </label>
        <label>
          Telepon
          <input v-model="profile.telepon" type="text" placeholder="08xxxxxxxxxx" />
        </label>
        <label>
          Jabatan
          <input v-model="profile.jabatan" type="text" />
        </label>
        <label>
          NIP / NIK
          <input v-model="profile.nip" type="text" />
        </label>
        <label class="full">
          Bio singkat
          <textarea v-model="profile.bio" rows="3" placeholder="Contoh: Pustakawan SMK Negeri 1 Kertosono" />
        </label>
      </div>
    </section>

    <!-- KEAMANAN -->
    <section v-show="activeTab === 'keamanan'" class="card">
      <h3>Ubah Password</h3>
      <p class="hint">Gunakan password baru minimal 8 karakter. Jangan bagikan ke siswa atau guru.</p>

      <div class="grid-2">
        <label>
          Password saat ini
          <input
            v-model="security.passwordLama"
            :type="security.tampilkanPassword ? 'text' : 'password'"
          />
        </label>
        <label>
          Tampilkan password
          <div class="toggle-box">
            <input v-model="security.tampilkanPassword" type="checkbox" />
            <span>{{ security.tampilkanPassword ? 'Terlihat' : 'Tersembunyi' }}</span>
          </div>
        </label>
        <label>
          Password baru
          <input
            v-model="security.passwordBaru"
            :type="security.tampilkanPassword ? 'text' : 'password'"
          />
        </label>
        <label>
          Konfirmasi password baru
          <input
            v-model="security.konfirmasiPassword"
            :type="security.tampilkanPassword ? 'text' : 'password'"
          />
        </label>
      </div>

      <div class="actions">
        <button class="btn primary" type="button" @click="changePassword">
          Perbarui Password
        </button>
      </div>
    </section>

    <!-- SESI -->
    <section v-show="activeTab === 'sesi'" class="card">
      <h3>Sesi & Aktivitas</h3>
      <p class="hint">Informasi login terakhir di perangkat ini.</p>

      <div class="info-list">
        <div>
          <span>Login terakhir</span>
          <strong>{{ session.lastLogin }}</strong>
        </div>
        <div>
          <span>Perangkat</span>
          <strong>{{ session.device }}</strong>
        </div>
        <div>
          <span>Role</span>
          <strong>Admin / Pustakawan</strong>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <label class="switch-row">
          Kirim notifikasi ke email
          <input v-model="session.notifikasiEmail" type="checkbox" />
        </label>
        <label class="switch-row">
          Tetap masuk di perangkat ini
          <input v-model="session.simpanSesi" type="checkbox" />
        </label>
      </div>

      <div class="actions">
        <button class="btn ghost" type="button" @click="saveSessionPref">Simpan preferensi</button>
        <button class="btn danger" type="button" @click="mintaLogout">Keluar dari akun</button>
      </div>
    </section>

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

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.akun-page {
  padding: 24px 28px 48px;
  color: #0f172a;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.page-head h1 {
  margin: 0;
  font-size: 24px;
}

.page-head p,
.hero p,
.hero small,
.saved-info {
  color: #64748b;
}

.page-head p {
  margin: 6px 0 0;
}

.head-actions,
.tabs,
.actions,
.hero {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.saved-info {
  font-size: 12px;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px 22px 24px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.hero {
  margin-bottom: 16px;
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
}

.hero h2 {
  margin: 0;
}

.card h3 {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.3;
}

.hint {
  margin: 0 0 20px;
  color: #64748b;
  line-height: 1.6;
}

.grid-2,
.info-list {
  margin-top: 4px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.tabs {
  margin: 0 0 16px;
}

.tab {
  border: 0;
  background: #eef2ff;
  color: #1e3a8a;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
}

.tab.active {
  background: #2563eb;
  color: #fff;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

label.full {
  grid-column: 1 / -1;
}

input, textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-weight: 500;
  color: #0f172a;
}

.toggle-box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  font-weight: 500;
  color: #0f172a;
}

input,
textarea,
.toggle-box {
  min-height: 42px;
}

.switch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
}

.info-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.info-list div {
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px 14px;
}

.info-list span {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.actions {
  margin-top: 18px;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: #e2e8f0; color: #0f172a; }
.btn.danger { background: #fee2e2; color: #b91c1c; }
.btn { transition: background-color 0.15s ease, color 0.15s ease; }

.head-actions .btn.ghost:hover {
  background: #cbd5e1;
}

.btn.danger:hover {
  background: #fecaca;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #0f172a;
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
}

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

@media (max-width: 900px) {
  .page-head, .grid-2, .info-list {
    display: block;
  }
  label { margin-bottom: 12px; }
}
</style>