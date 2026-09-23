<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/utils/axios'

const daftarSiswa = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')

const searchQuery = ref('')
const selectedKelas = ref('')
const kelasMenuOpen = ref(false)

const showModal = ref(false)
const modalMode = ref('tambah')
const form = ref({ id: null, nama: '', kelas: '', nis: '', tanggalLahir: '' })

const currentPage = ref(1)
const perPage = ref(5)

const kelasOptions = computed(() => {
  const semuaKelas = daftarSiswa.value.map(s => s.kelas).filter(Boolean)
  return [...new Set(semuaKelas)]
})

const filteredSiswa = computed(() => {
  let hasil = daftarSiswa.value

  if (selectedKelas.value) {
    hasil = hasil.filter((s) => s.kelas === selectedKelas.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    hasil = hasil.filter((s) => (s.nama || '').toLowerCase().includes(q))
  }

  return hasil
})

const totalData = computed(() => filteredSiswa.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalData.value / perPage.value)))

const pagedSiswa = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredSiswa.value.slice(start, start + perPage.value)
})

const rangeText = computed(() => {
  if (totalData.value === 0) return 'Menampilkan 0 data'
  const start = (currentPage.value - 1) * perPage.value + 1
  const end = Math.min(currentPage.value * perPage.value, totalData.value)
  return `Menampilkan ${start} - ${end} dari ${totalData.value} data`
})

function resetPage() {
  currentPage.value = 1
}

function labelKelasTerpilih() {
  return selectedKelas.value || 'Semua Kelas'
}

function pilihKelas(kelas) {
  selectedKelas.value = kelas
  kelasMenuOpen.value = false
  resetPage()
}

function tutupFilterMenu(e) {
  if (!e.target.closest?.('.filter-dropdown')) kelasMenuOpen.value = false
}

