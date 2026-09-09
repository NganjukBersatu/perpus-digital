<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const summary = ref({ totalDikembalikan: 0, hariIni: 0, tepatWaktu: 0, terlambat: 0 })
const data = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(5)
const search = ref('')
const status = ref('Semua')
const filterDari = ref('')
const filterSampai = ref('')
const showDateFilter = ref(false)
const totalPages = ref(1)
const showExportModal = ref(false)
const exportFormat = ref('xlsx')
const exporting = ref(false)
const showDetailTotal = ref(false)
const showDetailHariIni = ref(false)
const dataHariIni = ref([])
const loadingHariIni = ref(false)
const showDetailTepatWaktu = ref(false)
const showDetailTerlambat = ref(false)
const dataTepatWaktu = ref([])
const dataTerlambat = ref([])
const loadingTepatWaktu = ref(false)
const loadingTerlambat = ref(false)

const tarifDendaPerHari = 10000 /* denda menyesuaikan */ 

const fetchSummary = async () => {
  const res = await axios.get('http://localhost:3000/api/pengembalian/summary')
  summary.value = res.data
}

const fetchData = async () => {
  const res = await axios.get('http://localhost:3000/api/pengembalian', {
    params: {
      search: search.value,
      status: status.value,
      page: page.value,
      limit: limit.value,
      start: filterDari.value || undefined,
      end: filterSampai.value || undefined,
    },
  })
  data.value = res.data.data
  total.value = res.data.total
  totalPages.value = Math.max(1, Math.ceil(total.value / limit.value))
}

const formatPersen = (jumlah) => {
  const totalBuku = summary.value.totalDikembalikan
  if (!totalBuku) return '0'
  const nilai = (jumlah / totalBuku) * 100
  return nilai.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

const persenTepatWaktu = () => formatPersen(summary.value.tepatWaktu)
const persenTerlambat = () => formatPersen(summary.value.terlambat)

const formatTanggal = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const initial = (nama) => nama ? nama.charAt(0).toUpperCase() : '?'

const formatRangeShort = (d) => {
  const dt = new Date(d)
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const year = dt.getFullYear()
  return `${day}/${month}/${year}`
}

const bukaExportModal = () => {
  exportFormat.value = 'xlsx'
  showExportModal.value = true
}

const tutupExportModal = () => {
  if (exporting.value) return
  showExportModal.value = false
}

const kolomExport = [
  'No',
  'Peminjam',
  'Kelas',
  'Buku',
  'Penulis',
  'Tanggal Pinjam',
  'Batas Kembali',
  'Tanggal Kembali',
  'Status',
  'Keterlambatan',
  'Denda',
]

const ambilSemuaDataExport = async () => {
  const res = await axios.get('http://localhost:3000/api/pengembalian', {
    params: {
      search: search.value,
      status: status.value,
      page: 1,
      limit: Math.max(total.value, 1),
      start: filterDari.value || undefined,
      end: filterSampai.value || undefined,
    },
  })
  return res.data.data || []
}

const barisExport = (rows) =>
  rows.map((row, i) => [
    i + 1,
    row.namaPeminjam || '-',
    row.kelasPeminjam || '-',
    row.judulBuku || '-',
    row.penulisBuku || '-',
    formatTanggal(row.tanggalPinjam),
    formatTanggal(row.batasKembali),
    formatTanggal(row.tanggalDikembalikan),
    row.status || '-',
    row.keterlambatan || '-',
    `Rp${(row.denda || 0).toLocaleString('id-ID')}`,
  ])

const namaFileExport = (ext) => {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `pengembalian_${y}-${m}-${d}.${ext}`
}

const unduhBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const exportCSV = (rows) => {
  const isi = [kolomExport, ...barisExport(rows)]
    .map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    )
    .join('\n')
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8;' })
  unduhBlob(blob, namaFileExport('csv'))
}

const exportExcel = (rows) => {
  const ws = XLSX.utils.aoa_to_sheet([kolomExport, ...barisExport(rows)])
  ws['!cols'] = kolomExport.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pengembalian')
  XLSX.writeFile(wb, namaFileExport('xlsx'))
}

const exportPDF = (rows) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Data Pengembalian', 14, 14)
  doc.setFontSize(9)
  doc.text(`Dicetak: ${tanggalHariIni.value}  |  ${rows.length} data`, 14, 20)
  autoTable(doc, {
    startY: 24,
    head: [kolomExport],
    body: barisExport(rows),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
  })
  doc.save(namaFileExport('pdf'))
}

