<script setup>
import { ref, onMounted, computed } from 'vue'

const siswa = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')
const selectedKelas = ref('')

const showModal = ref(false)
const modalMode = ref('tambah')
const form = ref({ id: null, nama: '', kelas: '' })
const isSaving = ref(false)

const kelasOptions = computed(() => {
  const semua = siswa.value.map((s) => s.kelas).filter(Boolean)
  return [...new Set(semua)].sort()
})

const filteredSiswa = computed(() => {
  if (!selectedKelas.value) return siswa.value
  return siswa.value.filter((s) => s.kelas === selectedKelas.value)
})

async function muatSiswa() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const url = new URL('http://localhost:3000/api/siswa')
    if (searchQuery.value) url.searchParams.set('q', searchQuery.value)
    const res = await fetch(url)
    if (!res.ok) throw new Error('response not ok')
    siswa.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil data siswa', err)
    errorMessage.value = 'Gagal memuat data siswa. Pastikan backend aktif (node index.js).'
  } finally {
    isLoading.value = false
  }
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(muatSiswa, 350)
}

function bukaModalTambah() {
  modalMode.value = 'tambah'
  form.value = { id: null, nama: '', kelas: '' }
  showModal.value = true
}

function bukaModalEdit(item) {
  modalMode.value = 'edit'
  form.value = { id: item.id, nama: item.nama, kelas: item.kelas || '' }
  showModal.value = true
}

function tutupModal() {
  showModal.value = false
}

async function simpanSiswa() {
  if (!form.value.nama.trim()) {
    alert('Nama siswa wajib diisi')
    return
  }

  isSaving.value = true
  try {
    const isEdit = modalMode.value === 'edit'
    const url = isEdit
      ? `http://localhost:3000/api/siswa/${form.value.id}`
      : 'http://localhost:3000/api/siswa'

    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })

    if (!res.ok) throw new Error('Gagal menyimpan')

    showModal.value = false
    await muatSiswa()
  } catch (err) {
    console.error(err)
    alert('Gagal menyimpan data siswa. Coba lagi.')
  } finally {
    isSaving.value = false
  }
}

async function hapusSiswa(item) {
  if (!confirm(`Hapus data "${item.nama}"?`)) return

  try {
    const res = await fetch(`http://localhost:3000/api/siswa/${item.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Gagal menghapus')
    await muatSiswa()
  } catch (err) {
    console.error(err)
    alert('Gagal menghapus siswa. Mungkin masih ada riwayat peminjaman yang terkait.')
  }
}

onMounted(muatSiswa)
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
          @input="onSearchInput"
        />
      </div>

      <select v-model="selectedKelas" class="select">
        <option value="">Semua Kelas</option>
        <option v-for="k in kelasOptions" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in filteredSiswa" :key="item.id">
            <td>{{ i + 1 }}</td>
            <td class="judul">{{ item.nama }}</td>
            <td>{{ item.kelas || '-' }}</td>
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

  /* Header saja yang dibuat responsive */
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header h1 {
    font-size: 18px;
  }

  .subtitle {
    font-size: 12px;
  }

  .btn-tambah {
    width: 100%;
    justify-content: center;
  }

  /* Tabel */
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 620px;
  }

  th,
  td {
    padding: 10px 12px;
  }

  /* Tombol aksi */
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
  }

  .modal-card h2 {
    font-size: 16px;
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