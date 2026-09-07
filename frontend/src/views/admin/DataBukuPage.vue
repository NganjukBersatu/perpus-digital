<script setup>
import { ref, onMounted } from 'vue'

const buku = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')

const showModal = ref(false)
const modalMode = ref('tambah') // 'tambah' | 'edit'
const form = ref({ id: null, judul: '', penulis: '', penerbit: '', isbn: '', jumlahEksemplar: 1 })
const isSaving = ref(false)

// Modal hasil barcode setelah tambah
const showBarcodeResult = ref(false)
const barcodeResult = ref([]) // daftar eksemplar yang baru dibuat
const barcodeResultJudul = ref('')

// Modal detail buku (daftar eksemplar)
const showDetail = ref(false)
const detailBuku = ref(null)
const isLoadingDetail = ref(false)
const jumlahTambahEksemplar = ref(1)
const isAddingEksemplar = ref(false)

async function muatBuku() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const url = new URL('http://localhost:3000/api/buku')
    if (searchQuery.value) url.searchParams.set('q', searchQuery.value)
    const res = await fetch(url)
    if (!res.ok) throw new Error('response not ok')
    buku.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil data buku', err)
    errorMessage.value = 'Gagal memuat data buku. Pastikan backend aktif (node index.js).'
  } finally {
    isLoading.value = false
  }
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(muatBuku, 350)
}

function bukaModalTambah() {
  modalMode.value = 'tambah'
  form.value = { id: null, judul: '', penulis: '', penerbit: '', isbn: '', jumlahEksemplar: 1 }
  showModal.value = true
}

function bukaModalEdit(item) {
  modalMode.value = 'edit'
  form.value = {
    id: item.id,
    judul: item.judul,
    penulis: item.penulis || '',
    penerbit: item.penerbit || '',
    isbn: item.isbn || '',
    jumlahEksemplar: 0,
  }
  showModal.value = true
}

function tutupModal() {
  showModal.value = false
}

async function simpanBuku() {
  if (!form.value.judul.trim()) {
    alert('Judul buku wajib diisi')
    return
  }

  isSaving.value = true
  try {
    const isEdit = modalMode.value === 'edit'
    const url = isEdit
      ? `http://localhost:3000/api/buku/${form.value.id}`
      : 'http://localhost:3000/api/buku'

    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })

    if (!res.ok) throw new Error('Gagal menyimpan')

    const data = await res.json()
    showModal.value = false

    // Jika mode tambah dan ada eksemplar → tampilkan barcode
    if (!isEdit && data.eksemplar && data.eksemplar.length > 0) {
      barcodeResultJudul.value = data.judul
      barcodeResult.value = data.eksemplar
      showBarcodeResult.value = true
    }

    await muatBuku()
  } catch (err) {
    console.error(err)
    alert('Gagal menyimpan data buku. Coba lagi.')
  } finally {
    isSaving.value = false
  }
}

async function hapusBuku(item) {
  if (!confirm(`Hapus buku "${item.judul}"? Semua data eksemplarnya akan ikut terhapus.`)) return

  try {
    const res = await fetch(`http://localhost:3000/api/buku/${item.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Gagal menghapus')
    await muatBuku()
  } catch (err) {
    console.error(err)
    alert('Gagal menghapus buku. Mungkin masih ada peminjaman aktif yang terkait.')
  }
}

async function bukaDetail(item) {
  isLoadingDetail.value = true
  showDetail.value = true
  detailBuku.value = null
  jumlahTambahEksemplar.value = 1

  try {
    const res = await fetch(`http://localhost:3000/api/buku/${item.id}`)
    if (!res.ok) throw new Error('Gagal')
    detailBuku.value = await res.json()
  } catch (err) {
    console.error(err)
    alert('Gagal memuat detail buku')
    showDetail.value = false
  } finally {
    isLoadingDetail.value = false
  }
}

function tutupDetail() {
  showDetail.value = false
  detailBuku.value = null
}

async function tambahEksemplar() {
  if (!detailBuku.value) return
  isAddingEksemplar.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/buku/${detailBuku.value.id}/eksemplar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jumlah: jumlahTambahEksemplar.value }),
    })
    if (!res.ok) throw new Error('Gagal')
    const data = await res.json()

    // Refresh detail
    const resDetail = await fetch(`http://localhost:3000/api/buku/${detailBuku.value.id}`)
    detailBuku.value = await resDetail.json()

    // Tampilkan barcode yang baru
    if (data.eksemplar?.length) {
      barcodeResultJudul.value = detailBuku.value.judul
      barcodeResult.value = data.eksemplar
      showBarcodeResult.value = true
    }

    await muatBuku()
  } catch (err) {
    console.error(err)
    alert('Gagal menambah eksemplar')
  } finally {
    isAddingEksemplar.value = false
  }
}