const jalankanExport = async () => {
  if (total.value === 0) {
    alert('Tidak ada data pengembalian untuk diekspor.')
    return
  }
  exporting.value = true
  try {
    const rows = await ambilSemuaDataExport()
    if (!rows.length) {
      alert('Tidak ada data pengembalian untuk diekspor.')
      return
    }
    if (exportFormat.value === 'csv') exportCSV(rows)
    else if (exportFormat.value === 'pdf') exportPDF(rows)
    else exportExcel(rows)
    showExportModal.value = false
  } catch (e) {
    console.error(e)
    alert('Gagal mengekspor data. Periksa koneksi API.')
  } finally {
    exporting.value = false
  }
}

const isTanggalHariIni = (d) => {
  if (!d) return false
  const tgl = new Date(d)
  const now = new Date()
  return (
    tgl.getFullYear() === now.getFullYear() &&
    tgl.getMonth() === now.getMonth() &&
    tgl.getDate() === now.getDate()
  )
}

const formatRp = (n) => `Rp${(n || 0).toLocaleString('id-ID')}`

const bukaDetailTotal = () => {
  showDetailTotal.value = true
}

const tutupDetailTotal = () => {
  showDetailTotal.value = false
}

const bukaDetailHariIni = async () => {
  showDetailHariIni.value = true
  loadingHariIni.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/pengembalian', {
      params: {
        search: '',
        status: 'Semua',
        page: 1,
        limit: Math.max(summary.value.totalDikembalikan || 0, total.value || 0, 1),
      },
    })
    const rows = res.data.data || []
    dataHariIni.value = rows.filter((row) => isTanggalHariIni(row.tanggalDikembalikan))
  } catch (e) {
    console.error(e)
    dataHariIni.value = []
    alert('Gagal memuat data pengembalian hari ini.')
  } finally {
    loadingHariIni.value = false
  }
}

const tutupDetailHariIni = () => {
  showDetailHariIni.value = false
}

const ambilSemuaPengembalian = async () => {
  const res = await axios.get('http://localhost:3000/api/pengembalian', {
    params: {
      search: '',
      status: 'Semua',
      page: 1,
      limit: Math.max(summary.value.totalDikembalikan || 0, total.value || 0, 1),
    },
  })
  return res.data.data || []
}

const rentangPinjam = (row) => {
  const awal = row.tanggalPinjam ? formatRangeShort(row.tanggalPinjam) : '-'
  const akhir = row.tanggalDikembalikan ? formatRangeShort(row.tanggalDikembalikan) : '-'
  return `${awal}-${akhir}`
}

