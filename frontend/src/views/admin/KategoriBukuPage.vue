<script setup>
import { ref, computed } from 'vue'

// ===== DATA DUMMY =====
const kategoriList = ref([
  { id: 1, nama: 'Buku Mata Pelajaran', deskripsi: 'Buku pelajaran sekolah sesuai kurikulum' },
  { id: 2, nama: 'Novel', deskripsi: 'Karya fiksi seperti novel dan cerpen' },
  { id: 3, nama: 'Referensi', deskripsi: 'Ensiklopedia, kamus, dan buku rujukan' },
])

const isLoading = ref(false)
const searchQuery = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// Modal form
const showModal = ref(false)
const modalMode = ref('tambah') // 'tambah' | 'edit'
const form = ref({ id: null, nama: '', deskripsi: '' })
const isSaving = ref(false)
const formError = ref('')

// Modal hapus
const showDeleteModal = ref(false)
const itemToDelete = ref(null)
const isDeleting = ref(false)

// ===== COMPUTED =====
const filteredKategori = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return kategoriList.value
  return kategoriList.value.filter((k) =>
    k.nama.toLowerCase().includes(q) ||
    (k.deskripsi && k.deskripsi.toLowerCase().includes(q))
  )
})

// ===== FUNGSI =====
function tampilkanPesan(tipe, pesan) {
  if (tipe === 'error') {
    errorMessage.value = pesan
    successMessage.value = ''
  } else {
    successMessage.value = pesan
    errorMessage.value = ''
  }
  // Hilangkan pesan setelah 3 detik
  setTimeout(() => {
    errorMessage.value = ''
    successMessage.value = ''
  }, 3000)
}

function bukaModalTambah() {
  modalMode.value = 'tambah'
  form.value = { id: null, nama: '', deskripsi: '' }
  formError.value = ''
  showModal.value = true
}

function bukaModalEdit(item) {
  modalMode.value = 'edit'
  form.value = {
    id: item.id,
    nama: item.nama,
    deskripsi: item.deskripsi || '',
  }
  formError.value = ''
  showModal.value = true
}

function tutupModal() {
  if (isSaving.value) return
  showModal.value = false
  formError.value = ''
}

function validasiForm() {
  const nama = form.value.nama.trim()

  if (!nama) {
    formError.value = 'Nama kategori wajib diisi'
    return false
  }

  // Cek duplikat (kecuali dirinya sendiri saat edit)
  const sudahAda = kategoriList.value.some(
    (k) =>
      k.nama.toLowerCase() === nama.toLowerCase() &&
      k.id !== form.value.id
  )

  if (sudahAda) {
    formError.value = 'Nama kategori sudah digunakan'
    return false
  }

  formError.value = ''
  return true
}

function simpanKategori() {
  if (!validasiForm()) return

  isSaving.value = true

  // Simulasi delay (nanti diganti API)
  setTimeout(() => {
    if (modalMode.value === 'edit') {
      const idx = kategoriList.value.findIndex((k) => k.id === form.value.id)
      if (idx !== -1) {
        kategoriList.value[idx] = {
          id: form.value.id,
          nama: form.value.nama.trim(),
          deskripsi: form.value.deskripsi.trim(),
        }
      }
      tampilkanPesan('success', 'Kategori berhasil diperbarui')
    } else {
      const idBaru = kategoriList.value.length
        ? Math.max(...kategoriList.value.map((k) => k.id)) + 1
        : 1

      kategoriList.value.push({
        id: idBaru,
        nama: form.value.nama.trim(),
        deskripsi: form.value.deskripsi.trim(),
      })
      tampilkanPesan('success', 'Kategori berhasil ditambahkan')
    }

    isSaving.value = false
    showModal.value = false
  }, 400)
}

function bukaModalHapus(item) {
  itemToDelete.value = item
  showDeleteModal.value = true
}

function tutupModalHapus() {
  if (isDeleting.value) return
  showDeleteModal.value = false
  itemToDelete.value = null
}

