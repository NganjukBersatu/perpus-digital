<script setup>
import { ref, computed } from 'vue'

const searchQuery = ref('')
const selectedKategori = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const perPage = ref(5)

const showModal = ref(false)
const editingId = ref(null)
const showConfirmModal = ref(false)
const bukuToDelete = ref(null)

const emptyForm = () => ({
  judul: '',
  penulis: '',
  kategori: '',
  isbn: '',
  stok: 0,
  tersedia: 0,
  lokasi: '',
  status: 'Tersedia'
})

const form = ref(emptyForm())

function openTambah() {
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(buku) {
  editingId.value = buku.id
  form.value = {
    judul: buku.judul,
    penulis: buku.penulis,
    kategori: buku.kategori,
    isbn: buku.isbn,
    stok: buku.stok,
    tersedia: buku.tersedia,
    lokasi: buku.lokasi,
    status: buku.status
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

function simpanBuku() {
  if (!form.value.judul || !form.value.penulis) return

  if (editingId.value !== null) {
    // MODE EDIT: cari data lama, update field-nya
    const index = bukuList.value.findIndex((b) => b.id === editingId.value)
    if (index !== -1) {
      bukuList.value[index] = {
        ...bukuList.value[index],
        judul: form.value.judul,
        penulis: form.value.penulis,
        kategori: form.value.kategori,
        isbn: form.value.isbn,
        stok: Number(form.value.stok),
        tersedia: Number(form.value.tersedia),
        lokasi: form.value.lokasi,
        status: form.value.status
      }
    }
  } else {
    // MODE TAMBAH (kode lama)
    const inisial = form.value.judul
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 3)
      .toUpperCase()

    bukuList.value.push({
      id: Date.now(),
      judul: form.value.judul,
      penulis: form.value.penulis,
      kategori: form.value.kategori,
      isbn: form.value.isbn,
      stok: Number(form.value.stok),
      tersedia: Number(form.value.tersedia),
      lokasi: form.value.lokasi,
      status: form.value.status,
    })
  }

  closeModal()
}

function hapusBuku(buku) {
  bukuToDelete.value = buku
  showConfirmModal.value = true
}

function konfirmasiHapus() {
  if (bukuToDelete.value) {
    bukuList.value = bukuList.value.filter((b) => b.id !== bukuToDelete.value.id)
  }
  batalHapus()
}

function batalHapus() {
  showConfirmModal.value = false
  bukuToDelete.value = null
}

const bukuList = ref([
  {
    id: 1,
    judul: 'Dasar Pemrograman Web',
    penulis: 'Abdul Kadir',
    kategori: 'Buku Mata Pelajaran',
    isbn: '978-602-6232-44-1',
    stok: 5,
    tersedia: 4,
    lokasi: 'Rak T-01',
    status: 'Tersedia',
  },
  {
    id: 2,
    judul: 'Laskar Pelangi',
    penulis: 'Andrea Hirata',
    kategori: 'Novel',
    isbn: '978-979-1227-41-5',
    stok: 3,
    tersedia: 2,
    lokasi: 'Rak N-02',
    status: 'Tersedia',
  },
  {
    id: 3,
    judul: 'Matematika Kelas XII',
    penulis: 'Budi Santoso',
    kategori: 'Buku Mata Pelajaran',
    isbn: '978-602-298-567-8',
    stok: 10,
    tersedia: 7,
    lokasi: 'Rak M-03',
    status: 'Tersedia',
  },
  {
    id: 4,
    judul: 'Bumi',
    penulis: 'Tere Liye',
    kategori: 'Novel',
    isbn: '978-602-9474-17-6',
    stok: 4,
    tersedia: 1,
    lokasi: 'Rak N-01',
    status: 'Stok Menipis',
  },
  {
    id: 5,
    judul: 'Sejarah Indonesia',
    penulis: 'Dra. Wulandari',
    kategori: 'Buku Mata Pelajaran',
    isbn: '978-602-437-123-4',
    stok: 2,
    tersedia: 0,
    lokasi: 'Rak S-02',
    status: 'Habis',
  }
])

const filteredList = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return bukuList.value.filter((b) => {
    const matchSearch =
      !q ||
      b.judul.toLowerCase().includes(q) ||
      b.penulis.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q)
    const matchKategori = !selectedKategori.value || b.kategori === selectedKategori.value
    const matchStatus = !selectedStatus.value || b.status === selectedStatus.value
    return matchSearch && matchKategori && matchStatus
  })
})

