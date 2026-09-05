<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const now = new Date()

const hariNama = now.toLocaleDateString('id-ID', { weekday: 'long' })
const bulanNama = now.toLocaleDateString('id-ID', { month: 'long' })

const today = ref({
  hari: hariNama,
  tanggalAngka: now.getDate(),
  bulan: bulanNama,
  tahun: now.getFullYear()
})

const stats = ref([
  { label: 'Total Buku', value: 0, sub: 'Total koleksi buku', color: 'purple', icon: 'book', link: '/admin/data-buku' },
  { label: 'Anggota Aktif', value: 0, sub: 'Siswa & guru terdaftar', color: 'green', icon: 'users', link: '/admin/data-siswa' },
  { label: 'Buku Dipinjam', value: 0, sub: 'Sedang dipinjam', color: 'blue', icon: 'bookOpen', link: '/admin/data-peminjaman' },
  { label: 'Terlambat', value: 0, sub: 'Buku terlambat', color: 'orange', icon: 'clock', link: '/admin/data-peminjaman' }
])

const errorMessage = ref('')

const icons = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  bookOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
}

const totalDenda = ref('Rp350.000')

const rangeOptions = [
  { value: '1minggu', label: '1 Minggu Terakhir' },
  { value: '1bulan', label: '1 Bulan Terakhir' },
  { value: '3bulan', label: '3 Bulan Terakhir' },
  { value: '6bulan', label: '6 Bulan Terakhir' },
  { value: '1tahun', label: '1 Tahun Terakhir' }
]

const selectedRange = ref('6bulan')

const chartLabels = ref([])
const dipinjamSeries = ref([])
const dikembalikanSeries = ref([])
const totalDipinjam = ref('0')
const totalDikembalikan = ref('0')

const chartW = 380
const chartH = 130

function toPoints(series, max, w, h) {
  if (series.length === 0) return ''
  const stepX = series.length > 1 ? w / (series.length - 1) : 0
  return series
    .map((v, i) => `${i * stepX},${h - (max > 0 ? (v / max) * h : 0)}`)
    .join(' ')
}

const chartMax = computed(() => {
  const all = [...dipinjamSeries.value, ...dikembalikanSeries.value]
  return all.length > 0 ? Math.max(...all, 1) : 1
})

const dipinjamPoints = computed(() =>
  toPoints(dipinjamSeries.value, chartMax.value, chartW, chartH)
)
const dikembalikanPoints = computed(() =>
  toPoints(dikembalikanSeries.value, chartMax.value, chartW, chartH)
)

async function muatStatistikPeminjaman() {
  try {
    const res = await fetch(
      `http://localhost:3000/api/dashboard/statistik-peminjaman?range=${selectedRange.value}`
    )
    const data = await res.json()

    chartLabels.value = data.labels
    dipinjamSeries.value = data.dipinjam
    dikembalikanSeries.value = data.dikembalikan
    totalDipinjam.value = data.totalDipinjam
    totalDikembalikan.value = data.totalDikembalikan
  } catch (err) {
    console.error('Gagal mengambil statistik peminjaman', err)
  }
}

watch(selectedRange, muatStatistikPeminjaman)

const peminjamanTerbaru = ref([])

const bukuTerpopuler = ref([])

const filterStatus = ref('Semua Status')

const peminjamanBelumKembali = ref([])

const pengingat = ref([])

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/dashboard/stats')
    if (!res.ok) throw new Error('response not ok')
    const data = await res.json()

    stats.value[0].value = data.totalBuku
    stats.value[1].value = data.totalAnggota
    stats.value[2].value = data.bukuDipinjam
  } catch (err) {
    console.error('Gagal mengambil statistik dashboard', err)
    errorMessage.value = 'Gagal memuat data dari server. Pastikan backend aktif (node index.js).'
  }

  try {
    const res = await fetch('http://localhost:3000/api/dashboard/peminjaman-terbaru')
    peminjamanTerbaru.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil peminjaman terbaru', err)
  }

  try {
    const res = await fetch('http://localhost:3000/api/dashboard/peminjaman-belum-kembali')
    peminjamanBelumKembali.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil peminjaman belum kembali', err)
  }
})
</script>

