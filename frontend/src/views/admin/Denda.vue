<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const daftar = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const searchQuery = ref('')
const statusFilter = ref('Semua')
const statusMenuOpen = ref(false)
const totalBelumDibayar = ref(0)
const totalSudahDibayar = ref(0)

let searchTimeout = null

async function muatData() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const url = new URL('http://localhost:3000/api/denda')

    if (searchQuery.value) {
      url.searchParams.set('search', searchQuery.value)
    }

    if (statusFilter.value !== 'Semua') {
      url.searchParams.set('status', statusFilter.value)
    }

    const res = await fetch(url)

    if (!res.ok) throw new Error('response not ok')

    const json = await res.json()

    daftar.value = json.data
    totalBelumDibayar.value = json.totalBelumDibayar
    totalSudahDibayar.value = json.totalSudahDibayar
  } catch (err) {
    console.error(err)
    errorMessage.value =
      'Gagal memuat data denda. Pastikan backend aktif.'
  } finally {
    isLoading.value = false
  }
}

function formatRupiah(angka) {
  if (!angka) return 'Rp0'

  return 'Rp' + Number(angka).toLocaleString('id-ID')
}

function formatTanggal(tgl) {
  if (!tgl) return '-'

  return new Date(tgl).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(muatData, 350)
}

const showConfirmModal = ref(false)
const itemAkanDibayar = ref(null)
const isProcessing = ref(false)

function bukaKonfirmasiDibayar(item) {
  itemAkanDibayar.value = item
  showConfirmModal.value = true
}

function tutupKonfirmasi() {
  if (isProcessing.value) return
  showConfirmModal.value = false
  itemAkanDibayar.value = null
}

async function konfirmasiTandaiDibayar() {
  if (!itemAkanDibayar.value) return
  isProcessing.value = true

  try {
    const res = await fetch(
      `http://localhost:3000/api/denda/${itemAkanDibayar.value.id}/bayar`,
      { method: 'PATCH' }
    )

    if (!res.ok) {
      throw new Error('Gagal menandai pembayaran')
    }

    await muatData()
    showConfirmModal.value = false
    itemAkanDibayar.value = null
  } catch (err) {
    console.error(err)
    alert('Gagal menandai denda sebagai dibayar. Coba lagi.')
  } finally {
    isProcessing.value = false
  }
}

const statusOptions = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Belum Dibayar', label: 'Belum Dibayar' },
  { value: 'Sudah Dibayar', label: 'Sudah Dibayar' },
]

function labelStatusTerpilih() {
  return statusOptions.find((s) => s.value === statusFilter.value)?.label || 'Semua Status'
}

function pilihStatus(value) {
  statusFilter.value = value
  statusMenuOpen.value = false
}

function tutupFilterMenu(e) {
  if (!e.target.closest?.('.filter-dropdown')) statusMenuOpen.value = false
}

watch(statusFilter, muatData)

