<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue'
import { authHeaders } from '@/utils/auth'
import { useInfoPerpustakaan } from '@/composables/useInfoPerpustakaan'

const { setInfo } = useInfoPerpustakaan()

const STORAGE_KEY = 'perpus_pengaturan'

const tabs = [
  { id: 'perpustakaan', label: 'Informasi Perpustakaan', icon: 'building' },
  { id: 'peminjaman', label: 'Aturan Peminjaman', icon: 'calendar' },
  { id: 'denda', label: 'Pengaturan Denda', icon: 'coins' },
  { id: 'notifikasi', label: 'Notifikasi', icon: 'bell' },
  { id: 'sistem', label: 'Sistem', icon: 'settings' }
]

const activeTab = ref('perpustakaan')
const tabsEl = ref(null)
const savedAt = ref('')
const toast = ref('')

function pilihTab(id) {
  activeTab.value = id
  nextTick(() => {
    const scroller = tabsEl.value
    const tabBtn = scroller?.querySelector('.tab.active')
    if (!scroller || !tabBtn) return
    const scrollerRect = scroller.getBoundingClientRect()
    const tabRect = tabBtn.getBoundingClientRect()
    const delta = tabRect.left - scrollerRect.left - scroller.clientWidth / 2 + tabRect.width / 2
    scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior: 'smooth' })
  })
}

const form = reactive({
  perpustakaan: {
    namaPerpustakaan: 'Perpustakaan SMK Negeri 1 Kertosono',
    namaSekolah: 'SMK Negeri 1 Kertosono',
    alamat: '',
    telepon: '',
    email: '',
    kepalaPerpustakaan: 'Admin Perpustakaan',
    tahunAjaran: '2025/2026',
    deskripsi: ''
  },
  peminjaman: {
    durasiSiswa: 7,
    durasiGuru: 14,
    maxBukuSiswa: 2,
    maxBukuGuru: 5,
    bolehPerpanjang: true,
    maxPerpanjang: 1,
    durasiPerpanjang: 7,
    minStokPinjam: 1
  },
  denda: {
    aktif: true,
    nominalPerHariSiswa: 1000,
    nominalPerHariGuru: 1000,
    dendaMaksimalSiswa: 50000,
    dendaMaksimalGuru: 50000,
    masaTenggang: 0,
    dendaGuruAktif: false
  },
  notifikasi: {
    pengingatJatuhTempo: true,
    hariSebelumJatuhTempo: 1,
    notifikasiTerlambat: true,
    notifikasiJatuhTempoHariIni: true
  }
})

function showToast(text) {
  toast.value = text
  setTimeout(() => {
    toast.value = ''
  }, 2200)
}

async function loadSettings() {
  try {
    const res = await fetch('http://localhost:3000/api/pengaturan')
    if (!res.ok) throw new Error('Gagal memuat')
    const data = await res.json()

    if (data.namaPerpustakaan) form.perpustakaan.namaPerpustakaan = data.namaPerpustakaan
    if (data.namaSekolah) form.perpustakaan.namaSekolah = data.namaSekolah
    if (data.alamat != null) form.perpustakaan.alamat = data.alamat

    if (data.detail?.perpustakaan) Object.assign(form.perpustakaan, data.detail.perpustakaan)
    if (data.detail?.peminjaman) Object.assign(form.peminjaman, data.detail.peminjaman)
    if (data.detail?.denda) Object.assign(form.denda, data.detail.denda)
    if (data.detail?.notifikasi) Object.assign(form.notifikasi, data.detail.notifikasi)

    savedAt.value = data.updatedAt
      ? new Date(data.updatedAt).toLocaleString('id-ID')
      : ''
  } catch (e) {
    console.warn(e)
    showToast('Gagal memuat pengaturan dari server')
  }
}