<template>
  <div class="dash">

    <div v-if="errorMessage" class="error-banner">⚠️ {{ errorMessage }}</div>

    <div class="top-row">
      <div class="stat-cards">
        <div v-for="s in stats" :key="s.label" class="stat-card">
          <div class="stat-icon" :class="`icon-${s.color}`" v-html="icons[s.icon]"></div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-sub">{{ s.sub }}</div>
          <router-link :to="s.link" class="stat-link">Lihat detail →</router-link>
        </div>
      </div>

      <div class="calendar-card">
        <div class="calendar-top">{{ today.bulan }} {{ today.tahun }}</div>
        <div class="calendar-body">
          <div class="calendar-date">{{ today.tanggalAngka }}</div>
          <div class="calendar-day">{{ today.hari }}</div>
        </div>
      </div>
    </div>

    <div class="mid-row">

      <section class="card chart-card">
        <div class="card-title-row">
          <h2>Statistik Peminjaman</h2>
          <select class="mini-select">
            <option>6 Bulan Terakhir</option>
          </select>
        </div>

        <div class="legend">
          <span class="legend-item"><span class="dot dot-purple"></span> Dipinjam</span>
          <span class="legend-item"><span class="dot dot-green"></span> Dikembalikan</span>
        </div>

        <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="chart-svg" preserveAspectRatio="none">
          <polyline :points="dipinjamPoints" fill="none" stroke="#7c6fe8" stroke-width="2" />
          <polyline :points="dikembalikanPoints" fill="none" stroke="#18865b" stroke-width="2" />
        </svg>

        <div class="chart-labels">
          <span v-for="m in chartLabels" :key="m">{{ m }}</span>
        </div>

        <div class="chart-footer">
          <div class="chart-footer-item">
            <span>Total Dipinjam</span>
            <strong>{{ totalDipinjam }} buku</strong>
          </div>
          <div class="chart-footer-item">
            <span>Total Dikembalikan</span>
            <strong>{{ totalDikembalikan }} buku</strong>
          </div>
        </div>
      </section>

      <section class="card list-card">
        <div class="card-title-row">
          <h2>Peminjaman Terbaru</h2>
          <a href="#" class="link-small">Lihat semua</a>
        </div>

        <div class="peminjam-row" v-for="p in peminjamanTerbaru" :key="p.id">
          <div class="peminjam-info">
            <strong>{{ p.nama }}</strong>
            <span>{{ p.kelas }}</span>
          </div>
          <div class="peminjam-right">
            <span class="tgl">{{ p.tanggalPinjam }}</span>
            <span
              class="badge"
              :class="p.tanggalKembali ? 'badge-green' : 'badge-blue'"
            >
              {{ p.tanggalKembali ? 'Dikembalikan' : 'Dipinjam' }}
            </span>
          </div>
        </div>
      </section>

      <section class="card list-card">
        <div class="card-title-row">
          <h2>Buku Terpopuler</h2>
          <a href="#" class="link-small">Lihat semua</a>
        </div>

        <div class="buku-row" v-for="(b, i) in bukuTerpopuler" :key="b.judul">
          <span class="buku-rank">{{ i + 1 }}</span>
          <div class="buku-cover"></div>
          <div class="buku-info">
            <strong>{{ b.judul }}</strong>
            <span>Dipinjam {{ b.dipinjam }} kali</span>
          </div>
        </div>
      </section>

    </div>

    <div class="bottom-row">

      <section class="card table-card">
        <div class="card-title-row">
          <h2>Peminjaman Belum Kembali</h2>
          <div class="table-controls">
            <input type="text" placeholder="Cari peminjam atau buku..." class="search-input" />
            <select v-model="filterStatus" class="mini-select">
              <option>Semua Status</option>
              <option>Tepat Waktu</option>
              <option>Terlambat</option>
            </select>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Peminjam</th>
              <th>Buku</th>
              <th>Tanggal Pinjam</th>
              <th>Batas Kembali</th>
              <th>Sisa Hari</th>
              <th>Status</th>
              <th>Denda</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in peminjamanBelumKembali" :key="row.id">
              <td>{{ i + 1 }}</td>
              <td>
                <strong>{{ row.nama }}</strong><br />
                <span class="muted">{{ row.kelas }}</span>
              </td>
              <td>-</td>
              <td>{{ row.tanggalPinjam }}</td>
              <td>-</td>
              <td>-</td>
              <td>
                <span class="badge badge-blue">Dipinjam</span>
              </td>
              <td>-</td>
              <td><button class="detail-btn">Detail</button></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card reminder-card">
        <h2>Pengingat</h2>
        <div class="reminder-row" v-for="r in pengingat" :key="r.judul">
          <div class="reminder-info">
            <strong>{{ r.judul }}</strong>
            <span>{{ r.sub }}</span>
          </div>
          <span class="reminder-badge" :class="`badge-${r.color}`">{{ r.badge }}</span>
        </div>
      </section>

    </div>

  </div>
