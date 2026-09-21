<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_URL = 'http://localhost:3000/api/buku'
const KATEGORI_URL = 'http://localhost:3000/api/kategori'

const searchQuery = ref('')
const selectedKategori = ref('')
const selectedStatus = ref('')
const kategoriMenuOpen = ref(false)
const statusMenuOpen = ref(false)
const currentPage = ref(1)
const perPage = ref(5)
const route = useRoute()
const router = useRouter()

const showModal = ref(false)
const editingId = ref(null)
const showConfirmModal = ref(false)
const bukuToDelete = ref(null)

const isLoading = ref(false)
const errorMessage = ref('')
const bukuList = ref([])
const daftarKategori = ref([])

const emptyForm = () => ({
  judul: '',
  penulis: '',
  kategoriId: '',
  isbn: '',
  stok: 0,
  tersedia: 0,
  lokasi: '',
  status: 'Tersedia',
  barcode: ''
})

const form = ref(emptyForm())
const isSaving = ref(false)
const formError = ref('')
const bukuTersimpan = ref(false)     // true setelah Simpan berhasil
const kodeBukuTersimpan = ref('') 

async function ambilDaftarKategori() {
  try {
    const res = await fetch(KATEGORI_URL)
    if (res.ok) daftarKategori.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil kategori', err)
  }
}

async function ambilDataBuku() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error()
    bukuList.value = await res.json()
  } catch (err) {
    errorMessage.value = 'Gagal memuat data buku. Pastikan backend aktif (node index.js).'
  } finally {
    isLoading.value = false
  }
}

function resetStatusModal() {
  bukuTersimpan.value = false
  kodeBukuTersimpan.value = ''
  formError.value = ''
  isSaving.value = false
}

function openTambah(barcodeAwal = '') {
  editingId.value = null
  resetStatusModal()
  form.value = emptyForm()

  const kode = typeof barcodeAwal === 'string' ? barcodeAwal.trim() : ''
  if (kode) {
    form.value.barcode = kode
    form.value.stok = 1
    form.value.tersedia = 1
    const m = kode.match(/^((?:978|979)\d{10})(?:-\d+)?$/)
    if (m) form.value.isbn = m[1]
    // kalau tidak cocok (kode toko/penerbit non-ISBN), form.isbn dibiarkan kosong — sesuai desain baru
  }
  showModal.value = true
}