onMounted(() => {
  muatData()
  document.addEventListener('click', tutupFilterMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', tutupFilterMenu)
})
</script>

<template>
  <div class="page">

    <!-- HEADER HALAMAN -->
    <div class="header">
      <div>
        <h1>Denda</h1>
        <p class="subtitle">
          Daftar denda keterlambatan atau kerusakan buku dari anggota.
        </p>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="error-banner"
    >
      ⚠️ {{ errorMessage }}
    </div>

    <!-- RINGKASAN -->
    <div class="summary-row">
      <div class="summary-card summary-card--red">
        <span class="summary-label">
          Belum Dibayar
        </span>

        <span class="summary-value">
          {{ formatRupiah(totalBelumDibayar) }}
        </span>
      </div>

      <div class="summary-card summary-card--green">
        <span class="summary-label">
          Sudah Dibayar
        </span>

        <span class="summary-value">
          {{ formatRupiah(totalSudahDibayar) }}
        </span>
      </div>
    </div>

    <!-- SEARCH BAR -->
    <div class="toolbar">

      <div class="search-box">

        <span class="search-icon">
          <svg
            class="icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path
              d="M20 20l-3.5-3.5"
              stroke-linecap="round"
            />
          </svg>
        </span>

        <input
          type="text"
          v-model="searchQuery"
          class="search"
          placeholder="Cari nama peminjam atau judul buku..."
          @input="onSearchInput"
        />

      </div>

      <div class="filter-dropdown">
        <button
          type="button"
          class="filter-dropdown-btn"
          @click.stop="statusMenuOpen = !statusMenuOpen"
        >
          {{ labelStatusTerpilih() }}
        </button>
        <ul v-if="statusMenuOpen" class="filter-dropdown-list">
          <li
            v-for="s in statusOptions"
            :key="s.value"
            :class="{ aktif: statusFilter === s.value }"
            @click="pilihStatus(s.value)"
          >
            {{ s.label }}
          </li>
        </ul>
      </div>

    </div>

    <!-- TABEL -->
    <div class="table-wrap">

      <div
        v-if="isLoading"
        class="empty"
      >
        Memuat data...
      </div>

      <div
        v-else-if="daftar.length === 0"
        class="empty"
      >
        Tidak ada data denda.
      </div>

      <table v-else>

        <thead>
          <tr>
            <th>No</th>
            <th>Peminjam</th>
            <th>Buku</th>
            <th>Batas Kembali</th>
            <th>Dikembalikan</th>
            <th>Nominal Denda</th>
            <th>Status</th>
            <th>Tanggal Bayar</th>
            <th>Aksi</th>
          </tr>
        </thead>

        <tbody>

          <tr
            v-for="(item, i) in daftar"
            :key="item.id"
          >

            <td>
              {{ i + 1 }}
            </td>

            <td>
              <strong>
                {{ item.namaPeminjam }}
              </strong>

              <div class="sub-text">
                {{
                  item.peranPeminjam === 'guru'
                    ? 'Guru'
                    : (item.kelasPeminjam || '-')
                }}
              </div>
            </td>

            <td>
              {{ item.judulBuku }}
            </td>

            <td>
              {{ formatTanggal(item.tanggalKembali) }}
            </td>

            <td>
              {{
                item.tanggalDikembalikan
                  ? formatTanggal(item.tanggalDikembalikan)
                  : '-'
              }}
            </td>

            <td>
              {{ formatRupiah(item.denda) }}
            </td>

            <td>
              <span
                class="badge"
                :class="
                  item.statusDenda === 'sudah_dibayar'
                    ? 'badge-green'
                    : 'badge-red'
                "
              >
                {{
                  item.statusDenda === 'sudah_dibayar'
                    ? 'Sudah Dibayar'
                    : 'Belum Dibayar'
                }}
              </span>
            </td>

            <td>
              {{
                item.tanggalBayarDenda
                  ? formatTanggal(item.tanggalBayarDenda)
                  : '-'
              }}
            </td>

            <td>

              <button
                v-if="item.statusDenda !== 'sudah_dibayar'"
                class="detail-btn"
                @click="bukaKonfirmasiDibayar(item)"
              >
                Tandai Dibayar
              </button>

              <span
                v-else
                class="sub-text"
              >
                -
              </span>

            </td>

          </tr>

        </tbody>
      </table>

    </div>

    <!-- MODAL KONFIRMASI -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="tutupKonfirmasi">
      <div class="modal-card">
        <div class="modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v4M12 17h.01" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>

        <h2>Tandai sebagai dibayar?</h2>

        <p v-if="itemAkanDibayar" class="modal-text">
          Denda <strong>{{ formatRupiah(itemAkanDibayar.denda) }}</strong> dari
          <strong>{{ itemAkanDibayar.namaPeminjam }}</strong> akan ditandai sudah dibayar.
        </p>

        <div class="modal-actions">
          <button class="btn-secondary" :disabled="isProcessing" @click="tutupKonfirmasi">
            Batal
          </button>
          <button class="btn-primary" :disabled="isProcessing" @click="konfirmasiTandaiDibayar">
            {{ isProcessing ? 'Memproses...' : 'Ya, Tandai Dibayar' }}
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

/* HEADER */
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

.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

/* ERROR */
.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

/* SUMMARY */
.summary-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-card--red {
  background: #fff0f0;
}

.summary-card--green {
  background: #eaf8f1;
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
}

.summary-card--red .summary-value {
  color: #c53d3d;
}

.summary-card--green .summary-value {
  color: #18865b;
}

/* TOOLBAR - SAMA MODEL DATA BUKU */
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
  padding-top: 8px;
  padding-bottom: 8px;
  padding-right: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
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
  outline: none;
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
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 8px center;
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

.table-wrap {
  background: #fff;
  border-radius: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 900px;
}

th,
td {
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
  color: #414040;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 3;
}

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

tbody tr:hover {
  background: #f9fafb;
}

.sub-text {
  color: #9ca3af;
  font-size: 11px;
}

/* BADGE */
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

/* BUTTON */
.detail-btn {
  font-size: 11px;
  padding: 5px 10px;
  border: 1px solid #e3e9f2;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #2864e8;
}

.icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 24px;
}

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
  border-radius: 14px;
  padding: 28px;
  width: 100%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff7e6;
  color: #d97706;
}
.modal-icon svg {
  width: 26px;
  height: 26px;
}

.modal-card h2 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #1f2937;
}

.modal-text {
  margin: 0 0 20px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}
.modal-text strong {
  color: #1f2937;
}

.modal-actions {
  display: flex;
  gap: 10px;
}
.modal-actions button {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}
.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-primary {
  background: #2864e8;
  color: #fff;
}

@media (max-width: 640px) {
  .filter-dropdown {
    min-width: 0;
  }

  .filter-dropdown-list {
    width: 100%;
    max-width: 100%;
  }

  th:nth-child(2),
  td:nth-child(2) {
    width: 120px;
    max-width: 120px;
  }

  td:nth-child(2) strong,
  td:nth-child(2) .sub-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>