async function saveSettings() {
  try {
    const res = await fetch('http://localhost:3000/api/pengaturan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        namaSekolah: form.perpustakaan.namaSekolah,
        namaPerpustakaan: form.perpustakaan.namaPerpustakaan,
        alamat: form.perpustakaan.alamat,
        detail: {
          perpustakaan: { ...form.perpustakaan },
          peminjaman: { ...form.peminjaman },
          denda: { ...form.denda },
          notifikasi: { ...form.notifikasi }
        }
      })
    })
    const data = await res.json()
    if (!res.ok) {
      showToast(data.error || 'Gagal menyimpan pengaturan')
      return
    }

    savedAt.value = new Date(data.updatedAt || Date.now()).toLocaleString('id-ID')
    showToast('Pengaturan berhasil disimpan')

    // Update state global supaya semua halaman (laporan, header, dll)
    // langsung lihat perubahan tanpa refresh.
    setInfo({
      namaPerpustakaan: form.perpustakaan.namaPerpustakaan,
      namaSekolah: form.perpustakaan.namaSekolah,
      alamat: form.perpustakaan.alamat,
      telepon: form.perpustakaan.telepon,
      email: form.perpustakaan.email,
      kepalaPerpustakaan: form.perpustakaan.kepalaPerpustakaan,
      tahunAjaran: form.perpustakaan.tahunAjaran,
      deskripsi: form.perpustakaan.deskripsi,
    })
  } catch (e) {
    console.error(e)
    showToast('Gagal terhubung ke server')
  }
}

async function resetSection() {
  if (!confirm('Yakin ingin mengembalikan SEMUA pengaturan (informasi perpustakaan, aturan peminjaman, denda, dan notifikasi) ke nilai default? Perubahan ini langsung tersimpan ke server.')) {
    return
  }

  form.perpustakaan = {
    namaPerpustakaan: 'Perpustakaan SMK Negeri 1 Kertosono',
    namaSekolah: 'SMK Negeri 1 Kertosono',
    alamat: '',
    telepon: '',
    email: '',
    kepalaPerpustakaan: 'Admin Perpustakaan',
    tahunAjaran: '2025/2026',
    deskripsi: ''
  }
  form.peminjaman = {
    durasiSiswa: 7,
    durasiGuru: 14,
    maxBukuSiswa: 2,
    maxBukuGuru: 5,
    bolehPerpanjang: true,
    maxPerpanjang: 1,
    durasiPerpanjang: 7,
    minStokPinjam: 1
  }
  form.denda = {
    aktif: true,
    nominalPerHariSiswa: 1000,
    nominalPerHariGuru: 1000,
    dendaMaksimalSiswa: 50000,
    dendaMaksimalGuru: 50000,
    masaTenggang: 0,
    dendaGuruAktif: false
  }
  form.notifikasi = {
    pengingatJatuhTempo: true,
    hariSebelumJatuhTempo: 1,
    notifikasiTerlambat: true,
    notifikasiJatuhTempoHariIni: true
  }
  await saveSettings()
}