onMounted(async () => {
  document.addEventListener('click', tutupFilterMenu)
  try {
    const { data } = await api.get('/siswa')
    daftarSiswa.value = data
  } catch (err) {
    errorMessage.value = 'Gagal memuat data siswa'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', tutupFilterMenu)
})

function onSearchInput() {}

function bukaModalTambah() {
  modalMode.value = 'tambah'
  form.value = { id: null, nama: '', kelas: '', nis: '', tanggalLahir: '' }
  showModal.value = true
}

function bukaModalEdit(item) {
  modalMode.value = 'edit'
  form.value = {
    id: item.id,
    nama: item.nama,
    kelas: item.kelas,
    nis: item.nis || '',
    tanggalLahir: item.tanggalLahir || '',
  }
  showModal.value = true
}

function tutupModal() {
  showModal.value = false
}

async function simpanSiswa() {
  isSaving.value = true
  errorMessage.value = ''

  try {
    if (modalMode.value === 'tambah') {
      const { data } = await api.post('/siswa', form.value)
      daftarSiswa.value.push(data)
    } else {
      const { data } = await api.put(`/siswa/${form.value.id}`, form.value)
      const index = daftarSiswa.value.findIndex(s => s.id === form.value.id)
      if (index !== -1) daftarSiswa.value[index] = data
    }
    showModal.value = false
  } catch (err) {
    errorMessage.value = 'Gagal menyimpan data siswa'
  } finally {
    isSaving.value = false
  }
}

async function hapusSiswa(item) {
  if (!confirm(`Hapus siswa ${item.nama}?`)) return

  try {
    await api.delete(`/siswa/${item.id}`)
    daftarSiswa.value = daftarSiswa.value.filter(s => s.id !== item.id)
  } catch (err) {
    errorMessage.value = 'Gagal menghapus siswa'
  }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Data Siswa</h1>
        <p class="subtitle">Kelola data siswa yang terdaftar sebagai anggota perpustakaan.</p>
      </div>
      <button class="btn-tambah" type="button" @click="bukaModalTambah">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Tambah Siswa
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
          placeholder="Cari nama siswa..."
          @input="resetPage"
        />
      </div>

      <div class="filter-dropdown">
        <button
          type="button"
          class="filter-dropdown-btn"
          @click.stop="kelasMenuOpen = !kelasMenuOpen"
        >
          {{ labelKelasTerpilih() }}
        </button>
        <ul v-if="kelasMenuOpen" class="filter-dropdown-list">
          <li :class="{ aktif: selectedKelas === '' }" @click="pilihKelas('')">Semua Kelas</li>
          <li
            v-for="k in kelasOptions"
            :key="k"
            :class="{ aktif: selectedKelas === k }"
            @click="pilihKelas(k)"
          >
            {{ k }}
          </li>
        </ul>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
  <th>No</th>
  <th>Nama</th>
  <th>Kelas</th>
  <th>NIS</th>
  <th>Aksi</th>
</tr>
        </thead>
        <tbody>
  <tr v-for="(item, i) in pagedSiswa" :key="item.id">
  <td>{{ (currentPage - 1) * perPage + i + 1 }}</td>
  <td class="judul">{{ item.nama }}</td>
  <td>{{ item.kelas || '-' }}</td>
  <td>{{ item.nis || '-' }}</td>
  <td class="aksi-cell">
              <button class="detail-btn" @click="bukaModalEdit(item)">Edit</button>
              <button class="detail-btn detail-btn-danger" @click="hapusSiswa(item)">Hapus</button>
            </td>
          </tr>
          <tr v-if="!isLoading && filteredSiswa.length === 0">
            <td colspan="4" class="empty">Belum ada siswa terdaftar.</td>
          </tr>
          <tr v-if="isLoading">
            <td colspan="4" class="empty">Memuat data...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="range">{{ rangeText }}</span>

      <div class="pages">
        <button type="button" :disabled="currentPage === 1" @click="currentPage--">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          v-for="n in totalPages"
          :key="n"
          type="button"
          class="page-num"
          :class="{ active: currentPage === n }"
          @click="currentPage = n"
        >
          {{ n }}
        </button>

        <button type="button" :disabled="currentPage === totalPages" @click="currentPage++">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <select v-model.number="perPage" class="select select-sm" @change="resetPage">
        <option :value="5">5 / halaman</option>
        <option :value="10">10 / halaman</option>
      </select>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="tutupModal">
      <div class="modal-card">
        <h2>{{ modalMode === 'edit' ? 'Edit Siswa' : 'Tambah Siswa' }}</h2>

        <div class="form-group">
          <label>Nama</label>
          <input type="text" v-model="form.nama" placeholder="Nama siswa" />
        </div>

        <div class="form-group">
  <label>Kelas</label>
  <input type="text" v-model="form.kelas" placeholder="Contoh: XII-RPL 2" />
</div>

<div class="form-group">
  <label>NIS</label>
  <input type="text" v-model="form.nis" placeholder="Nomor Induk Siswa" />
</div>

<div class="form-group">
  <label>Tanggal Lahir</label>
  <input type="date" v-model="form.tanggalLahir" />
</div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="tutupModal">Batal</button>
          <button class="btn-primary" :disabled="isSaving" @click="simpanSiswa">
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

.filter-dropdown { position: relative; flex-shrink: 0; min-width: 150px; }
.filter-dropdown-btn {
  width: 100%; font-family: inherit; font-size: 13px;
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 28px 8px 12px;
  color: #000; text-align: left; cursor: pointer; white-space: nowrap;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 8px center;
}
.filter-dropdown-list {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; margin: 0; padding: 6px 0;
  list-style: none; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); z-index: 40; max-height: 240px; overflow-y: auto;
}
.filter-dropdown-list li { padding: 8px 12px; font-size: 13px; cursor: pointer; }
.filter-dropdown-list li:hover,
.filter-dropdown-list li.aktif { background: #dbeafe; }

.table-wrap { background: #fff; border-radius: 12px; overflow-x: auto; overflow-y: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); -webkit-overflow-scrolling: touch; }

table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 560px; }
th, td {
  padding: 12px 14px; text-align: left; border-bottom: 1px solid #f3f4f6;
  color: #374151; vertical-align: middle; white-space: nowrap;
}
thead th {
  font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa;
  position: sticky; top: 0; z-index: 3;
}

th:nth-child(1),
td:nth-child(1) {
  position: sticky; left: 0; z-index: 2; background: #fff; min-width: 44px;
}
th:nth-child(2),
td:nth-child(2) {
  position: sticky;
  left: 44px;
  z-index: 2;
  background: #fff;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.04);
}
thead th:nth-child(1),
thead th:nth-child(2) {
  background: #fafafa; z-index: 4;
}
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 4px 0;
  font-size: 13px;
  color: #6b7280;
}
.pages { display: flex; align-items: center; gap: 6px; }
.pages button {
  min-width: 32px; height: 32px; border: 0; background: transparent;
  border-radius: 8px; cursor: pointer; color: #4b5563;
  display: inline-flex; align-items: center; justify-content: center;
}
.pages .page-num.active { background: #5b4dff; color: #fff; }
.pages button:disabled { opacity: 0.4; cursor: default; }
.select-sm { min-width: auto; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-card { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 420px; }
.modal-card h2 { margin: 0 0 16px; font-size: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-group label { font-size: 12px; color: #6b7280; font-weight: 600; }
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
  .page { padding: 14px; }
  .header { flex-direction: column; align-items: stretch; gap: 12px; }
  .header h1 { font-size: 18px; }
  .subtitle { font-size: 12px; }
  .btn-tambah { width: 100%; justify-content: center; }
  .filter-dropdown { min-width: 0; }
  .filter-dropdown-list { width: 100%; max-width: 100%; }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { min-width: 620px; }
  th, td { padding: 10px 12px; }
  th:nth-child(2), td:nth-child(2) { width: 110px; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .aksi-cell { gap: 6px; }
  .detail-btn { padding: 6px 10px; font-size: 11px; }
  .modal-overlay { padding: 12px; }
  .modal-card { width: 100%; max-width: 100%; padding: 20px; }
  .modal-card h2 { font-size: 16px; }
  .modal-actions { margin-top: 14px; }
  .btn-secondary, .btn-primary { padding: 10px 16px; }
  .pagination {
    flex-direction: row;       
    flex-wrap: wrap;          
    justify-content: center;  
    align-items: center;
    gap: 12px;
    padding-top: 16px;
  }

  .range {
    width: 100%;               
    text-align: center;
    font-size: 12px;
    margin-bottom: 4px;        
  }

  .pages {
    justify-content: center;
    width: auto;               
  }

  .select-sm {
    width: auto;               
    min-width: 110px;         
    margin-left: 0;
    margin-top: 0;            
    align-self: center;
  }
}
</style>