const totalData = computed(() => filteredList.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalData.value / perPage.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredList.value.slice(start, start + perPage.value)
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
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Data Buku</h1>
        <p class="subtitle">Kelola koleksi buku yang tersedia di perpustakaan.</p>
      </div>
      <button class="btn-tambah" type="button" @click="openTambah">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Tambah Buku
      </button>
    </div>

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
          placeholder="Cari judul, penulis, atau ISBN..."
          class="search"
          @input="resetPage"
        />
      </div>

      <select v-model="selectedKategori" class="select" @change="resetPage">
        <option value="">Semua Kategori</option>
        <option value="Buku Mata Pelajaran">Buku Mata Pelajaran</option>
        <option value="Novel">Novel</option>
      </select>

      <select v-model="selectedStatus" class="select" @change="resetPage">
        <option value="">Semua Status</option>
        <option value="Tersedia">Tersedia</option>
        <option value="Stok Menipis">Stok Menipis</option>
        <option value="Habis">Habis</option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Judul Buku</th>
            <th>Penulis</th>
            <th>Kategori</th>
            <th>ISBN</th>
            <th>Stok</th>
            <th>Tersedia</th>
            <th>Lokasi</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in pagedList" :key="b.id">
            <td>{{ (currentPage - 1) * perPage + i + 1 }}</td>
            <td class="judul">{{ b.judul }}</td>
            <td>{{ b.penulis }}</td>
            <td>{{ b.kategori }}</td>
            <td>{{ b.isbn }}</td>
            <td>{{ b.stok }}</td>
            <td>{{ b.tersedia }}</td>
            <td>{{ b.lokasi }}</td>
            <td>
              <span
                class="badge"
                :class="{
                  'badge-green': b.status === 'Tersedia',
                  'badge-orange': b.status === 'Stok Menipis',
                  'badge-red': b.status === 'Habis',
                }"
              >
                {{ b.status }}
              </span>
            </td>
            <td>
              <div class="aksi">
                <button class="icon-btn icon-edit" type="button" title="Edit" @click="openEdit(b)">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9" stroke-linecap="round" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke-linejoin="round" />
                  </svg>
                </button>
                <button class="icon-btn icon-hapus" type="button" title="Hapus" @click="hapusBuku(b)">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16" stroke-linecap="round" />
                    <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="pagedList.length === 0">
            <td colspan="11" class="empty">Belum ada data buku</td>
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

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <h2>{{ editingId !== null ? 'Edit Buku' : 'Tambah Buku' }}</h2>
          <button class="icon-btn" type="button" @click="closeModal">✕</button>
        </div>

        <form class="modal-form" @submit.prevent="simpanBuku">
          <div class="form-group">
            <label>Judul Buku</label>
            <input v-model="form.judul" type="text" required placeholder="Masukkan judul buku" />
          </div>

          <div class="form-group">
            <label>Penulis</label>
            <input v-model="form.penulis" type="text" required placeholder="Masukkan nama penulis" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Kategori</label>
              <select v-model="form.kategori" required>
                <option value="" disabled>Pilih kategori</option>
                <option value="Buku Mata Pelajaran">Buku Mata Pelajaran</option>
                <option value="Novel">Novel</option>
              </select>
            </div>

            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status" required>
                <option value="Tersedia">Tersedia</option>
                <option value="Stok Menipis">Stok Menipis</option>
                <option value="Habis">Habis</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>ISBN</label>
            <input v-model="form.isbn" type="text" required placeholder="978-xxx-xxxx-xx-x" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Stok</label>
              <input v-model.number="form.stok" type="number" min="0" required />
            </div>

            <div class="form-group">
              <label>Tersedia</label>
              <input v-model.number="form.tersedia" type="number" min="0" required />
            </div>
          </div>

          <div class="form-group">
            <label>Lokasi</label>
            <input v-model="form.lokasi" type="text" required placeholder="Contoh: Rak T-01" />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-batal" @click="closeModal">Kembali</button>
            <button type="submit" class="btn-simpan">{{ editingId !== null ? 'Update' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay" @click.self="batalHapus">
      <div class="confirm-box">
        <div class="confirm-icon">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16" stroke-linecap="round" />
            <path d="M10 11v6M14 11v6" stroke-linecap="round" />
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        </div>

        <h3>Hapus Buku?</h3>
        <p>
          Yakin ingin menghapus buku
          <strong>"{{ bukuToDelete?.judul }}"</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>

        <div class="confirm-actions">
          <button type="button" class="btn-batal" @click="batalHapus">Batal</button>
          <button type="button" class="btn-hapus-confirm" @click="konfirmasiHapus">Ya, Hapus</button>
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
}

.header h1 { 
    font-size: 20px; 
    font-weight: 700; 
    color: #1f2937; 
    margin: 0; 
}

.toolbar { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    background: #fff; 
    border-radius: 12px; 
    padding: 12px; 
    margin-bottom: 16px; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
}

.search { 
    flex: 1; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 12px; 
    font-size: 13px; 
}

.table-wrap { 
    background: #fff; 
    border-radius: 12px; 
    overflow-x: auto;
    overflow-y: hidden; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
}

.table-wrap::-webkit-scrollbar {
  height: 8px;
}

.table-wrap::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.table-wrap::-webkit-scrollbar-thumb {
  background: #c7c9d1;
  border-radius: 999px;
}

.table-wrap::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

table { 
    width: 100%; 
    min-width: 900px;
    border-collapse: collapse; 
    font-size: 13px; 
}

.badge { 
    padding: 4px 10px; 
    border-radius: 999px; 
    font-size: 12px; 
    font-weight: 500; 
}

.badge-green { 
    background: #d1fae5; 
    color: #059669; 
}

.badge-red { 
    background: #fee2e2; 
    color: #dc2626; 
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
  padding-left: 34px;
  outline: none;
}

.select {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  background: #fff;
  color: #374151;
  min-width: 150px;
}

th, td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
  white-space: nowrap;
}

