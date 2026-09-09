<script setup>
import { ref, onMounted, watch } from 'vue'

const daftar = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const searchQuery = ref('')
const statusFilter = ref('Semua')
const tanggalDari = ref('')
const tanggalSampai = ref('')

let searchTimeout = null

async function muatData() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const url = new URL(
      'http://localhost:3000/api/data-peminjaman'
    )

    if (searchQuery.value) {
      url.searchParams.set(
        'search',
        searchQuery.value
      )
    }

    if (statusFilter.value !== 'Semua') {
      url.searchParams.set(
        'status',
        statusFilter.value
      )
    }

    if (tanggalDari.value) {
      url.searchParams.set(
        'start',
        tanggalDari.value
      )
    }

    if (tanggalSampai.value) {
      url.searchParams.set(
        'end',
        tanggalSampai.value
      )
    }

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error('response not ok')
    }

    const json = await res.json()

    daftar.value = json.data
  } catch (err) {
    console.error(err)

    errorMessage.value =
      'Gagal memuat data peminjaman. Pastikan backend aktif.'
  } finally {
    isLoading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(
    muatData,
    350
  )
}

function classStatus(status) {
  if (status === 'Dipinjam') {
    return 'badge badge-blue'
  }

  if (status === 'Tepat Waktu') {
    return 'badge badge-green'
  }

  if (status === 'Terlambat') {
    return 'badge badge-red'
  }

  return 'badge'
}

function formatRupiah(angka) {
  if (!angka) return 'Rp0'

  return (
    'Rp' +
    Number(angka).toLocaleString('id-ID')
  )
}

function formatTanggal(tgl) {
  if (!tgl) return '-'

  return new Date(tgl).toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  )
}

async function tandaiDikembalikan(item) {
  if (
    !confirm(
      `Tandai buku "${item.judulBuku}" sebagai sudah dikembalikan?`
    )
  ) {
    return
  }

  try {
    const res = await fetch(
      `http://localhost:3000/api/peminjaman/${item.id}/kembalikan`,
      {
        method: 'PATCH',
      }
    )

    if (!res.ok) {
      throw new Error(
        'Gagal menandai pengembalian'
      )
    }

    await muatData()
  } catch (err) {
    console.error(err)

    alert(
      'Gagal menandai buku sebagai dikembalikan. Coba lagi.'
    )
  }
}

async function exportCsv() {
  try {
    const header = [
      'Nama',
      'Peran',
      'Kelas',
      'Buku',
      'Tanggal Pinjam',
      'Batas Kembali',
      'Tanggal Dikembalikan',
      'Status',
      'Keterlambatan',
      'Denda'
    ]

    const rows = daftar.value.map(
      (item) => [
        item.namaPeminjam,
        item.peranPeminjam,
        item.kelasPeminjam || '-',
        item.judulBuku,
        item.tanggalPinjam,
        item.batasKembali,
        item.tanggalDikembalikan || '-',
        item.status,
        item.keterlambatan,
        item.denda || 0,
      ]
    )

    const csvContent = [
      header,
      ...rows
    ]
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(cell).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(',')
      )
      .join('\n')

    const blob = new Blob(
      [csvContent],
      {
        type: 'text/csv;charset=utf-8;'
      }
    )

    const link =
      document.createElement('a')

    link.href =
      URL.createObjectURL(blob)

    link.download =
      `data-peminjaman-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`

    link.click()
  } catch (err) {
    console.error(err)

    alert(
      'Gagal export data. Coba lagi.'
    )
  }
}

watch(
  [
    tanggalDari,
    tanggalSampai,
    statusFilter
  ],
  muatData
)

onMounted(muatData)
</script>