const parseHariTerlambat = (row) => {
  if (typeof row.hariTerlambat === 'number') return row.hariTerlambat
  if (typeof row.jumlahHariTerlambat === 'number') return row.jumlahHariTerlambat
  const teks = String(row.keterlambatan || '')
  const m = teks.match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

const hitungDenda = (row) => {
  if (row.denda != null && row.denda !== '') return Number(row.denda) || 0
  return parseHariTerlambat(row) * tarifDendaPerHari
}

const bukaDetailTepatWaktu = async () => {
  showDetailTepatWaktu.value = true
  loadingTepatWaktu.value = true
  try {
    const rows = await ambilSemuaPengembalian()
    dataTepatWaktu.value = rows.filter((row) => row.status === 'Tepat Waktu')
  } catch (e) {
    console.error(e)
    dataTepatWaktu.value = []
    alert('Gagal memuat data pengembalian tepat waktu.')
  } finally {
    loadingTepatWaktu.value = false
  }
}

const tutupDetailTepatWaktu = () => {
  showDetailTepatWaktu.value = false
}

const bukaDetailTerlambat = async () => {
  showDetailTerlambat.value = true
  loadingTerlambat.value = true
  try {
    const rows = await ambilSemuaPengembalian()
    dataTerlambat.value = rows.filter((row) => row.status === 'Terlambat')
  } catch (e) {
    console.error(e)
    dataTerlambat.value = []
    alert('Gagal memuat data pengembalian terlambat.')
  } finally {
    loadingTerlambat.value = false
  }
}

const tutupDetailTerlambat = () => {
  showDetailTerlambat.value = false
}

const tanggalHariIni = computed(() => {
  return new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const labelRentangFilter = computed(() => {
  if (!filterDari.value && !filterSampai.value) return 'Semua tanggal'
  const awal = filterDari.value ? formatRangeShort(filterDari.value) : '...'
  const akhir = filterSampai.value ? formatRangeShort(filterSampai.value) : '...'
  return `${awal} - ${akhir}`
})

const terapkanFilterTanggal = () => {
  page.value = 1
  showDateFilter.value = false
  fetchData()
}

const resetFilterTanggal = () => {
  filterDari.value = ''
  filterSampai.value = ''
  page.value = 1
  showDateFilter.value = false
  fetchData()
}

onMounted(() => { fetchSummary(); fetchData() })
watch([search, status, limit], () => { page.value = 1; fetchData() })
watch(page, fetchData)
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Pengembalian</h1>
        <p class="subtitle">Daftar buku yang telah dikembalikan.</p>
      </div>
      <button class="btn-outline" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {{ tanggalHariIni }}
      </button>
    </div>

    <div class="cards">
      <div class="card">
        <div class="icon green">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <p class="label">Total Dikembalikan</p>
        <p class="value">{{ summary.totalDikembalikan }}</p>
        <p class="unit">buku</p>
        <button class="link" type="button" @click="bukaDetailTotal">
          Lihat detail →
        </button>
      </div>

      <div class="card">
        <div class="icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <p class="label">Hari Ini</p>
        <p class="value">{{ summary.hariIni }}</p>
        <p class="unit">buku</p>
        <button class="link" type="button" @click="bukaDetailHariIni">
          Lihat detail →
        </button>
      </div>

      <div class="card">
        <div class="icon orange">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <p class="label">Tepat Waktu</p>
        <p class="value">{{ summary.tepatWaktu }}</p>
        <p class="unit">buku ({{ persenTepatWaktu() }}%)</p>
        <button class="link" type="button" @click="bukaDetailTepatWaktu">
          Lihat detail →
        </button>
      </div>
    
      <div class="card">
        <div class="icon red">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="13" r="8"/>
            <path d="M12 9v4l2 2"/>
            <path d="M5 3 3 5"/>
            <path d="M22 5l-2-2"/>
            <path d="M6.5 3.5 5 5"/>
          </svg>
        </div>
        <p class="label">Terlambat</p>
        <p class="value">{{ summary.terlambat }}</p>
        <p class="unit">buku ({{ persenTerlambat() }}%)</p>
        <button class="link" type="button" @click="bukaDetailTerlambat">
          Lihat detail →
        </button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="search" placeholder="Cari nama peminjam, buku, atau ISBN..." class="search" />
      <select v-model="status" class="select">
        <option value="Semua">Semua Status</option>
        <option value="Tepat Waktu">Tepat Waktu</option>
        <option value="Terlambat">Terlambat</option>
      </select>
      <div class="date-filter-wrap">
        <button class="btn-outline" type="button" @click="showDateFilter = !showDateFilter">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {{ labelRentangFilter }}
        </button>

        <div v-if="showDateFilter" class="date-popover">
          <label>
            Dari
            <input v-model="filterDari" type="date" />
          </label>
          <label>
            Sampai
            <input v-model="filterSampai" type="date" />
          </label>
          <div class="date-popover-actions">
            <button class="btn-outline" type="button" @click="resetFilterTanggal">Reset</button>
            <button class="btn-primary" type="button" @click="terapkanFilterTanggal">Terapkan</button>
          </div>
        </div>
      </div>
      <button class="btn-primary" type="button" @click="bukaExportModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12"/>
          <path d="m8 11 4 4 4-4"/>
          <path d="M5 19h14"/>
        </svg>
        Export
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th><th>Peminjam</th><th>Buku</th><th>Tanggal Pinjam</th>
            <th>Batas Kembali</th><th>Tanggal Kembali</th><th>Status</th>
            <th>Keterlambatan</th><th>Denda</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in data" :key="row.id">
            <td>{{ (page - 1) * limit + i + 1 }}</td>
            <td>
              <div class="peminjam">
                <div class="avatar">{{ initial(row.namaPeminjam) }}</div>
                <div>
                  <p class="nama">{{ row.namaPeminjam }}</p>
                  <p class="kelas">{{ row.kelasPeminjam }}</p>
                </div>
              </div>
            </td>
            <td>
              <p class="nama">{{ row.judulBuku }}</p>
              <p class="kelas">{{ row.penulisBuku }}</p>
            </td>
            <td>{{ formatTanggal(row.tanggalPinjam) }}</td>
            <td>{{ formatTanggal(row.batasKembali) }}</td>
            <td>{{ formatTanggal(row.tanggalDikembalikan) }}</td>
            <td>
              <span :class="['badge', row.status === 'Terlambat' ? 'badge-red' : 'badge-green']">
                {{ row.status }}
              </span>
            </td>
            <td>{{ row.keterlambatan }}</td>
            <td>Rp{{ (row.denda || 0).toLocaleString('id-ID') }}</td>
            <td>
              <button class="btn-link" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M8 13h8"/>
                  <path d="M8 17h8"/>
                </svg>
                Detail
              </button>
            </td>
          </tr>
          <tr v-if="data.length === 0">
            <td colspan="10" class="empty">Belum ada data pengembalian</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <span>Menampilkan {{ data.length }} dari {{ total }} data</span>
        <div class="pagination">
          <button :disabled="page === 1" @click="page--" type="button" class="page-nav">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button
            v-for="p in Math.min(totalPages, 3)" :key="p"
            :class="{ active: page === p }" @click="page = p"
          >{{ p }}</button>
          <span v-if="totalPages > 3">...</span>
          <button :disabled="page === totalPages" @click="page++" type="button" class="page-nav">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
        <select v-model="limit" class="select">
          <option :value="5">5 / halaman</option>
          <option :value="10">10 / halaman</option>
          <option :value="20">20 / halaman</option>
        </select>
      </div>
    </div>

    <div
      v-if="showExportModal"
      class="modal-overlay"
      @click.self="tutupExportModal"
    >
      <div class="modal-export" role="dialog" aria-labelledby="judul-export">
        <div class="modal-header">
          <h2 id="judul-export">Export Data Pengembalian</h2>
          <button class="modal-close" type="button" @click="tutupExportModal">×</button>
        </div>

        <div class="modal-body">
          <p class="modal-label">Data yang akan diekspor:</p>
          <p class="modal-count">{{ total }} data pengembalian</p>

          <p class="modal-label">Format</p>
          <label class="radio">
            <input type="radio" v-model="exportFormat" value="xlsx" />
            Excel (.xlsx)
          </label>
          <label class="radio">
            <input type="radio" v-model="exportFormat" value="csv" />
            CSV (.csv)
          </label>
          <label class="radio">
            <input type="radio" v-model="exportFormat" value="pdf" />
            PDF (.pdf)
          </label>
        </div>

        <div class="modal-footer">
          <button class="btn-outline" type="button" @click="tutupExportModal">
            Batal
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="exporting || total === 0"
            @click="jalankanExport"
          >
            {{ exporting ? 'Mengekspor...' : 'Export' }}
          </button>
        </div>
      </div>
    </div>

    <!-- (1) TOTAL PENGEMBALIAN -->
    <div
      v-if="showDetailTotal"
      class="modal-overlay"
      @click.self="tutupDetailTotal"
    >
      <div class="modal-export" role="dialog">
        <div class="modal-header">
          <h2>TOTAL PENGEMBALIAN</h2>
          <button class="modal-close" type="button" @click="tutupDetailTotal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-count">
            {{ summary.totalDikembalikan }} buku telah dikembalikan
          </p>
          <div class="stat-row">
            <span>Tepat Waktu</span>
            <strong>{{ summary.tepatWaktu }}</strong>
          </div>
          <div class="stat-row">
            <span>Terlambat</span>
            <strong>{{ summary.terlambat }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- (2) PENGEMBALIAN HARI INI -->
    <div
      v-if="showDetailHariIni"
      class="modal-overlay"
      @click.self="tutupDetailHariIni"
    >
      <div class="modal-hari-ini" role="dialog">
        <div class="modal-header">
          <div>
            <h2>Pengembalian Hari Ini</h2>
            <p class="subtitle">{{ tanggalHariIni }} · {{ dataHariIni.length }} buku</p>
          </div>
          <button class="modal-close" type="button" @click="tutupDetailHariIni">×</button>
        </div>

        <div class="modal-body modal-body-scroll">
          <p v-if="loadingHariIni" class="empty">Memuat data...</p>
          <p v-else-if="dataHariIni.length === 0" class="empty">
            Belum ada buku yang dikembalikan hari ini.
          </p>

          <article
            v-for="row in dataHariIni"
            v-else
            :key="row.id"
            class="hari-ini-item"
          >
            <div class="hari-ini-top">
              <div>
                <p class="nama">{{ row.judulBuku }}</p>
                <p class="kelas">{{ row.penulisBuku }}</p>
              </div>
              <span :class="['badge', row.status === 'Terlambat' ? 'badge-red' : 'badge-green']">
                {{ row.status }}
              </span>
            </div>

            <div class="hari-ini-grid">
              <div>
                <p class="mini-label">Peminjam</p>
                <p>{{ row.namaPeminjam }}</p>
              </div>
              <div>
                <p class="mini-label">Kelas</p>
                <p>{{ row.kelasPeminjam || '-' }}</p>
              </div>
              <div>
                <p class="mini-label">Tanggal Pinjam</p>
                <p>{{ formatTanggal(row.tanggalPinjam) }}</p>
              </div>
              <div>
                <p class="mini-label">Batas Kembali</p>
                <p>{{ formatTanggal(row.batasKembali) }}</p>
              </div>
              <div>
                <p class="mini-label">Dikembalikan</p>
                <p>{{ formatTanggal(row.tanggalDikembalikan) }}</p>
              </div>
              <div>
                <p class="mini-label">Keterlambatan</p>
                <p>{{ row.keterlambatan || '-' }}</p>
              </div>
              <div>
                <p class="mini-label">Denda</p>
                <p>{{ formatRp(row.denda) }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- (3) TEPAT WAKTU -->
    <div
      v-if="showDetailTepatWaktu"
      class="modal-overlay"
      @click.self="tutupDetailTepatWaktu"
    >
      <div class="modal-hari-ini" role="dialog">
        <div class="modal-header">
          <div>
            <h2>Pengembalian Tepat Waktu</h2>
            <p class="subtitle">{{ dataTepatWaktu.length }} data telah ditemukan</p>
          </div>
          <button class="modal-close" type="button" @click="tutupDetailTepatWaktu">×</button>
        </div>

        <div class="modal-body modal-body-scroll">
          <p v-if="loadingTepatWaktu" class="empty">Memuat data...</p>
          <p v-else-if="dataTepatWaktu.length === 0" class="empty">
            Belum ada pengembalian tepat waktu.
          </p>

          <article
            v-for="row in dataTepatWaktu"
            v-else
            :key="row.id"
            class="hari-ini-item"
          >
            <p class="nama">{{ row.namaPeminjam }}</p>
            <p class="kelas">{{ row.kelasPeminjam || '-' }}</p>
            <p class="judul-buku">{{ row.judulBuku }}</p>
            <p class="kelas">{{ rentangPinjam(row) }}</p>
            <p class="denda-teks">Denda : {{ formatRp(0) }}</p>
          </article>
        </div>
      </div>
    </div>

    <!-- (4) TERLAMBAT -->
    <div
      v-if="showDetailTerlambat"
      class="modal-overlay"
      @click.self="tutupDetailTerlambat"
    >
      <div class="modal-hari-ini" role="dialog">
        <div class="modal-header">
          <div>
            <h2>Pengembalian Terlambat</h2>
            <p class="subtitle">{{ dataTerlambat.length }} data telah ditemukan</p>
          </div>
          <button class="modal-close" type="button" @click="tutupDetailTerlambat">×</button>
        </div>

        <div class="modal-body modal-body-scroll">
          <p v-if="loadingTerlambat" class="empty">Memuat data...</p>
          <p v-else-if="dataTerlambat.length === 0" class="empty">
            Tidak ada data pengembalian terlambat.
          </p>

          <div v-else class="table-wrap table-in-modal">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kelas</th>
                  <th>Judul</th>
                  <th>Keterlambatan</th>
                  <th>Denda</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dataTerlambat" :key="row.id">
                  <td>{{ row.namaPeminjam }}</td>
                  <td>{{ row.kelasPeminjam || '-' }}</td>
                  <td>{{ row.judulBuku }}</td>
                  <td>{{ parseHariTerlambat(row) }} hari</td>
                  <td>{{ formatRp(hitungDenda(row)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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

.subtitle { 
    font-size: 13px; 
    color: #9ca3af; 
    margin: 2px 0 0; 
}

.btn-outline { 
    background: #fff; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 12px; 
    font-size: 13px; 
    color: #4b5563; 
    cursor: pointer; 
    display: inline-flex; 
    align-items: center; 
    gap: 6px; 
}

.btn-outline svg { 
    flex-shrink: 0; 
}

.btn-primary { 
    background: #2563eb; 
    color: #fff; 
    border: none; 
    border-radius: 8px; 
    padding: 8px 14px; 
    font-size: 13px; 
    cursor: pointer; 
}

.btn-link { 
  background: none; 
  border: none; 
  color: #2563eb; 
  font-size: 12px; 
  cursor: pointer; 
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cards { 
    display: grid; 
    grid-template-columns: repeat(4, 1fr); 
    gap: 16px; 
    margin-bottom: 20px; 
}

.card { 
    background: #fff; 
    border-radius: 12px; 
    padding: 16px; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); 
}

.icon { 
    width: 36px; 
    height: 36px; 
    border-radius: 8px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    margin-bottom: 10px; 
    font-size: 16px; 
}

.icon.green { 
    background: #d1fae5; 
}

.icon.blue { 
    background: #dbeafe; 
}

.icon.orange { 
    background: #ffedd5; 
}

.icon.red { 
    background: #fee2e2; 
}

.label { 
    font-size: 12px; 
    color: #9ca3af; 
    margin: 0; 
}

.value { 
    font-size: 24px; 
    font-weight: 700; 
    color: #1f2937; 
    margin: 2px 0; 
}

.unit { 
    font-size: 12px; 
    color: #9ca3af; 
    margin: 0 0 8px; 
}

.link { 
  font-size: 12px; 
  color: #2563eb; 
  text-decoration: none; 
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
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

.date-filter-wrap {
  position: relative;
}

.date-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  width: 240px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-popover label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.date-popover input[type="date"] {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.date-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.search { 
    flex: 1; 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 12px; 
    font-size: 13px; 
}

.select { 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 8px 10px; 
    font-size: 13px; 
}

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

thead { 
    background: #f9fafb; 
}

th { 
    text-align: left; 
    padding: 12px 16px; 
    color: #9ca3af; 
    font-weight: 500; 
    font-size: 12px; 
}

td { 
    padding: 12px 16px; 
    border-top: 1px solid #f3f4f6; 
    color: #374151; 
    vertical-align: middle; 
}

.peminjam { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
}

.avatar { 
    width: 28px; 
    height: 28px; 
    border-radius: 50%; 
    background: #dbeafe; 
    color: #2563eb; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 12px; 
    font-weight: 700; 
}

.nama { 
    font-weight: 500; 
    margin: 0; 
}

.kelas { 
    font-size: 12px; 
    color: #9ca3af; 
    margin: 0; 
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

.empty { 
    text-align: center; 
    color: #9ca3af; 
    padding: 24px; 
}

.footer { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 12px 16px; 
    border-top: 1px solid #f3f4f6; 
    font-size: 13px; 
    color: #6b7280; 
}

.pagination { 
    display: flex; 
    gap: 4px; 
}

.pagination button { 
    border: 1px solid #e5e7eb; 
    background: #fff; 
    border-radius: 6px; 
    padding: 4px 10px; 
    cursor: pointer; 
}

.pagination button.active { 
    background: #2563eb; 
    color: #fff; 
    border-color: #2563eb; 
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.page-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: default;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}

.modal-export {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
}

.modal-hari-ini {
  width: min(920px, 96vw);
  max-height: 85vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
}

.modal-body-scroll {
  overflow-y: auto;
  max-height: calc(85vh - 140px);
}

.hari-ini-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}

.hari-ini-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.hari-ini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 12px;
  font-size: 13px;
  color: #374151;
}

.mini-label {
  margin: 0 0 2px;
  font-size: 11px;
  color: #9ca3af;
}

.hari-ini-grid p {
  margin: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.modal-close {
  border: none;
  background: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 22px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 16px 20px 8px;
}

.modal-label {
  margin: 0 0 6px;
  font-size: 13px;
  color: #6b7280;
}

.modal-count {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.radio {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.judul-buku {
  margin: 6px 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.denda-teks {
  margin: 8px 0 0;
  font-size: 13px;
  color: #374151;
}

.table-in-modal {
  box-shadow: none;
  border: 1px solid #e5e7eb;
}
</style>