function exportSettings() {
  const raw = JSON.stringify({
    perpustakaan: { ...form.perpustakaan },
    peminjaman: { ...form.peminjaman },
    denda: { ...form.denda },
    notifikasi: { ...form.notifikasi }
  }, null, 2)
  const blob = new Blob([raw], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pengaturan-perpustakaan.json'
  a.click()
  URL.revokeObjectURL(url)
  showToast('File pengaturan diunduh')
}

onMounted(loadSettings)
</script>

<template>
  <div class="pengaturan-page">
    <!-- Header -->
    <header class="page-head">
      <div class="head-left">
        <div class="head-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
        <div>
          <h1>Pengaturan</h1>
          <p>Atur identitas perpustakaan, aturan pinjam, denda, dan notifikasi sistem.</p>
          <span v-if="savedAt" class="saved-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Terakhir disimpan: {{ savedAt }}
          </span>
        </div>
      </div>
      <div class="head-actions">
        <button class="btn primary" type="button" @click="saveSettings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Simpan Perubahan
        </button>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="tabs" ref="tabsEl">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="pilihTab(tab.id)"
      >
        <span class="tab-icon">
          <!-- Icon: building -->
          <svg v-if="tab.icon === 'building'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"></path>
            <path d="M5 21V7l8-4v18"></path>
            <path d="M19 21V11l-6-4"></path>
            <path d="M9 9v.01"></path>
            <path d="M9 12v.01"></path>
            <path d="M9 15v.01"></path>
            <path d="M9 18v.01"></path>
          </svg>
          <!-- Icon: calendar -->
          <svg v-else-if="tab.icon === 'calendar'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <!-- Icon: coins -->
          <svg v-else-if="tab.icon === 'coins'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6"></circle>
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
            <path d="M7 6h1v4"></path>
            <path d="m16.71 13.88.7.71-2.82 2.82"></path>
          </svg>
          <!-- Icon: bell -->
          <svg v-else-if="tab.icon === 'bell'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <!-- Icon: settings -->
          <svg v-else-if="tab.icon === 'settings'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </span>
        {{ tab.label }}
      </button>
    </nav>

    <!-- Konten Utama -->
    <div class="content-area">
      <!-- INFORMASI PERPUSTAKAAN -->
      <section v-show="activeTab === 'perpustakaan'" class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
            </svg>
          </div>
          <div>
            <h2>Informasi Perpustakaan</h2>
            <p class="hint">Data ini bisa dipakai di laporan, struk peminjaman, dan header aplikasi.</p>
          </div>
        </div>

        <div class="grid-2">
          <label>
            Nama Perpustakaan
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"></path>
                  <path d="M5 21V7l8-4v18"></path>
                  <path d="M19 21V11l-6-4"></path>
                </svg>
              </span>
              <input v-model="form.perpustakaan.namaPerpustakaan" type="text" />
            </div>
          </label>
          <label>
            Nama Sekolah
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"></path>
                  <path d="M5 21V7l8-4v18"></path>
                  <path d="M19 21V11l-6-4"></path>
                </svg>
              </span>
              <input v-model="form.perpustakaan.namaSekolah" type="text" />
            </div>
          </label>
          <label>
            Kepala / Pustakawan
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <input v-model="form.perpustakaan.kepalaPerpustakaan" type="text" />
            </div>
          </label>
          <label>
            Tahun Ajaran
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <input v-model="form.perpustakaan.tahunAjaran" type="text" />
            </div>
          </label>
          <label>
            Telepon
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
              <input v-model="form.perpustakaan.telepon" type="text" placeholder="Contoh: 0351-xxxxxxx" />
            </div>
          </label>
          <label>
            Email
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input v-model="form.perpustakaan.email" type="email" placeholder="perpustakaan@sekolah.sch.id" />
            </div>
          </label>
          <label class="full">
            Alamat
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </span>
              <input v-model="form.perpustakaan.alamat" type="text" placeholder = 'Jl. xxxx No. xx'/>
            </div>
          </label>
          <label class="full">
            Deskripsi singkat
            <div class="input-wrapper textarea-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <textarea v-model="form.perpustakaan.deskripsi" rows="3" placeholder="Contoh: Pustakawan SMK Negeri 1 Kertosono"></textarea>
            </div>
          </label>
        </div>
      </section>

      <!-- ATURAN PEMINJAMAN -->
      <section v-show="activeTab === 'peminjaman'" class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <h2>Aturan Peminjaman</h2>
            <p class="hint">Berlaku saat siswa atau guru meminjam buku lewat menu peminjaman.</p>
          </div>
        </div>

        <div class="grid-2">
          <label>
            Durasi pinjam siswa (hari)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <input v-model.number="form.peminjaman.durasiSiswa" type="number" min="1" />
            </div>
          </label>
          <label>
            Durasi pinjam guru (hari)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <input v-model.number="form.peminjaman.durasiGuru" type="number" min="1" />
            </div>
          </label>
          <label>
            Maksimal buku siswa
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </span>
              <input v-model.number="form.peminjaman.maxBukuSiswa" type="number" min="1" />
            </div>
          </label>
          <label>
            Maksimal buku guru
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </span>
              <input v-model.number="form.peminjaman.maxBukuGuru" type="number" min="1" />
            </div>
          </label>
                    <label :class="{ 'field-disabled': !form.peminjaman.bolehPerpanjang }">
            Maksimal perpanjangan
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </span>
              <input
                v-model.number="form.peminjaman.maxPerpanjang"
                type="number"
                min="0"
                :disabled="!form.peminjaman.bolehPerpanjang"
              />
            </div>
          </label>
          <label :class="{ 'field-disabled': !form.peminjaman.bolehPerpanjang }">
            Durasi perpanjangan (hari)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </span>
              <input
                v-model.number="form.peminjaman.durasiPerpanjang"
                type="number"
                min="1"
                :disabled="!form.peminjaman.bolehPerpanjang"
              />
            </div>
          </label>
          <label>
            Stok minimum agar bisa dipinjam
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
              <input v-model.number="form.peminjaman.minStokPinjam" type="number" min="0" />
            </div>
          </label>
          <label class="switch-row">
            <span>Izinkan perpanjangan</span>
            <div class="toggle-switch">
              <input v-model="form.peminjaman.bolehPerpanjang" type="checkbox" id="perpanjang-toggle" />
              <label for="perpanjang-toggle" class="toggle-label"></label>
            </div>
          </label>
        </div>
      </section>

      <!-- DENDA -->
      <section v-show="activeTab === 'denda'" class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="8" r="6"></circle>
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
              <path d="M7 6h1v4"></path>
              <path d="m16.71 13.88.7.71-2.82 2.82"></path>
            </svg>
          </div>
          <div>
            <h2>Pengaturan Denda</h2>
            <p class="hint">Dihitung otomatis jika buku dikembalikan melewati tanggal jatuh tempo.</p>
          </div>
        </div>

        <div class="grid-2">
          <label class="switch-row">
            <span>Aktifkan denda keterlambatan</span>
            <div class="toggle-switch">
              <input v-model="form.denda.aktif" type="checkbox" id="denda-aktif-toggle" />
              <label for="denda-aktif-toggle" class="toggle-label"></label>
            </div>
          </label>
          <label class="switch-row">
            <span>Terapkan denda untuk guru</span>
            <div class="toggle-switch">
              <input
                v-model="form.denda.dendaGuruAktif"
                type="checkbox"
                id="denda-guru-toggle"
                :disabled="!form.denda.aktif"
              />
              <label for="denda-guru-toggle" class="toggle-label" :class="{ disabled: !form.denda.aktif }"></label>
            </div>
          </label>
          <label :class="{ 'field-disabled': !form.denda.aktif }">
            Nominal denda per hari - Siswa (Rp)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6"></circle>
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                  <path d="M7 6h1v4"></path>
                  <path d="m16.71 13.88.7.71-2.82 2.82"></path>
                </svg>
              </span>
              <input
                v-model.number="form.denda.nominalPerHariSiswa"
                type="number" min="0" step="500"
                :disabled="!form.denda.aktif"
              />
            </div>
          </label>
          <label :class="{ 'field-disabled': !form.denda.aktif || !form.denda.dendaGuruAktif }">
            Nominal denda per hari - Guru (Rp)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6"></circle>
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                  <path d="M7 6h1v4"></path>
                  <path d="m16.71 13.88.7.71-2.82 2.82"></path>
                </svg>
              </span>
              <input
                v-model.number="form.denda.nominalPerHariGuru"
                type="number" min="0" step="500"
                :disabled="!form.denda.aktif || !form.denda.dendaGuruAktif"
              />
            </div>
          </label>
          <label :class="{ 'field-disabled': !form.denda.aktif }">
            Denda maksimal - Siswa (Rp)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6"></circle>
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                  <path d="M7 6h1v4"></path>
                  <path d="m16.71 13.88.7.71-2.82 2.82"></path>
                </svg>
              </span>
              <input
                v-model.number="form.denda.dendaMaksimalSiswa"
                type="number" min="0" step="1000"
                :disabled="!form.denda.aktif"
              />
            </div>
          </label>
          <label :class="{ 'field-disabled': !form.denda.aktif || !form.denda.dendaGuruAktif }">
            Denda maksimal - Guru (Rp)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6"></circle>
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                  <path d="M7 6h1v4"></path>
                  <path d="m16.71 13.88.7.71-2.82 2.82"></path>
                </svg>
              </span>
              <input
                v-model.number="form.denda.dendaMaksimalGuru"
                type="number" min="0" step="1000"
                :disabled="!form.denda.aktif || !form.denda.dendaGuruAktif"
              />
            </div>
          </label>
          <label :class="{ 'field-disabled': !form.denda.aktif }">
            Masa tenggang (hari)
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <input
                v-model.number="form.denda.masaTenggang"
                type="number" min="0"
                :disabled="!form.denda.aktif"
              />
            </div>
          </label>
        </div>

        <div class="preview" v-if="form.denda.aktif">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>
            Contoh siswa: terlambat 3 hari × Rp {{ form.denda.nominalPerHariSiswa.toLocaleString('id-ID') }}
            = <strong>Rp {{ (form.denda.nominalPerHariSiswa * 3).toLocaleString('id-ID') }}</strong>
            (maks. Rp {{ form.denda.dendaMaksimalSiswa.toLocaleString('id-ID') }})
            <template v-if="form.denda.dendaGuruAktif">
              <br />
              Contoh guru: terlambat 3 hari × Rp {{ form.denda.nominalPerHariGuru.toLocaleString('id-ID') }}
              = <strong>Rp {{ (form.denda.nominalPerHariGuru * 3).toLocaleString('id-ID') }}</strong>
              (maks. Rp {{ form.denda.dendaMaksimalGuru.toLocaleString('id-ID') }})
            </template>
          </span>
        </div>
        <div class="preview" v-else>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle; flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Denda keterlambatan sedang <strong>dinonaktifkan</strong> — semua peminjaman tidak akan dikenai denda, berapa pun hari telatnya.</span>
        </div>
      </section>

      <!-- NOTIFIKASI -->
      <section v-show="activeTab === 'notifikasi'" class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div>
            <h2>Notifikasi</h2>
            <p class="hint">Pengingat yang tampil di dashboard admin / pustakawan.</p>
          </div>
        </div>

        <div class="grid-2">
          <label class="switch-row">
            <span>Pengingat sebelum jatuh tempo</span>
            <div class="toggle-switch">
              <input v-model="form.notifikasi.pengingatJatuhTempo" type="checkbox" id="notif-reminder-toggle" />
              <label for="notif-reminder-toggle" class="toggle-label"></label>
            </div>
          </label>
          <label>
            Hari sebelum jatuh tempo
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <input v-model.number="form.notifikasi.hariSebelumJatuhTempo" type="number" min="1" />
            </div>
          </label>
          <label class="switch-row">
            <span>Notifikasi buku terlambat</span>
            <div class="toggle-switch">
              <input v-model="form.notifikasi.notifikasiTerlambat" type="checkbox" id="notif-late-toggle" />
              <label for="notif-late-toggle" class="toggle-label"></label>
            </div>
          </label>
          <label class="switch-row">
            <span>Notifikasi jatuh tempo hari ini</span>
            <div class="toggle-switch">
              <input v-model="form.notifikasi.notifikasiJatuhTempoHariIni" type="checkbox" id="notif-today-toggle" />
              <label for="notif-today-toggle" class="toggle-label"></label>
            </div>
          </label>
        </div>
      </section>

      <!-- SISTEM -->
      <section v-show="activeTab === 'sistem'" class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div>
            <h2>Sistem</h2>
            <p class="hint">Cadangkan atau kembalikan pengaturan ke nilai awal.</p>
          </div>
        </div>

        <div class="system-actions">
          <button class="btn ghost" type="button" @click="exportSettings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Unduh cadangan pengaturan
          </button>
          <button class="btn danger" type="button" @click="resetSection">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Kembalikan ke default
          </button>
        </div>

        <ul class="notes">
          <li>Unduh cadangan sebelum melakukan perubahan besar, agar pengaturan bisa dipulihkan bila diperlukan.</li>
          <li>"Kembalikan ke default" akan mengganti semua pengaturan di semua tab — pastikan Anda yakin sebelum menekan tombol ini.</li>
          <li>Pengaturan profil dan kata sandi Anda ada di menu Akun Admin, terpisah dari halaman ini.</li>
        </ul>
      </section>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
/* Reset & Base */
* {
  box-sizing: border-box;
}

.pengaturan-page {
  padding: 24px 28px 48px;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header */
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.head-left {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.head-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-head h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.page-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.head-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.saved-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 6px 0 0;
  font-size: 12px;
  color: #64748b;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  scroll-behavior: smooth;
}

.tab {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.tab:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.tab.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Card */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px 28px 28px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
}

.card-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.hint {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

/* Grid Layout */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

label.full {
  grid-column: 1 / -1;
}

/* Input Wrapper */
.input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.input-wrapper:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-icon {
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  flex-shrink: 0;
}

.input-wrapper input,
.input-wrapper textarea {
  border: none;
  outline: none;
  padding: 12px 12px 12px 0;
  font: inherit;
  font-weight: 500;
  color: #0f172a;
  background: transparent;
  width: 100%;
}

.input-wrapper textarea {
  resize: vertical;
  min-height: 80px;
}

.input-wrapper input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.textarea-wrapper {
  align-items: flex-start;
}

.textarea-wrapper .input-icon {
  padding-top: 12px;
}

/* Switch Row */
.switch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: .3s;
  border-radius: 24px;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.toggle-switch input:checked + .toggle-label {
  background-color: #2563eb;
}

.toggle-switch input:checked + .toggle-label:before {
  transform: translateX(20px);
}

.toggle-switch input:disabled + .toggle-label {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Field Disabled */
.field-disabled {
  opacity: 0.55;
}

.field-disabled .input-wrapper {
  background: #f1f5f9;
}

/* Preview */
.preview {
  margin-top: 20px;
  background: #eff6ff;
  color: #1e40af;
  padding: 14px 18px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.6;
}

.preview strong {
  font-weight: 700;
}

/* System Actions */
.system-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

/* Notes */
.notes {
  color: #64748b;
  padding-left: 20px;
  line-height: 1.8;
  font-size: 14px;
  margin: 0;
}

.notes li {
  margin-bottom: 4px;
}

/* Buttons */
.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
}

.btn.primary:hover {
  background: #1d4ed8;
}

.btn.ghost {
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #e2e8f0;
}

.btn.ghost:hover {
  background: #e2e8f0;
}

.btn.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.btn.danger:hover {
  background: #fecaca;
}

/* Toast */
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #0f172a;
  color: #fff;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 900px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }

  .page-head {
    flex-direction: column;
  }

  .head-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .pengaturan-page {
    padding: 16px 14px 40px;
  }

  .page-head h1 {
    font-size: 20px;
  }

  .page-head p {
    font-size: 13px;
  }

  .head-left {
    gap: 12px;
  }

  .head-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .head-icon svg {
    width: 22px;
    height: 22px;
  }

  .head-actions {
    flex-direction: column;
    width: 100%;
  }

  .head-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .saved-info {
    width: auto;
    margin: 6px 0 0;
    font-size: 11px;
  }

  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 4px;
    gap: 6px;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 12px;
    padding: 8px 14px;
  }

  .tab-icon svg {
    width: 14px;
    height: 14px;
  }

  .card {
    padding: 18px 16px 20px;
    border-radius: 16px;
  }

  .card-header {
    gap: 12px;
    margin-bottom: 18px;
  }

  .card-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
  }

  .card-icon svg {
    width: 20px;
    height: 20px;
  }

  .card-header h2 {
    font-size: 16px;
  }

  .hint {
    font-size: 12px;
  }

  .grid-2 {
    gap: 14px;
  }

  label {
    font-size: 12px;
  }

  .input-wrapper input,
  .input-wrapper textarea {
    padding: 10px 10px 10px 0;
    font-size: 14px;
  }

  .input-icon {
    padding: 0 10px;
  }

  .input-icon svg {
    width: 14px;
    height: 14px;
  }

  .switch-row {
    padding: 12px 14px;
    font-size: 13px;
  }

  .toggle-switch {
    width: 40px;
    height: 22px;
  }

  .toggle-label:before {
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
  }

  .toggle-switch input:checked + .toggle-label:before {
    transform: translateX(18px);
  }

  .preview {
    font-size: 12px;
    padding: 12px 14px;
    margin-top: 16px;
  }

  .system-actions {
    flex-direction: column;
  }

  .system-actions .btn {
    width: 100%;
  }

  .notes {
    font-size: 12px;
    padding-left: 16px;
  }

  .toast {
    right: 14px;
    left: 14px;
    bottom: 14px;
    text-align: center;
    font-size: 13px;
  }
}
</style>