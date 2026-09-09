<script setup>
import { ref, onMounted, computed } from 'vue'

const daftar = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')
const selectedMapel = ref('')

const showModal = ref(false)
const modalMode = ref('tambah')
const form = ref({ id: null, nama: '', nip: '', mapel: '' })
const isSaving = ref(false)

const mapelOptions = computed(() => {
  const semua = daftar.value.map((g) => g.mapel).filter(Boolean)
  return [...new Set(semua)].sort()
})

const filteredDaftar = computed(() => {
  if (!selectedMapel.value) return daftar.value
  return daftar.value.filter((g) => g.mapel === selectedMapel.value)
})

async function muatData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const url = new URL('http://localhost:3000/api/guru')
    if (searchQuery.value) url.searchParams.set('q', searchQuery.value)
    const res = await fetch(url)
    if (!res.ok) throw new Error('response not ok')
    daftar.value = await res.json()
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Gagal memuat data guru. Pastikan backend aktif.'
  } finally {
    isLoading.value = false
  }
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(muatData, 350)
}

function bukaModalTambah() {
  modalMode.value = 'tambah'
  form.value = { id: null, nama: '', nip: '', mapel: '' }
  showModal.value = true
}

function bukaModalEdit(item) {
  modalMode.value = 'edit'
  form.value = {
    id: item.id,
    nama: item.nama || '',
    nip: item.nip || '',
    mapel: item.mapel || '',
  }
  showModal.value = true
}

function tutupModal() {
  showModal.value = false
}

async function simpan() {
  if (!form.value.nama.trim()) {
    alert('Nama guru wajib diisi')
    return
  }

  isSaving.value = true
  try {
    const isEdit = modalMode.value === 'edit'
    const url = isEdit
      ? `http://localhost:3000/api/guru/${form.value.id}`
      : 'http://localhost:3000/api/guru'

    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: form.value.nama,
        nip: form.value.nip,
        mapel: form.value.mapel,
      }),
    })

    if (!res.ok) throw new Error('Gagal menyimpan')
    showModal.value = false
    await muatData()
  } catch (err) {
    console.error(err)
    alert('Gagal menyimpan data guru. Coba lagi.')
  } finally {
    isSaving.value = false
  }
}