</template>

<style scoped>
.dash {
  padding: 24px;
  font-family: 'Segoe UI', sans-serif;
  color: #172b4d;
  background: #f4f6fb;
}

.dash * { 
    box-sizing: border-box; 
}

.top-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e3e9f2;
  border-radius: 12px;
  padding: 16px;
  position: relative;
}

.stat-icon { 
    width: 30px; 
    height: 30px; 
    border-radius: 8px; 
    margin-bottom: 10px; 
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.stat-icon :deep(svg) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.icon-purple { 
    background: #ede9fe;
    color: #7c3aed; 
}

.icon-green { 
    background: #d1fae5;
    color: #059669; 
}

.icon-blue { 
    background: #dbeafe;
    color: #2563eb; 
}

.icon-orange { 
    background: #fef3c7;
    color: #d97706; 
}

.stat-value { 
    font-size: 22px; 
    font-weight: 700; 
}

.stat-label { 
    font-size: 12px; 
    color: #374151; 
    font-weight: 600; 
    margin-top: 2px; 
}

.stat-sub { 
    font-size: 11px; 
    color: #9ca3af; 
    margin-top: 2px; 
}

.stat-link { 
    font-size: 11px; 
    color: #2864e8; 
    text-decoration: none; 
    display: inline-block; 
    margin-top: 8px; 
}

.calendar-card {
  background: #fff;
  border: 1px solid #e3e9f2;
  border-radius: 12px;
  overflow: hidden;
  min-width: 140px;
  display: flex;
  flex-direction: column;
}

.calendar-top {
  background: #ef4444;
  color: #fff;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
}

.calendar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 10px;
}

.calendar-date {
  font-size: 30px;
  font-weight: 700;
  color: #172b4d;
  line-height: 1;
}

.calendar-day {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  text-transform: capitalize;
}

.mid-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
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

.card-title-row h2 { 
    margin: 0; 
    font-size: 15px; 
}

.link-small { 
    font-size: 12px; 
    color: #2864e8; 
    text-decoration: none; 
}

.mini-select {
  font-size: 12px;
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  padding: 6px 8px;
  color: #6b7280;
  background: #fff;
}

.legend { 
    display: flex; 
    gap: 16px; 
    margin-bottom: 8px; 
    font-size: 12px; 
    color: #6b7280; 
}

.legend-item { 
    display: flex; 
    align-items: center; 
    gap: 6px; 
}

.dot { 
    width: 8px; 
    height: 8px; 
    border-radius: 50%; 
    display: inline-block; 
}

.dot-purple { 
    background: #7c6fe8; 
}

.dot-green { 
    background: #18865b; 
}

.chart-svg { 
    width: 100%; 
    height: 130px; 
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
  margin-top: 4px;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #edf1f6;
}

.chart-footer-item { 
    display: flex; 
    flex-direction: column; 
    font-size: 11px; 
    color: #9ca3af; 
}

.chart-footer-item strong { 
    font-size: 14px; 
    color: #172b4d; 
    margin-top: 2px; 
}

.peminjam-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #edf1f6;
  gap: 10px;
}