function openEdit(buku) {
  editingId.value = buku.id
  resetStatusModal()
  form.value = {
    judul: buku.judul,
    penulis: buku.penulis,
    kategoriId: buku.kategoriId || '',
    isbn: buku.isbn,
    stok: buku.stok,
    tersedia: buku.tersedia,
    lokasi: buku.lokasi,
    status: buku.status,
    barcode: ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  resetStatusModal()

  // Bersihkan ?barcode=...&from=scan dari alamat, supaya refresh tidak membuka modal lagi
  if (route.query.barcode || route.query.from) {
    router.replace({ path: route.path, query: {} })
  }
}

// Tombol "Simpan": hanya menyimpan data buku
async function simpanBuku() {
  if (bukuTersimpan.value) return          // cegah tersimpan dua kali (misalnya tekan Enter)
  if (!form.value.judul || !form.value.penulis) return

  formError.value = ''
  isSaving.value = true
  try {
    const isEdit = editingId.value !== null
    const url = isEdit ? `${API_URL}/${editingId.value}` : API_URL
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    if (!res.ok) throw new Error()

    await ambilDataBuku()

    if (isEdit) {
      closeModal()
    } else {
      // Buku baru: modal tetap terbuka, tombol Pinjam diaktifkan
      kodeBukuTersimpan.value =
        String(form.value.barcode || '').trim() ||
        String(form.value.isbn || '').replace(/\D/g, '')
      bukuTersimpan.value = true
    }
  } catch (err) {
    console.error(err)
    formError.value = 'Gagal menyimpan data buku'
  } finally {
    isSaving.value = false
  }
}

// Tombol "Pinjam": hanya berpindah ke form peminjaman untuk buku yang sudah tersimpan
function pinjamBuku() {
  const kode = kodeBukuTersimpan.value
  if (!bukuTersimpan.value || !kode) return

  showModal.value = false
  editingId.value = null
  resetStatusModal()

  router.push({
    path: '/admin/pinjam',
    query: { barcode: kode, lanjut: 'pinjam', dari: 'data-buku' },
  })
}

function hapusBuku(buku) {
  bukuToDelete.value = buku
  showConfirmModal.value = true
}

async function konfirmasiHapus() {
  if (!bukuToDelete.value) return

  try {
    const res = await fetch(`${API_URL}/${bukuToDelete.value.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Gagal menghapus buku')

    showConfirmModal.value = false
    bukuToDelete.value = null

    await ambilDataBuku()

    if (pagedList.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Gagal menghapus buku. Coba lagi.'
    showConfirmModal.value = false
    bukuToDelete.value = null
  }
}

function batalHapus() {
  showConfirmModal.value = false
  bukuToDelete.value = null
}

const filteredList = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return bukuList.value.filter((b) => {
    const matchSearch =
      !q ||
      (b.judul || '').toLowerCase().includes(q) ||
      (b.penulis || '').toLowerCase().includes(q) ||
      (b.isbn || '').toLowerCase().includes(q) ||
      (b.barcode || '').toLowerCase().includes(q)
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

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'Tersedia', label: 'Tersedia' },
  { value: 'Stok Menipis', label: 'Stok Menipis' },
  { value: 'Habis', label: 'Habis' },
]

function labelKategoriTerpilih() {
  return selectedKategori.value || 'Semua Kategori'
}

function labelStatusTerpilih() {
  return statusOptions.find((s) => s.value === selectedStatus.value)?.label || 'Semua Status'
}

function pilihKategori(nama) {
  selectedKategori.value = nama
  kategoriMenuOpen.value = false
  statusMenuOpen.value = false
  resetPage()
}

function pilihStatus(value) {
  selectedStatus.value = value
  statusMenuOpen.value = false
  kategoriMenuOpen.value = false
  resetPage()
}

function tutupFilterMenu(e) {
  if (!e.target.closest?.('.filter-dropdown')) {
    kategoriMenuOpen.value = false
    statusMenuOpen.value = false
  }
}

onMounted(() => {
  ambilDataBuku()
  ambilDaftarKategori()
  document.addEventListener('click', tutupFilterMenu)

  const barcodeDariScan = route.query.barcode
  if (barcodeDariScan) {
    openTambah(String(barcodeDariScan))
  }
})

onUnmounted(() => {
  document.removeEventListener('click', tutupFilterMenu)
})
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

    <div v-if="errorMessage" class="banner error">⚠️ {{ errorMessage }}</div>

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
          placeholder="Cari judul, penulis, ISBN, atau barcode..."
          class="search"
          @input="resetPage"
        />
      </div>

<div class="filter-dropdown">
        <button
          type="button"
          class="filter-dropdown-btn"
          @click.stop="kategoriMenuOpen = !kategoriMenuOpen; statusMenuOpen = false"
        >
          {{ labelKategoriTerpilih() }}
        </button>
        <ul v-if="kategoriMenuOpen" class="filter-dropdown-list">
          <li :class="{ aktif: selectedKategori === '' }" @click="pilihKategori('')">Semua Kategori</li>
          <li
            v-for="k in daftarKategori"
            :key="k.id"
            :class="{ aktif: selectedKategori === k.nama }"
            @click="pilihKategori(k.nama)"
          >
            {{ k.nama }}
          </li>
        </ul>
      </div>

      <div class="filter-dropdown">
        <button
          type="button"
          class="filter-dropdown-btn"
          @click.stop="statusMenuOpen = !statusMenuOpen; kategoriMenuOpen = false"
        >
          {{ labelStatusTerpilih() }}
        </button>
        <ul v-if="statusMenuOpen" class="filter-dropdown-list">
          <li
            v-for="s in statusOptions"
            :key="s.value || 'all'"
            :class="{ aktif: selectedStatus === s.value }"
            @click="pilihStatus(s.value)"
          >
            {{ s.label }}
          </li>
        </ul>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Judul Buku</th>
            <th>Penulis</th>
            <th>Kategori</th>
            <th>Kode Buku</th>
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
            <td>
             <span class="kode-buku">
             <span class="kode-buku__label">{{ b.isbn ? 'ISBN' : 'Barcode' }}</span>
             <span class="kode-buku__nilai">{{ b.isbn || b.barcode || '-' }}</span>
           </span>
           </td>
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
              <div class="aksi-cell">
                <button class="btn-aksi" type="button" @click="openEdit(b)">Edit</button>
                <button class="btn-aksi danger" type="button" @click="hapusBuku(b)">Hapus</button>
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
          <button class="icon-btn" type="button" @click="closeModal" title="Tutup" aria-label="Tutup">✕</button>
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
<select v-model="form.kategoriId" required>
  <option value="" disabled>Pilih kategori</option>
  <option v-for="k in daftarKategori" :key="k.id" :value="k.id">{{ k.nama }}</option>
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
  <label>ISBN (opsional)</label>
  <input v-model="form.isbn" type="text" placeholder="978-xxx-xxxx-xx-x — kosongkan jika tidak ada" />
</div>

          <div class="form-group" v-if="editingId === null">
            <label>Barcode</label>
            <input v-model="form.barcode" type="text" placeholder="Scan atau ketik barcode buku (opsional)" />
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

          
<div v-if="formError" class="form-error">{{ formError }}</div>
<div v-if="bukuTersimpan" class="form-sukses">
  ✓ Buku sudah tersimpan. Klik "Pinjam" untuk lanjut ke form peminjaman.
</div>
<div v-if="bukuTersimpan && Number(form.tersedia) < 1" class="form-error">
  Kolom "Tersedia" masih 0, jadi buku ini belum bisa dipinjam.
</div>

<div class="modal-actions">
  <button
    v-if="editingId === null"
    type="button"
    class="btn-simpan btn-simpan--outline"
    :disabled="!bukuTersimpan || Number(form.tersedia) < 1"
    @click="pinjamBuku"
  >
    Pinjam
  </button>

  <button type="submit" class="btn-simpan" :disabled="isSaving || bukuTersimpan">
    {{ bukuTersimpan ? 'Tersimpan ✓' : (editingId !== null ? 'Update' : 'Simpan') }}
  </button>
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
  color: #000000;
  min-width: 150px;
}

.filter-dropdown {
  position: relative;
  flex-shrink: 0;
  min-width: 150px;
}

.filter-dropdown-btn {
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 28px 8px 12px;
  color: #000;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 8px center;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}

.filter-dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  z-index: 40;
  max-height: 240px;
  overflow-y: auto;
}

.filter-dropdown-list li {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.filter-dropdown-list li:hover,
.filter-dropdown-list li.aktif {
  background: #dbeafe;
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
  position: sticky;
  top: 0;
  z-index: 3;
}

/* Kolom No & Judul Buku tetap terlihat saat scroll ke kiri */
th:nth-child(1),
td:nth-child(1) {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  min-width: 44px;
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
  background: #fafafa;
  z-index: 4;
}

tbody tr:hover { background: #f9fafb; }

.judul {
  font-weight: 600;
  color: #111827;
}

.kode-buku {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.kode-buku__label {
  display: inline-block;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 4px;
}

.kode-buku__nilai {
  font-family: 'IBM Plex Mono', Consolas, monospace;
  font-size: 12px;
  color: #374151;
}

.cover {
  width: 36px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
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

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  color: #4b5563;
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.icon-btn:active {
  background: #e5e7eb;
  transform: scale(0.95);
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

.btn-simpan--outline {
  background: #fff;
  color: #5b4dff;
  border: 1px solid #5b4dff;
}
.btn-simpan:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.form-error {
  font-size: 12px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 12px;
}
.form-sukses {
  font-size: 12px;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 8px 12px;
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

@media (max-width: 640px) {
  .page {
    padding: 14px;
  }

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

  .select,
  .filter-dropdown {
    width: 100%;
    min-width: 0;
  }

  .search-box {
    width: 100%;
  }

  .filter-dropdown-list {
    width: 100%;
    max-width: 100%;
  }

  .table-wrap {
    border-radius: 10px;
  }

  table {
    min-width: 820px;
    font-size: 12px;
  }

  th, td {
    padding: 10px 12px;
  }  
  
  th:nth-child(2),
  td:nth-child(2) {
    width: 110px;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

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