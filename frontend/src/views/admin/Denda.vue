<script setup>
import { ref, onMounted, watch } from 'vue'

const daftar = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const searchQuery = ref('')
const statusFilter = ref('Semua')
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

async function tandaiDibayar(item) {
  if (
    !confirm(
      `Tandai denda ${formatRupiah(item.denda)} dari "${item.namaPeminjam}" sebagai sudah dibayar?`
    )
  ) {
    return
  }

  try {
    const res = await fetch(
      `http://localhost:3000/api/denda/${item.id}/bayar`,
      {
        method: 'PATCH',
      }
    )

    if (!res.ok) {
      throw new Error('Gagal menandai pembayaran')
    }

    await muatData()
  } catch (err) {
    console.error(err)
    alert('Gagal menandai denda sebagai dibayar. Coba lagi.')
  }
}

watch(statusFilter, muatData)
onMounted(muatData)
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

      <select
        v-model="statusFilter"
        class="select"
      >
        <option value="Semua">
          Semua Status
        </option>

        <option value="Belum Dibayar">
          Belum Dibayar
        </option>

        <option value="Sudah Dibayar">
          Sudah Dibayar
        </option>
      </select>

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
                @click="tandaiDibayar(item)"
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

/* TABLE */
.table-wrap {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
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
</style>