thead th {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #fafafa;
}

tbody tr:hover { background: #f9fafb; }

.judul {
  font-weight: 600;
  color: #111827;
}

.cover {
  width: 36px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

.aksi { display: flex; gap: 8px; }

.icon-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  background: #f3f4f6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-edit { color: #5b4dff; }
.icon-hapus { color: #ef4444; }

.icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 4px 0;
  font-size: 13px;
  color: #6b7280;
}

.pages {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pages button {
  min-width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pages .page-num.active {
  background: #5b4dff;
  color: #fff;
}

.pages button:disabled {
  opacity: 0.4;
  cursor: default;
}

.select-sm { min-width: auto; }

.empty { 
    text-align: center; 
    color: #9ca3af; 
    padding: 24px; 
}

.badge-orange {
  background: #fef3c7;
  color: #b45309;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-box {
  background: #fff;
  border-radius: 14px;
  width: 480px;
  max-width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px 24px 24px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group select {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #111827;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #5b4dff;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.btn-batal {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  cursor: pointer;
}

.btn-simpan {
  border: 0;
  background: #5b4dff;
  color: #fff;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.confirm-box {
  background: #fff;
  border-radius: 14px;
  width: 380px;
  max-width: 92%;
  padding: 28px 24px 24px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  text-align: center;
}

.confirm-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.confirm-icon .icon-svg {
  width: 24px;
  height: 24px;
}

.confirm-box h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.confirm-box p {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 20px;
  line-height: 1.5;
}

.confirm-box p strong {
  color: #374151;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn-hapus-confirm {
  border: 0;
  background: #ef4444;
  color: #fff;
  border-radius: 8px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-hapus-confirm:hover {
  background: #dc2626;
}

/* ===== Responsive Mobile - Data Buku ===== */
@media (max-width: 640px) {
  .page {
    padding: 14px;
  }

  /* Header: judul + tombol jadi vertikal */
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header h1 {
    font-size: 18px;
  }

  .btn-tambah {
    width: 100%;
    justify-content: center;
    padding: 11px 16px;
  }

  /* Toolbar: search + filter ditumpuk vertikal */
  .toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
}

.search-box {
  grid-column: 1 / -1;
  width: 100%;
}

.select {
  width: 100%;
  min-width: 0;
}

  .search-box {
    width: 100%;
  }

  .select {
    width: 100%;
    min-width: 0;
  }

  /* Tabel tetap bisa di-scroll horizontal */
  .table-wrap {
    border-radius: 10px;
  }

  table {
    min-width: 820px; /* biar kolom tidak terlalu gepeng */
    font-size: 12px;
  }

  th, td {
    padding: 10px 12px;
  }

  /* Pagination: ditumpuk agar tidak sempit */
  .pagination {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-top: 16px;
  }

  .pages {
    justify-content: center;
  }

  .range {
    text-align: center;
    font-size: 12px;
  }

  .select-sm {
    width: 100%;
  }

  /* Modal sudah cukup baik, hanya rapikan sedikit */
  .modal-box {
    width: 100%;
    max-width: 94%;
    margin: 12px;
    padding: 16px 18px 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 14px;
  }

  .confirm-box {
    width: 100%;
    max-width: 92%;
    margin: 12px;
  }
}
</style>