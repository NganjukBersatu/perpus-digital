<script setup>
import { ref, onMounted } from 'vue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const profil = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

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

    // fallback kalau endpoint profil guru belum ada
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

onMounted(fetchProfil)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Profil Saya</h1>
      <p class="muted">Lihat informasi akun dan data diri Anda.</p>
    </div>

    <div v-if="isLoading" class="empty-state">
      <p>Memuat profil...</p>
    </div>

    <div v-else-if="errorMessage" class="empty-state">
      <p>{{ errorMessage }}</p>
      <button class="btn-primary" @click="fetchProfil">Coba Lagi</button>
    </div>

    <div v-else-if="profil" class="profile-card">
      <div class="profile-header">
        <div class="avatar">
          {{ getInitial(profil.nama) }}
        </div>
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
  </div>
</template>

<style scoped>
.page {
  padding: 28px;
}

.page-header h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
  color: #0f172a;
}

.muted {
  margin: 0;
  color: #64748b;
  max-width: 520px;
  line-height: 1.5;
}

.profile-card {
  margin-top: 20px;
  background: #fff;
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  max-width: 800px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1e40af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 700;
}

.profile-header h2 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 1.3rem;
}

.profile-header p {
  margin: 0;
  color: #64748b;
}

.profile-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  padding-top: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 0.8rem;
  color: #64748b;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.status-badge {
  width: fit-content;
  padding: 5px 12px;
  border-radius: 20px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 0.8rem;
  font-weight: 600;
}

.empty-state {
  margin-top: 20px;
  background: #fff;
  border-radius: 14px;
  padding: 40px 20px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-primary {
  background: #4f46e5;
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 700px) {
  .profile-info {
    grid-template-columns: 1fr;
  }
}
</style>