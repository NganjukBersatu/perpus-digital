<script setup>
import { ref, onMounted } from 'vue'

const siswa = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')

const showModal = ref(false)
const modalMode = ref('tambah')
const form = ref({ id: null, nama: '', kelas: '' })
const isSaving = ref(false)

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
    <div class="page-header">
      <div>
        <h1>Data Siswa</h1>
        <p class="page-sub">Kelola data siswa yang terdaftar sebagai anggota perpustakaan.</p>
      </div>
      <button class="btn-primary" @click="bukaModalTambah">+ Tambah Siswa</button>
    </div>

    <div v-if="errorMessage" class="error-banner">⚠️ {{ errorMessage }}</div>

    <section class="card">
      <div class="card-title-row">
        <h2>Daftar Siswa</h2>
        <input
          type="text"
          class="search-input"
          placeholder="Cari nama siswa..."
          v-model="searchQuery"
          @input="onSearchInput"
        />
      </div>

      <div v-if="isLoading" class="empty-state">Memuat data...</div>
      <div v-else-if="siswa.length === 0" class="empty-state">Belum ada siswa terdaftar.</div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in siswa" :key="item.id">
            <td>{{ i + 1 }}</td>
            <td><strong>{{ item.nama }}</strong></td>
            <td>{{ item.kelas || '-' }}</td>
            <td class="aksi-cell">
              <button class="detail-btn" @click="bukaModalEdit(item)">Edit</button>
              <button class="detail-btn detail-btn-danger" @click="hapusSiswa(item)">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

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
/* --- style identik dengan DataBukuPage.vue, biar konsisten --- */
.page { padding: 24px; font-family: 'Segoe UI', sans-serif; color: #172b4d; background: #f4f6fb; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h1 { margin: 0; font-size: 20px; }
.page-sub { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
.btn-primary { background: #2864e8; color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #e3e9f2; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
.card { background: #fff; border: 1px solid #e3e9f2; border-radius: 12px; padding: 18px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.card-title-row h2 { margin: 0; font-size: 15px; }
.search-input { font-size: 12px; border: 1px solid #e3e9f2; border-radius: 8px; padding: 8px 12px; min-width: 220px; }
.empty-state { text-align: center; padding: 40px 0; color: #9ca3af; font-size: 13px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th { text-align: left; color: #9ca3af; font-weight: 600; padding: 8px 6px; border-bottom: 1px solid #edf1f6; font-size: 11px; }
.data-table td { padding: 10px 6px; border-bottom: 1px solid #edf1f6; vertical-align: middle; }
.aksi-cell { display: flex; gap: 6px; }
.detail-btn { font-size: 11px; padding: 5px 10px; border: 1px solid #e3e9f2; background: #fff; border-radius: 6px; cursor: pointer; color: #2864e8; }
.detail-btn-danger { color: #b91c1c; }
.error-banner { background: #fee2e2; color: #b91c1c; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 420px; }
.modal-card h2 { margin: 0 0 16px; font-size: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-group label { font-size: 12px; color: #6b7280; font-weight: 600; }
.form-group input { border: 1px solid #e3e9f2; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>