<template>
  <div class="page">

    <!-- HEADER -->
    <div class="header">

      <div>
        <h1>
          Data Peminjaman
        </h1>

        <p class="subtitle">
          Daftar seluruh transaksi peminjaman buku, baik yang masih dipinjam maupun sudah dikembalikan.
        </p>
      </div>

      <button
        class="btn-export"
        @click="exportCsv"
      >
        ⬇ Export
      </button>

    </div>

    <div
      v-if="errorMessage"
      class="error-banner"
    >
      ⚠️ {{ errorMessage }}
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">

      <!-- SEARCH -->
      <div class="search-box">

        <span class="search-icon">

          <svg
            class="icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />

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
          placeholder="Cari nama peminjam, buku, atau ISBN..."
          @input="onSearchInput"
        />

      </div>

      <!-- STATUS -->
      <select
        v-model="statusFilter"
        class="select"
      >

        <option value="Semua">
          Semua Status
        </option>

        <option value="Dipinjam">
          Dipinjam
        </option>

        <option value="Tepat Waktu">
          Tepat Waktu
        </option>

        <option value="Terlambat">
          Terlambat
        </option>

      </select>

      <!-- TANGGAL (dibungkus supaya bisa turun ke bawah saat mobile) -->
      <div class="date-group">

        <input
          type="date"
          v-model="tanggalDari"
          class="date-input"
        />

        <span class="date-sep">
          s/d
        </span>

        <input
          type="date"
          v-model="tanggalSampai"
          class="date-input"
        />

      </div>

    </div>

    <!-- TABLE -->
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
        Tidak ada data peminjaman.
      </div>

      <table v-else>

        <thead>

          <tr>
            <th>No</th>
            <th>Peminjam</th>
            <th>Buku</th>
            <th>Tanggal Pinjam</th>
            <th>Batas Kembali</th>
            <th>Tanggal Kembali</th>
            <th>Status</th>
            <th>Keterlambatan</th>
            <th>Denda</th>
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

              <strong>
                {{ item.judulBuku }}
              </strong>

              <div class="sub-text">
                {{ item.penulisBuku }}
              </div>

            </td>

            <td>
              {{ formatTanggal(item.tanggalPinjam) }}
            </td>

            <td>
              {{ formatTanggal(item.batasKembali) }}
            </td>

            <td>
              {{
                item.tanggalDikembalikan
                  ? formatTanggal(
                      item.tanggalDikembalikan
                    )
                  : '-'
              }}
            </td>

            <td>

              <span
                :class="classStatus(item.status)"
              >
                {{ item.status }}
              </span>

            </td>

            <td>
              {{ item.keterlambatan }}
            </td>

            <td>
              {{ formatRupiah(item.denda) }}
            </td>

            <td>

              <button
                v-if="!item.tanggalDikembalikan"
                class="detail-btn"
                @click="tandaiDikembalikan(item)"
              >
                Tandai Kembali
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

    <div
      v-if="!isLoading && daftar.length > 0"
      class="table-footer"
    >
      Menampilkan {{ daftar.length }} data
    </div>

  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  background: #f8f9fb;
  min-height: 100vh;
  font-family: sans-serif;
  min-width: 0;
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

/* EXPORT */
.btn-export {
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

/* ERROR */
.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

/* TOOLBAR */
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

.date-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-input {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  background: #fff;
  color: #374151;
  outline: none;
}

.date-sep {
  font-size: 12px;
  color: #9ca3af;
}

.icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* TABLE */
.table-wrap {
  background: #fff;
  border-radius: 12px;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
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
  color: #6b7280;
  background: #fafafa;
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

.badge-blue {
  background: #dbeafe;
  color: #2563eb;
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

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 24px;
}

.table-footer {
  margin-top: 14px;
  font-size: 11px;
  color: #9ca3af;
}

@media (max-width: 640px) {
  .page {
    padding: 14px;
  }

  /* HEADER */
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

  .btn-export {
    width: 100%;
    justify-content: center;
  }

  /* ERROR */
  .error-banner {
    font-size: 12px;
    padding: 10px 12px;
  }

  /* TOOLBAR — search & status sebaris, tanggal turun ke baris baru & full width */
  .toolbar {
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1 1 100%;
    order: 1;
  }

  .select {
    flex: 1 1 100%;
    order: 2;
    min-width: 0;
  }

  .date-group {
    flex: 1 1 100%;
    order: 3;
    width: 100%;
  }

  .date-input {
    flex: 1;
    min-width: 0;
  }

  /* TABLE */
  .table-wrap {
    border-radius: 10px;
    overflow-x: auto;
    overflow-y: hidden;
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
    min-width: 1100px;
    font-size: 12px;
  }

  th,
  td {
    padding: 10px 12px;
  }

  /* Peminjam */
  th:nth-child(2),
  td:nth-child(2) {
    min-width: 170px;
  }

  /* Buku */
  th:nth-child(3),
  td:nth-child(3) {
    min-width: 200px;
  }

  /* Tanggal */
  th:nth-child(4),
  td:nth-child(4),
  th:nth-child(5),
  td:nth-child(5),
  th:nth-child(6),
  td:nth-child(6) {
    min-width: 120px;
  }

  /* Status */
  th:nth-child(7),
  td:nth-child(7) {
    min-width: 110px;
  }

  /* Keterlambatan */
  th:nth-child(8),
  td:nth-child(8) {
    min-width: 110px;
  }

  /* Denda */
  th:nth-child(9),
  td:nth-child(9) {
    min-width: 100px;
  }

  /* Aksi */
  th:nth-child(10),
  td:nth-child(10) {
    min-width: 130px;
  }

  .detail-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  .badge {
    padding: 4px 9px;
    font-size: 11px;
  }

  .sub-text {
    font-size: 10px;
  }

  /* FOOTER */
  .table-footer {
    margin-top: 12px;
    font-size: 11px;
  }
}
</style>