async function hapus(item) {
  if (!confirm(`Hapus data guru "${item.nama}"?`)) return

  try {
    const res = await fetch(`http://localhost:3000/api/guru/${item.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Gagal menghapus')
    await muatData()
  } catch (err) {
    console.error(err)
    alert('Gagal menghapus guru. Mungkin masih terkait peminjaman.')
  }
}

onMounted(muatData)
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Data Guru</h1>
        <p class="subtitle">Kelola data guru yang dapat meminjam buku.</p>
      </div>
      <button class="btn-tambah" type="button" @click="bukaModalTambah">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Tambah Guru
      </button>
    </div>

    <div v-if="errorMessage" class="error-banner">⚠️ {{ errorMessage }}</div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
          </svg>
        </span>
        <input
          v-model="searchQuery"
          class="search"
          placeholder="Cari nama guru..."
          @input="onSearchInput"
        />
      </div>

      <select v-model="selectedMapel" class="select">
        <option value="">Semua Mata Pelajaran</option>
        <option v-for="m in mapelOptions" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>NIP</th>
            <th>Mata Pelajaran</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in filteredDaftar" :key="item.id">
            <td>{{ i + 1 }}</td>
            <td class="judul">{{ item.nama }}</td>
            <td>{{ item.nip || '-' }}</td>
            <td>{{ item.mapel || '-' }}</td>
            <td class="aksi-cell">
              <button class="detail-btn" @click="bukaModalEdit(item)">Edit</button>
              <button class="detail-btn detail-btn-danger" @click="hapus(item)">Hapus</button>
            </td>
          </tr>
          <tr v-if="!isLoading && filteredDaftar.length === 0">
            <td colspan="5" class="empty">Belum ada data guru. Tambahkan guru pertama.</td>
          </tr>
          <tr v-if="isLoading">
            <td colspan="5" class="empty">Memuat data...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="tutupModal">
      <div class="modal-card">
        <h2>{{ modalMode === 'edit' ? 'Edit Guru' : 'Tambah Guru' }}</h2>

        <div class="form-group">
          <label>Nama</label>
          <input type="text" v-model="form.nama" placeholder="Nama lengkap guru" />
        </div>

        <div class="form-group">
          <label>NIP <span class="optional">(opsional)</span></label>
          <input type="text" v-model="form.nip" placeholder="Nomor Induk Pegawai" />
        </div>

        <div class="form-group">
          <label>Mata Pelajaran <span class="optional">(opsional)</span></label>
          <input type="text" v-model="form.mapel" placeholder="Contoh: Matematika, Bahasa Indonesia" />
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="tutupModal">Batal</button>
          <button class="btn-primary" :disabled="isSaving" @click="simpan">
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px; background: #f8f9fb; min-height: 100vh; font-family: sans-serif; }

.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.header h1 { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; }
.subtitle { margin: 6px 0 0; font-size: 13px; color: #6b7280; }

.btn-tambah {
  display: inline-flex; align-items: center; gap: 8px;
  background: #5b4dff; color: #fff; border: 0; border-radius: 10px;
  padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 8px 16px rgba(91, 77, 255, 0.25);
}

.error-banner { background: #fee2e2; color: #b91c1c; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

.toolbar {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.search-box { flex: 1; position: relative; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: #9ca3af; pointer-events: none; display: flex;
}
.search {
  width: 100%; box-sizing: border-box; padding-left: 34px;
  border: 1px solid #e5e7eb; border-radius: 8px;
  padding-top: 8px; padding-bottom: 8px; padding-right: 12px;
  font-size: 13px; outline: none;
}
.select {
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px;
  font-size: 13px; background: #fff; color: #374151; min-width: 150px;
}

.table-wrap { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td {
  padding: 12px 14px; text-align: left; border-bottom: 1px solid #f3f4f6;
  color: #374151; vertical-align: middle; white-space: nowrap;
}
thead th { font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; }
tbody tr:hover { background: #f9fafb; }

.judul { font-weight: 600; color: #111827; }

.aksi-cell { display: flex; gap: 6px; }
.detail-btn {
  font-size: 11px;
  padding: 5px 10px;
  border: 1px solid #e3e9f2;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #2864e8;
}
.detail-btn-danger { color: #b91c1c; }

.icon-svg { width: 16px; height: 16px; display: block; }

.empty { text-align: center; color: #9ca3af; padding: 24px; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-card { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 420px; }
.modal-card h2 { margin: 0 0 16px; font-size: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-group label { font-size: 12px; color: #6b7280; font-weight: 600; }
.form-group .optional { font-weight: 400; color: #9ca3af; }
.form-group input { border: 1px solid #e3e9f2; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn-secondary {
  background: #fff; color: #374151; border: 1px solid #e3e9f2; border-radius: 8px;
  padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-primary {
  background: #2864e8; color: #fff; border: none; border-radius: 8px;
  padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 640px) {
  .page {
    padding: 14px;
  }

  /* Header */
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 16px;
  }

  .header h1 {
    font-size: 18px;
  }

  .subtitle {
    font-size: 12px;
    line-height: 1.5;
  }

  .btn-tambah {
    width: 100%;
    justify-content: center;
  }

  /* Error */
  .error-banner {
    font-size: 12px;
    padding: 10px 12px;
  }

  /* Search bar & filter TIDAK DIUBAH */

  /* Tabel */
  .table-wrap {
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 10px;
    -webkit-overflow-scrolling: touch;
  }

  .table-wrap::-webkit-scrollbar {
    height: 7px;
  }

  .table-wrap::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  .table-wrap::-webkit-scrollbar-thumb {
    background: #c7c9d1;
    border-radius: 999px;
  }

  table {
    min-width: 700px;
    font-size: 12px;
  }

  th,
  td {
    padding: 10px 12px;
  }

  /* Lebar kolom agar isi tabel tetap nyaman dibaca */
  th:nth-child(1),
  td:nth-child(1) {
    width: 50px;
  }

  th:nth-child(2),
  td:nth-child(2) {
    min-width: 180px;
  }

  th:nth-child(3),
  td:nth-child(3) {
    min-width: 140px;
  }

  th:nth-child(4),
  td:nth-child(4) {
    min-width: 180px;
  }

  th:nth-child(5),
  td:nth-child(5) {
    min-width: 130px;
  }

  .aksi-cell {
    gap: 6px;
  }

  .detail-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  /* Modal */
  .modal-overlay {
    padding: 12px;
  }

  .modal-card {
    width: 100%;
    max-width: 100%;
    padding: 20px;
    border-radius: 12px;
  }

  .modal-card h2 {
    font-size: 16px;
  }

  .form-group input {
    width: 100%;
    box-sizing: border-box;
    min-height: 40px;
  }

  .modal-actions {
    margin-top: 14px;
  }

  .btn-secondary,
  .btn-primary {
    padding: 10px 16px;
  }
}

</style>