function konfirmasiHapus() {
  if (!itemToDelete.value) return

  isDeleting.value = true

  setTimeout(() => {
    kategoriList.value = kategoriList.value.filter(
      (k) => k.id !== itemToDelete.value.id
    )
    tampilkanPesan('success', `Kategori "${itemToDelete.value.nama}" berhasil dihapus`)
    isDeleting.value = false
    showDeleteModal.value = false
    itemToDelete.value = null
  }, 350)
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>Kategori Buku</h1>
        <p class="subtitle">Kelola kategori untuk mengelompokkan koleksi buku perpustakaan.</p>
      </div>
      <button class="btn-tambah" type="button" @click="bukaModalTambah">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Tambah Kategori
      </button>
    </div>

    <!-- Notifikasi -->
    <div v-if="errorMessage" class="banner error">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="banner success">✓ {{ successMessage }}</div>

    <!-- Search -->
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
          placeholder="Cari nama kategori..."
        />
      </div>
    </div>

    <!-- Tabel -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width: 60px">No</th>
            <th>Nama Kategori</th>
            <th>Deskripsi</th>
            <th style="width: 160px">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in filteredKategori" :key="item.id">
            <td>{{ i + 1 }}</td>
            <td class="judul">{{ item.nama }}</td>
            <td>{{ item.deskripsi || '-' }}</td>
            <td class="aksi-cell">
              <button class="btn-aksi" @click="bukaModalEdit(item)">Edit</button>
              <button class="btn-aksi danger" @click="bukaModalHapus(item)">Hapus</button>
            </td>
          </tr>

          <tr v-if="!isLoading && filteredKategori.length === 0">
            <td colspan="4" class="empty">
              {{ searchQuery ? 'Tidak ada kategori yang cocok.' : 'Belum ada kategori. Tambahkan kategori pertama.' }}
            </td>
          </tr>

          <tr v-if="isLoading">
            <td colspan="4" class="empty">Memuat data...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Tambah / Edit -->
    <div v-if="showModal" class="modal-overlay" @click.self="tutupModal">
      <div class="modal-card">
        <h2>{{ modalMode === 'edit' ? 'Edit Kategori' : 'Tambah Kategori' }}</h2>

        <div class="form-group">
          <label>Nama Kategori <span class="required">*</span></label>
          <input
            type="text"
            v-model="form.nama"
            placeholder="Contoh: Novel, Referensi"
            :disabled="isSaving"
            @keyup.enter="simpanKategori"
          />
        </div>

        <div class="form-group">
          <label>Deskripsi <span class="optional">(opsional)</span></label>
          <input
            type="text"
            v-model="form.deskripsi"
            placeholder="Deskripsi singkat kategori"
            :disabled="isSaving"
            @keyup.enter="simpanKategori"
          />
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <div class="modal-actions">
          <button class="btn-secondary" :disabled="isSaving" @click="tutupModal">Batal</button>
          <button class="btn-primary" :disabled="isSaving" @click="simpanKategori">
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="tutupModalHapus">
      <div class="modal-card modal-sm">
        <h2>Hapus Kategori?</h2>
        <p class="delete-text">
          Apakah Anda yakin ingin menghapus kategori
          <strong>"{{ itemToDelete?.nama }}"</strong>?
        </p>
        <p class="delete-hint">Tindakan ini tidak dapat dibatalkan.</p>

        <div class="modal-actions">
          <button class="btn-secondary" :disabled="isDeleting" @click="tutupModalHapus">Batal</button>
          <button class="btn-danger" :disabled="isDeleting" @click="konfirmasiHapus">
            {{ isDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  background: #f8f9fb;
  min-height: 100vh;
  font-family: sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}
.header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.btn-tambah {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #5b4dff;
  color: #fff;
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(91, 77, 255, 0.25);
}
.btn-tambah:hover {
  background: #4a3de6;
}

.banner {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}
.banner.error {
  background: #fee2e2;
  color: #b91c1c;
}
.banner.success {
  background: #d1fae5;
  color: #065f46;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.search-box {
  flex: 1;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  display: flex;
}
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px 8px 34px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}
.search:focus {
  border-color: #5b4dff;
}

.table-wrap {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th, td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
}
thead th {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #fafafa;
}
tbody tr:hover {
  background: #f9fafb;
}
.judul {
  font-weight: 600;
  color: #111827;
}

.aksi-cell {
  display: flex;
  gap: 6px;
}
.btn-aksi {
  font-size: 11px;
  padding: 5px 10px;
  border: 1px solid #e3e9f2;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #2864e8;
}
.btn-aksi:hover {
  background: #f0f5ff;
}
.btn-aksi.danger {
  color: #b91c1c;
}
.btn-aksi.danger:hover {
  background: #fef2f2;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 28px;
}

.icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
}
.modal-card.modal-sm {
  max-width: 380px;
}
.modal-card h2 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #111827;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.form-group label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}
.form-group .required {
  color: #dc2626;
}
.form-group .optional {
  font-weight: 400;
  color: #9ca3af;
}
.form-group input {
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
}
.form-group input:focus {
  border-color: #5b4dff;
}
.form-group input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-error {
  margin: -6px 0 12px;
  font-size: 12px;
  color: #dc2626;
}

.delete-text {
  margin: 0 0 6px;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}
.delete-hint {
  margin: 0 0 20px;
  font-size: 12px;
  color: #9ca3af;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.btn-secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2864e8;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>