function tutupBarcodeResult() {
  showBarcodeResult.value = false
  barcodeResult.value = []
}

function salinBarcode(barcode) {
  navigator.clipboard?.writeText(barcode)
  alert('Barcode disalin: ' + barcode)
}

onMounted(muatBuku)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Data Buku</h1>
        <p class="page-sub">Kelola koleksi judul buku dan jumlah eksemplarnya.</p>
      </div>
      <button class="btn-primary" @click="bukaModalTambah">+ Tambah Buku</button>
    </div>

    <div v-if="errorMessage" class="error-banner">⚠️ {{ errorMessage }}</div>

    <section class="card">
      <div class="card-title-row">
        <h2>Daftar Buku</h2>
        <input
          type="text"
          class="search-input"
          placeholder="Cari judul buku..."
          v-model="searchQuery"
          @input="onSearchInput"
        />
      </div>

      <div v-if="isLoading" class="empty-state">Memuat data...</div>
      <div v-else-if="buku.length === 0" class="empty-state">Belum ada buku. Tambahkan buku pertama kamu.</div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Judul</th>
            <th>Penulis</th>
            <th>Penerbit</th>
            <th>ISBN</th>
            <th>Eksemplar</th>
            <th>Tersedia</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in buku" :key="item.id">
            <td>{{ i + 1 }}</td>
            <td>
              <strong class="link-judul" @click="bukaDetail(item)">{{ item.judul }}</strong>
            </td>
            <td>{{ item.penulis || '-' }}</td>
            <td>{{ item.penerbit || '-' }}</td>
            <td>{{ item.isbn || '-' }}</td>
            <td>{{ item.totalEksemplar }}</td>
            <td>
              <span class="badge" :class="item.tersedia > 0 ? 'badge-green' : 'badge-red'">
                {{ item.tersedia }} tersedia
              </span>
            </td>
            <td class="aksi-cell">
              <button class="detail-btn" @click="bukaDetail(item)">Detail</button>
              <button class="detail-btn" @click="bukaModalEdit(item)">Edit</button>
              <button class="detail-btn detail-btn-danger" @click="hapusBuku(item)">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Modal Tambah / Edit -->
    <div v-if="showModal" class="modal-overlay" @click.self="tutupModal">
      <div class="modal-card">
        <h2>{{ modalMode === 'edit' ? 'Edit Buku' : 'Tambah Buku' }}</h2>

        <div class="form-group">
          <label>Judul</label>
          <input type="text" v-model="form.judul" placeholder="Judul buku" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Penulis</label>
            <input type="text" v-model="form.penulis" placeholder="Nama penulis" />
          </div>
          <div class="form-group">
            <label>Penerbit</label>
            <input type="text" v-model="form.penerbit" placeholder="Nama penerbit" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>ISBN</label>
            <input type="text" v-model="form.isbn" placeholder="Nomor ISBN (disarankan diisi)" />
          </div>
          <div class="form-group" v-if="modalMode === 'tambah'">
            <label>Jumlah Eksemplar Awal</label>
            <input type="number" min="0" v-model.number="form.jumlahEksemplar" />
          </div>
        </div>

        <p v-if="modalMode === 'tambah'" class="hint">
          ISBN diisi → barcode jadi <code>ISBN-01</code>, <code>ISBN-02</code>, …  
          Kosong → barcode jadi <code>BK-{id}-01</code>
        </p>

        <div class="modal-actions">
          <button class="btn-secondary" @click="tutupModal">Batal</button>
          <button class="btn-primary" :disabled="isSaving" @click="simpanBuku">
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal hasil barcode setelah tambah -->
    <div v-if="showBarcodeResult" class="modal-overlay" @click.self="tutupBarcodeResult">
      <div class="modal-card modal-card--wide">
        <h2>Barcode berhasil dibuat</h2>
        <p class="page-sub" style="margin-bottom: 14px">
          Buku: <strong>{{ barcodeResultJudul }}</strong>
        </p>
        <p class="hint">Catat / print barcode berikut, lalu tempel di buku fisik. Barcode ini yang di-scan saat pinjam.</p>

        <ul class="barcode-list">
          <li v-for="eks in barcodeResult" :key="eks.id">
            <code class="barcode-code">{{ eks.barcode }}</code>
            <button class="detail-btn" @click="salinBarcode(eks.barcode)">Salin</button>
          </li>
        </ul>

        <div class="modal-actions">
          <button class="btn-primary" @click="tutupBarcodeResult">Tutup</button>
        </div>
      </div>
    </div>

    <!-- Modal detail buku + daftar eksemplar -->
    <div v-if="showDetail" class="modal-overlay" @click.self="tutupDetail">
      <div class="modal-card modal-card--wide">
        <div v-if="isLoadingDetail" class="empty-state">Memuat detail...</div>

        <template v-else-if="detailBuku">
          <h2>{{ detailBuku.judul }}</h2>
          <p class="page-sub">
            {{ detailBuku.penulis || '-' }} · {{ detailBuku.penerbit || '-' }} · ISBN: {{ detailBuku.isbn || '-' }}
          </p>

          <div class="detail-section">
            <div class="detail-section-header">
              <h3>Daftar Eksemplar ({{ detailBuku.eksemplar?.length || 0 }})</h3>
              <div class="tambah-eksemplar">
                <input
                  type="number"
                  min="1"
                  max="50"
                  v-model.number="jumlahTambahEksemplar"
                  class="input-sm"
                />
                <button
                  class="btn-primary btn-sm"
                  :disabled="isAddingEksemplar"
                  @click="tambahEksemplar"
                >
                  {{ isAddingEksemplar ? 'Menambah...' : '+ Tambah eksemplar' }}
                </button>
              </div>
            </div>

            <table v-if="detailBuku.eksemplar?.length" class="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Barcode</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(eks, i) in detailBuku.eksemplar" :key="eks.id">
                  <td>{{ i + 1 }}</td>
                  <td><code class="barcode-code">{{ eks.barcode }}</code></td>
                  <td>
                    <span
                      class="badge"
                      :class="eks.status === 'tersedia' ? 'badge-green' : 'badge-red'"
                    >
                      {{ eks.status }}
                    </span>
                  </td>
                  <td>
                    <button class="detail-btn" @click="salinBarcode(eks.barcode)">Salin</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty-state">Belum ada eksemplar.</div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" @click="tutupDetail">Tutup</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  font-family: 'Segoe UI', sans-serif;
  color: #172b4d;
  background: #f4f6fb;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-header h1 { margin: 0; font-size: 20px; }
