<template>
  <div class="content">

    <div class="page-header">
      <h1>Profil Saya</h1>
      <p>Lihat informasi akun dan data diri kamu.</p>
    </div>

    <div v-if="isLoading" class="empty-state">
      <p>Memuat profil...</p>
    </div>

    <div v-else-if="errorMessage" class="empty-state">
      <p>{{ errorMessage }}</p>
      <button class="btn-primary" @click="fetchProfil">
        Coba Lagi
      </button>
    </div>

    <div v-else-if="profil" class="profile-card">

      <div class="profile-header">

        <div class="avatar">
          {{ getInitial(profil.nama) }}
        </div>

        <div>
          <h2>{{ profil.nama }}</h2>
          <p>Siswa</p>
        </div>

      </div>

      <div class="profile-info">

        <div class="info-item">
          <span class="info-label">Nama Lengkap</span>
          <span class="info-value">{{ profil.nama || '—' }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">NIS</span>
          <span class="info-value">{{ profil.nis || '—' }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Kelas</span>
          <span class="info-value">{{ profil.kelas || '—' }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Tanggal Lahir</span>
          <span class="info-value">
            {{ formatTanggal(profil.tanggalLahir) }}
          </span>
        </div>

        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="status-badge">Siswa</span>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const profil = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

function authHeaders() {
  const token = localStorage.getItem('token')

  return {
    Authorization: `Bearer ${token}`
  }
}

async function fetchProfil() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(
      `${API_BASE}/dashboard-siswa/profil`,
      {
        headers: authHeaders()
      }
    )

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Gagal mengambil profil')
    }

    profil.value = await res.json()

  } catch (err) {
    console.error(err)
    errorMessage.value =
      'Gagal memuat profil. Coba periksa koneksi kamu.'
  } finally {
    isLoading.value = false
  }
}

function getInitial(nama) {
  if (!nama) return '?'

  return nama
    .trim()
    .charAt(0)
    .toUpperCase()
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

<style scoped>
.content {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
  color: #0f172a;
}

.page-header p {
  margin: 0;
  color: #64748b;
  max-width: 520px;
  line-height: 1.5;
}

.profile-card {
  background: white;
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
  background: #dcfce7;
  color: #15803d;
  font-size: 0.8rem;
  font-weight: 600;
}

.empty-state {
  background: white;
  border-radius: 14px;
  padding: 40px 20px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

@media (max-width: 700px) {
  .profile-info {
    grid-template-columns: 1fr;
  }
}
</style>