<script setup>
import { reactive, ref, onMounted } from 'vue'
import { authHeaders } from '@/utils/auth'

const STORAGE_KEY = 'perpus_pengaturan'

const tabs = [
  { id: 'perpustakaan', label: 'Informasi Perpustakaan' },
  { id: 'peminjaman', label: 'Aturan Peminjaman' },
  { id: 'denda', label: 'Pengaturan Denda' },
  { id: 'notifikasi', label: 'Notifikasi' },
  { id: 'sistem', label: 'Sistem' }
]

const activeTab = ref('perpustakaan')
const savedAt = ref('')
const toast = ref('')

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
    nominalPerHari: 1000,
    dendaMaksimal: 50000,
    masaTenggang: 0,
    dendaGuruAktif: false
  },
  notifikasi: {
    pengingatJatuhTempo: true,
    hariSebelumJatuhTempo: 1,
    notifikasiTerlambat: true,
    notifikasiDenda: true,
    tampilkanBannerDashboard: true
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
  } catch (e) {
    console.error(e)
    showToast('Gagal terhubung ke server')
  }
}

async function resetSection() {
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
    nominalPerHari: 1000,
    dendaMaksimal: 50000,
    masaTenggang: 0,
    dendaGuruAktif: false
  }
  form.notifikasi = {
    pengingatJatuhTempo: true,
    hariSebelumJatuhTempo: 1,
    notifikasiTerlambat: true,
    notifikasiDenda: true,
    tampilkanBannerDashboard: true
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
    <header class="page-head">
      <div>
        <h1>Pengaturan</h1>
        <p>Atur identitas perpustakaan, aturan pinjam, denda, dan notifikasi sistem.</p>
      </div>
      <div class="head-actions">
        <span v-if="savedAt" class="saved-info">Terakhir disimpan: {{ savedAt }}</span>
        <button class="btn ghost" type="button" @click="exportSettings">Unduh JSON</button>
        <button class="btn primary" type="button" @click="saveSettings">Simpan Perubahan</button>
      </div>
    </header>

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

    <!-- INFORMASI PERPUSTAKAAN -->
    <section v-show="activeTab === 'perpustakaan'" class="card">
      <h2>Informasi Perpustakaan</h2>
      <p class="hint">Data ini bisa dipakai di laporan, struk peminjaman, dan header aplikasi.</p>

      <div class="grid-2">
        <label>
          Nama Perpustakaan
          <input v-model="form.perpustakaan.namaPerpustakaan" type="text" />
        </label>
        <label>
          Nama Sekolah
          <input v-model="form.perpustakaan.namaSekolah" type="text" />
        </label>
        <label>
          Kepala / Pustakawan
          <input v-model="form.perpustakaan.kepalaPerpustakaan" type="text" />
        </label>
        <label>
          Tahun Ajaran
          <input v-model="form.perpustakaan.tahunAjaran" type="text" />
        </label>
        <label>
          Telepon
          <input v-model="form.perpustakaan.telepon" type="text" placeholder="Contoh: 0351-xxxxxx" />
        </label>
        <label>
          Email
          <input v-model="form.perpustakaan.email" type="email" placeholder="perpustakaan@sekolah.sch.id" />
        </label>
        <label class="full">
          Alamat
          <input v-model="form.perpustakaan.alamat" type="text" />
        </label>
        <label class="full">
          Deskripsi singkat
          <textarea v-model="form.perpustakaan.deskripsi" rows="3" placeholder="Visi singkat perpustakaan sekolah..." />
        </label>
      </div>
    </section>

    <!-- ATURAN PEMINJAMAN -->
    <section v-show="activeTab === 'peminjaman'" class="card">
      <h2>Aturan Peminjaman</h2>
      <p class="hint">Berlaku saat siswa atau guru meminjam buku lewat menu peminjaman.</p>

      <div class="grid-2">
        <label>
          Durasi pinjam siswa (hari)
          <input v-model.number="form.peminjaman.durasiSiswa" type="number" min="1" />
        </label>
        <label>
          Durasi pinjam guru (hari)
          <input v-model.number="form.peminjaman.durasiGuru" type="number" min="1" />
        </label>
        <label>
          Maksimal buku siswa
          <input v-model.number="form.peminjaman.maxBukuSiswa" type="number" min="1" />
        </label>
        <label>
          Maksimal buku guru
          <input v-model.number="form.peminjaman.maxBukuGuru" type="number" min="1" />
        </label>
        <label>
          Maksimal perpanjangan
          <input v-model.number="form.peminjaman.maxPerpanjang" type="number" min="0" />
        </label>
        <label>
          Durasi perpanjangan (hari)
          <input v-model.number="form.peminjaman.durasiPerpanjang" type="number" min="1" />
        </label>
        <label>
          Stok minimum agar bisa dipinjam
          <input v-model.number="form.peminjaman.minStokPinjam" type="number" min="0" />
        </label>
        <label class="switch-row">
          Izinkan perpanjangan
          <input v-model="form.peminjaman.bolehPerpanjang" type="checkbox" />
        </label>
      </div>
    </section>

    <!-- DENDA -->
    <section v-show="activeTab === 'denda'" class="card">
      <h2>Pengaturan Denda</h2>
      <p class="hint">Dihitung otomatis jika buku dikembalikan melewati tanggal jatuh tempo.</p>

      <div class="grid-2">
        <label class="switch-row">
          Aktifkan denda keterlambatan
          <input v-model="form.denda.aktif" type="checkbox" />
        </label>
        <label class="switch-row">
          Terapkan denda untuk guru
          <input v-model="form.denda.dendaGuruAktif" type="checkbox" />
        </label>
        <label>
          Nominal denda per hari (Rp)
          <input v-model.number="form.denda.nominalPerHari" type="number" min="0" step="500" />
        </label>
        <label>
          Denda maksimal (Rp)
          <input v-model.number="form.denda.dendaMaksimal" type="number" min="0" step="1000" />
        </label>
        <label>
          Masa tenggang (hari)
          <input v-model.number="form.denda.masaTenggang" type="number" min="0" />
        </label>
      </div>

      <div class="preview">
        Contoh: terlambat 3 hari × Rp {{ form.denda.nominalPerHari.toLocaleString('id-ID') }}
        = <strong>Rp {{ (form.denda.nominalPerHari * 3).toLocaleString('id-ID') }}</strong>
        (maks. Rp {{ form.denda.dendaMaksimal.toLocaleString('id-ID') }})
      </div>
    </section>

    <!-- NOTIFIKASI -->
    <section v-show="activeTab === 'notifikasi'" class="card">
      <h2>Notifikasi</h2>
      <p class="hint">Pengingat yang tampil di dashboard admin / pustakawan.</p>

      <div class="grid-2">
        <label class="switch-row">
          Pengingat sebelum jatuh tempo
          <input v-model="form.notifikasi.pengingatJatuhTempo" type="checkbox" />
        </label>
        <label>
          Hari sebelum jatuh tempo
          <input v-model.number="form.notifikasi.hariSebelumJatuhTempo" type="number" min="1" />
        </label>
        <label class="switch-row">
          Notifikasi buku terlambat
          <input v-model="form.notifikasi.notifikasiTerlambat" type="checkbox" />
        </label>
        <label class="switch-row">
          Notifikasi denda belum dibayar
          <input v-model="form.notifikasi.notifikasiDenda" type="checkbox" />
        </label>
        <label class="switch-row full">
          Tampilkan banner pengingat di dashboard
          <input v-model="form.notifikasi.tampilkanBannerDashboard" type="checkbox" />
        </label>
      </div>
    </section>

    <!-- SISTEM -->
    <section v-show="activeTab === 'sistem'" class="card">
      <h2>Sistem</h2>
      <p class="hint">Cadangkan atau kembalikan pengaturan ke nilai awal.</p>

      <div class="system-actions">
        <button class="btn ghost" type="button" @click="exportSettings">Unduh cadangan pengaturan</button>
        <button class="btn danger" type="button" @click="resetSection">Kembalikan ke default</button>
      </div>

      <ul class="notes">
        <li>Pengaturan tersimpan di database server, jadi tetap ada setelah halaman di-refresh.</li>
        <li>Nanti bisa dipindah ke API Laravel/Express tanpa mengubah tampilan form.</li>
        <li>Menu <em>Akun Admin</em> tetap terpisah untuk profil &amp; password.</li>
      </ul>
    </section>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.pengaturan-page {
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

.page-head p {
  margin: 6px 0 0;
  color: #64748b;
}

.head-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.saved-info {
  font-size: 12px;
  color: #64748b;
  margin-right: 6px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
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

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px 22px 24px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.card h2 {
  margin: 0;
  font-size: 18px;
}

.hint {
  margin: 6px 0 18px;
  color: #64748b;
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
  background: #fff;
}

input:focus, textarea:focus {
  outline: 2px solid #93c5fd;
  border-color: #2563eb;
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

.preview {
  margin-top: 16px;
  background: #eff6ff;
  color: #1e40af;
  padding: 12px 14px;
  border-radius: 12px;
}

.system-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.notes {
  color: #64748b;
  padding-left: 18px;
  line-height: 1.7;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
}

.btn.ghost {
  background: #e2e8f0;
  color: #0f172a;
}

.btn.danger {
  background: #fee2e2;
  color: #b91c1c;
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

@media (max-width: 900px) {
  .page-head, .grid-2 {
    display: block;
  }
  label {
    margin-bottom: 12px;
  }
}
</style>