.peminjam-row:last-child { 
    border-bottom: 0; 
}

.buku-row {
  display: grid;
  grid-template-columns: 20px 30px 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #edf1f6;
}

.buku-row:last-child { 
    border-bottom: 0; 
}

.peminjam-info { 
    display: flex; 
    flex-direction: column; 
    font-size: 12px; 
}

.peminjam-info strong { 
    font-size: 13px; 
}

.peminjam-info span { 
    color: #9ca3af; 
    font-size: 11px; 
}

.peminjam-right { 
    display: flex; 
    flex-direction: column; 
    align-items: flex-end; 
    gap: 4px; 
}

.tgl { 
    font-size: 10px; 
    color: #9ca3af; 
}

.badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-blue { 
    background: #dbeafe; 
    color: #1d4ed8; 
}

.badge-green { 
    background: #d1fae5; 
    color: #047857; 
}

.badge-red { 
    background: #fee2e2; 
    color: #b91c1c; 
}

.buku-rank {
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  background: #edf4ff; color: #2864e8;
  border-radius: 50%;
  font-size: 11px; font-weight: 700;
}

.buku-cover { 
    width: 30px; 
    height: 40px; 
    background: #1d4ed8; 
    border-radius: 4px; 
    justify-self: start; 
}

.buku-info { 
    display: flex; 
    flex-direction: column; 
    font-size: 12px; 
    min-width: 0; 
}

.buku-info strong { 
    font-size: 12px; 
}

.buku-info span { 
    color: #9ca3af; 
    font-size: 11px; 
}

.bottom-row {
  display: grid;
  grid-template-columns: 2.4fr 1fr;
  gap: 16px;
}

.table-controls { 
    display: flex; 
    gap: 8px; 
}

.search-input {
  font-size: 12px;
  border: 1px solid #e3e9f2;
  border-radius: 8px;
  padding: 6px 10px;
  min-width: 200px;
}

.data-table { 
    width: 100%; 
    border-collapse: collapse; 
    font-size: 12px; 
}

.data-table th {
  text-align: left;
  color: #9ca3af;
  font-weight: 600;
  padding: 8px 6px;
  border-bottom: 1px solid #edf1f6;
  font-size: 11px;
}

.data-table td {
  padding: 10px 6px;
  border-bottom: 1px solid #edf1f6;
  vertical-align: middle;
}

.muted { 
    color: #9ca3af; 
    font-size: 11px; 
}

.detail-btn {
  font-size: 11px;
  padding: 5px 10px;
  border: 1px solid #e3e9f2;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #2864e8;
}

.reminder-card h2 { 
    margin: 0 0 14px; 
    font-size: 15px; 
}

.reminder-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #edf1f6;
}

.reminder-row:last-child { 
    border-bottom: 0; 
}

.reminder-info { 
    display: flex; 
    flex-direction: column; 
    font-size: 12px; 
}

.reminder-info strong { 
    font-size: 12px; 
}

.reminder-info span { 
    color: #9ca3af; 
    font-size: 11px; 
}

.reminder-badge {
  width: 22px; 
  height: 22px;
  display: flex; 
  align-items: center; 
  justify-content: center;
  border-radius: 50%;
  font-size: 11px; 
  font-weight: 700;
}

.badge-red.reminder-badge, 
span.reminder-badge.badge-red { 
    background: #fee2e2; 
    color: #b91c1c; 
}

.reminder-badge.badge-blue { 
    background: #dbeafe; 
    color: #1d4ed8; 
}

.reminder-badge.badge-green { 
    background: #d1fae5; 
    color: #047857; 
}

.reminder-badge.badge-orange { 
    background: #fef3c7; 
    color: #b45309; 
}

@media (max-width: 1100px) {
  .stat-cards { 
    grid-template-columns: 1fr 1fr; 
  }

  .mid-row { 
    grid-template-columns: 1fr; 
  }

  .bottom-row { 
    grid-template-columns: 1fr; 
  }

  .top-row { 
    grid-template-columns: 1fr; 
  }
}

.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}
</style>