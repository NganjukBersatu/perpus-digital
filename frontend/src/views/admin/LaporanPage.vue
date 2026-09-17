<script setup>
import { ref, onMounted } from 'vue'
import { useInfoPerpustakaan } from '@/composables/useInfoPerpustakaan'

const API_URL = 'http://localhost:3000/api/laporan'

const hariIni = new Date().toISOString().slice(0, 10)
const awalBulan = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

const dari = ref(awalBulan)
const sampai = ref(hariIni)
const isLoading = ref(false)
const errorMessage = ref('')
const ringkasan = ref(null)
const dataLaporan = ref([])
const sudahDicari = ref(false)

function formatTanggal(tgl) {
  if (!tgl) return '-'
  return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRupiah(angka) {
  return `Rp${(angka || 0).toLocaleString('id-ID')}`
}

async function generateLaporan() {
  if (!dari.value || !sampai.value) {
    errorMessage.value = 'Pilih rentang tanggal terlebih dahulu'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`${API_URL}?dari=${dari.value}&sampai=${sampai.value}`)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Gagal memuat laporan')

    ringkasan.value = json.ringkasan
    dataLaporan.value = json.data
    sudahDicari.value = true
  } catch (err) {
    errorMessage.value = err.message || 'Gagal memuat laporan. Pastikan backend aktif.'
  } finally {
    isLoading.value = false
  }
}