.page-sub { margin: 4px 0 0; font-size: 13px; color: #6b7280; }

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
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sm { padding: 7px 12px; font-size: 12px; }

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

.card {
  background: #fff;
  border: 1px solid #e3e9f2;
  border-radius: 12px;
  padding: 18px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.card-title-row h2 { margin: 0; font-size: 15px; }

.search-input {
  font-size: 12px;
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 220px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #9ca3af;
  font-size: 13px;
}

.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th {
  text-align: left;
  color: #9ca3af;
  font-weight: 600;
  padding: 8px 6px;
  border-bottom: 1px solid #edf1f6;
  font-size: 11px;
}
.data-table td { padding: 10px 6px; border-bottom: 1px solid #edf1f6; vertical-align: middle; }

.link-judul {
  color: #2864e8;
  cursor: pointer;
}
.link-judul:hover { text-decoration: underline; }

.badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
.badge-green { background: #d1fae5; color: #047857; }
.badge-red { background: #fee2e2; color: #b91c1c; }

.aksi-cell { display: flex; gap: 6px; flex-wrap: wrap; }
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

.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-card--wide { max-width: 560px; }
.modal-card h2 { margin: 0 0 16px; font-size: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; flex: 1; }
.form-row { display: flex; gap: 12px; }
.form-group label { font-size: 12px; color: #6b7280; font-weight: 600; }
.form-group input {
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.hint {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 12px;
  line-height: 1.5;
}
.hint code {
  background: #f3f4f6;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

.barcode-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}
.barcode-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  margin-bottom: 8px;
}
.barcode-code {
  font-family: 'IBM Plex Mono', Consolas, monospace;
  font-size: 13px;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 6px;
}

.detail-section { margin-top: 18px; }
.detail-section h3 { margin: 0; font-size: 14px; }
.detail-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.tambah-eksemplar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input-sm {
  width: 64px;
  border: 1px solid #e3e9f2;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
}
</style>