function escapeCsv(nilai) {
  const teks = String(nilai ?? '')
  if (/[",\n;]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`
  }
  return teks
}

function unduhCsv() {
  if (!ringkasan.value) return

  // ---- Ambil info perpustakaan dari composable ----
  const perpus = infoPerpus.value || {}

  const namaPerpustakaan = perpus.namaPerpustakaan || 'Perpustakaan'
  const namaSekolah = perpus.namaSekolah || ''
  const alamat = perpus.alamat || ''
  const kontak = [
    perpus.telepon ? `Telp: ${perpus.telepon}` : '',
    perpus.email ? `Email: ${perpus.email}` : ''
  ].filter(Boolean).join(' | ')
  const kepala = perpus.kepalaPerpustakaan || ''
  const tahunAjaran = perpus.tahunAjaran || ''

  // Baris kosong 7 kolom (agar konsisten dengan jumlah kolom tabel)
  const KOSONG = ['', '', '', '', '', '', '']

  const baris = [
    // ===== KOP =====
    [namaPerpustakaan, '', '', '', '', '', ''],
    [namaSekolah, '', '', '', '', '', ''],
    [alamat, '', '', '', '', '', ''],
    [kontak, '', '', '', '', '', ''],
    KOSONG,

    // ===== JUDUL LAPORAN =====
    ['LAPORAN PEMINJAMAN PERPUSTAKAAN', '', '', '', '', '', ''],
    [`Periode: ${formatTanggal(dari.value)} — ${formatTanggal(sampai.value)}`, '', '', '', '', '', ''],
    KOSONG,

    // ===== RINGKASAN =====
    ['RINGKASAN', '', '', '', '', '', ''],
    ['Total Peminjaman', ringkasan.value.totalPeminjaman, '', '', '', '', ''],
    ['Total Pengembalian', ringkasan.value.totalPengembalian, '', '', '', '', ''],
    ['Total Terlambat', ringkasan.value.totalTerlambat, '', '', '', '', ''],
    ['Total Denda (Rp)', ringkasan.value.totalDenda, '', '', '', '', ''],
    KOSONG,

    // ===== TABEL DETAIL =====
    ['Nama', 'Kelas', 'Judul Buku', 'Tanggal Pinjam', 'Tanggal Kembali', 'Dikembalikan', 'Denda (Rp)'],
    ...dataLaporan.value.map((item) => [
      item.nama,
      item.kelas || '-',
      item.judul,
      formatTanggal(item.tanggalPinjam),
      formatTanggal(item.tanggalKembali),
      formatTanggal(item.tanggalDikembalikan),
      item.denda || 0
    ]),

    // ===== TANDA TANGAN =====
    KOSONG,
    KOSONG,
    ['', '', '', '', '', '', `Kertosono, ${formatTanggal(sampai.value)}`],
    ['', '', '', '', '', '', 'Kepala Perpustakaan'],
    KOSONG,
    KOSONG,
    KOSONG,
    ['', '', '', '', '', '', kepala || '......................'],
    ['', '', '', '', '', '', tahunAjaran ? `T.A. ${tahunAjaran}` : '']
  ]

  const isi = baris
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n')

  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-perpustakaan-${dari.value}_sampai_${sampai.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const { info: infoPerpus, muatInfo } = useInfoPerpustakaan()

onMounted(() => {
  muatInfo()
})
</script>

<template>
  <div class="page">
    <div class="header no-print">
      <div>
        <h1>Laporan</h1>
        <p class="subtitle">Rekap peminjaman, pengembalian, dan denda dalam periode tertentu.</p>
      </div>
    </div>

    <div v-if="errorMessage" class="banner error no-print">⚠️ {{ errorMessage }}</div>

    <div class="toolbar no-print">
      <label class="field">
        <span>Dari tanggal</span>
        <input type="date" v-model="dari" />
      </label>
      <label class="field">
        <span>Sampai tanggal</span>
        <input type="date" v-model="sampai" />
      </label>
      <button class="btn-primary" @click="generateLaporan" :disabled="isLoading">
        {{ isLoading ? 'Memuat...' : 'Tampilkan Laporan' }}
      </button>
      <button v-if="sudahDicari" class="btn-secondary" @click="unduhCsv">
        Unduh CSV
      </button>
    </div>

    <div v-if="sudahDicari" class="report-area">
      <div class="kop-laporan">
        <h2 class="kop-nama-perpus">{{ infoPerpus.namaPerpustakaan }}</h2>
        <p v-if="infoPerpus.namaSekolah" class="kop-nama-sekolah">{{ infoPerpus.namaSekolah }}</p>
        <p v-if="infoPerpus.alamat" class="kop-alamat">{{ infoPerpus.alamat }}</p>
        <p class="kop-kontak">
          <span v-if="infoPerpus.telepon">Telp: {{ infoPerpus.telepon }}</span>
          <span v-if="infoPerpus.email"> • Email: {{ infoPerpus.email }}</span>
        </p>
        <hr class="kop-garis" />
      </div>
      <div class="report-title">
        <h2>Laporan Perpustakaan</h2>
        <p>Periode: {{ formatTanggal(dari) }} — {{ formatTanggal(sampai) }}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Peminjaman</span>
          <strong>{{ ringkasan.totalPeminjaman }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Pengembalian</span>
          <strong>{{ ringkasan.totalPengembalian }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Terlambat</span>
          <strong>{{ ringkasan.totalTerlambat }}</strong>
        </div>
        <div class="summary-card">
          <span>Total Denda</span>
          <strong>{{ formatRupiah(ringkasan.totalDenda) }}</strong>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Judul Buku</th>
              <th>Tgl Pinjam</th>
              <th>Tgl Kembali</th>
              <th>Dikembalikan</th>
              <th>Denda</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dataLaporan" :key="item.id">
              <td>{{ item.nama }}</td>
              <td>{{ item.kelas || '-' }}</td>
              <td>{{ item.judul }}</td>
              <td>{{ formatTanggal(item.tanggalPinjam) }}</td>
              <td>{{ formatTanggal(item.tanggalKembali) }}</td>
              <td>{{ formatTanggal(item.tanggalDikembalikan) }}</td>
              <td>{{ formatRupiah(item.denda) }}</td>
            </tr>
            <tr v-if="dataLaporan.length === 0">
              <td colspan="7" class="empty">Tidak ada data pada periode ini.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ttd-laporan">
        <div class="ttd-kanan">
          <p>{{ infoPerpus.alamat ? '' : '' }}</p>
          <p>Kertosono, {{ formatTanggal(sampai) }}</p>
          <p>Kepala Perpustakaan</p>
          <div class="ttd-space"></div>
          <p class="ttd-nama">{{ infoPerpus.kepalaPerpustakaan || '......................' }}</p>
          <p v-if="infoPerpus.tahunAjaran" class="ttd-ta">T.A. {{ infoPerpus.tahunAjaran }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px; background: #f8f9fb; min-height: 100vh; font-family: sans-serif; }
.header { margin-bottom: 20px; }
.header h1 { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; }
.subtitle { margin: 6px 0 0; font-size: 13px; color: #6b7280; }

.banner { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.banner.error { background: #fee2e2; color: #b91c1c; }

.toolbar {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field span { font-size: 12px; color: #6b7280; font-weight: 600; }
.field input {
  border: 1px solid #e3e9f2; border-radius: 8px; padding: 8px 10px; font-size: 13px;
}

.btn-primary {
  background: #5b4dff; color: #fff; border: 0; border-radius: 8px;
  padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: #fff; color: #374151; border: 1px solid #e3e9f2; border-radius: 8px;
  padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
}

.report-area { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.report-title { margin-bottom: 20px; text-align: center; }
.report-title h2 { margin: 0 0 4px; font-size: 18px; color: #111827; }
.report-title p { margin: 0; font-size: 13px; color: #6b7280; }

.summary-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;
}
.summary-card {
  background: #f9fafb; border-radius: 10px; padding: 14px; text-align: center;
}
.summary-card span { display: block; font-size: 11px; color: #6b7280; margin-bottom: 6px; }
.summary-card strong { font-size: 18px; color: #111827; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; color: #374151; }
thead th { font-size: 11px; font-weight: 600; color: #6b7280; background: #fafafa; }
.empty { text-align: center; color: #9ca3af; padding: 24px; }

.kop-laporan {
  text-align: center;
  margin-bottom: 20px;
}

.kop-nama-perpus {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.kop-nama-sekolah {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.kop-alamat,
.kop-kontak {
  margin: 2px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.kop-garis {
  margin: 14px 0 0;
  border: none;
  border-top: 2px solid #111827;
}

.ttd-laporan {
  display: flex;
  justify-content: flex-end;
  margin-top: 36px;
}

.ttd-kanan {
  text-align: center;
  font-size: 13px;
  color: #374151;
}

.ttd-space {
  height: 60px;
}

.ttd-nama {
  font-weight: 700;
  text-decoration: underline;
  margin: 0;
}

.ttd-ta {
  font-size: 12px;
  color: #6b7280;
  margin: 2px 0 0;
}

@media (max-width: 700px) {
  .page {
    padding: 14px;
  }

  .toolbar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: end;
    gap: 10px;
  }

  .field {
    min-width: 0;
    width: 100%;
  }

  .field input {
    width: 100%;
    box-sizing: border-box;
  }

  .btn-primary,
  .btn-secondary {
    grid-column: 1 / -1;
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media print {
  .no-print { display: none !important; }
  .page { background: #fff; padding: 0; }
  .report-area { box-shadow: none; padding: 0; }
}
</style>