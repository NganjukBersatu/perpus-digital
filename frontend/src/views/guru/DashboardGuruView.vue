<script setup>
import { ref } from 'vue'

const props = defineProps({
  guru: {
    type: Object,
    default: () => ({
      nama: 'Andi Prasetyo',
      role: 'Guru',
      mapel: 'Guru RPL',
      nip: '198005152010011005'
    })
  }
})

const icons = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  receipt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2h16v20l-3-2-2 2-2-2-2 2-2-2-2 2-3-2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>`
}

const keyword = ref('')
const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const statistik = ref([
  { label: 'Total Buku', value: '1.250', sub: 'Total koleksi buku', icon: 'book', bg: '#dbeafe', color: '#2563eb' },
  { label: 'Buku Dipinjam', value: 3, sub: 'Sedang dipinjam', icon: 'users', bg: '#dcfce7', color: '#16a34a' },
  { label: 'Terlambat', value: 1, sub: 'Perlu segera dikembalikan', icon: 'clock', bg: '#ede9fe', color: '#7c3aed' },
  { label: 'Riwayat Selesai', value: 12, sub: 'Peminjaman selesai', icon: 'calendar', bg: '#fef3c7', color: '#d97706' },
  { label: 'Buku Favorit', value: 8, sub: 'Buku favorit Anda', icon: 'star', bg: '#fee2e2', color: '#dc2626' }
])

const rekomendasi = ref([
  { judul: 'Dasar Pemrograman Web', penulis: 'Abdul Kadir', kategori: 'Teknologi', rating: 4.5, jumlahRating: 128, warna: '#1e3a8a' },
  { judul: 'Strategi Pembelajaran Inovatif', penulis: 'Dr. H. Syaiful Bahri', kategori: 'Pendidikan', rating: 4.6, jumlahRating: 96, warna: '#b45309' },
  { judul: 'Manajemen Kelas Efektif', penulis: 'Drs. Mulyasa', kategori: 'Pendidikan', rating: 4.4, jumlahRating: 74, warna: '#065f46' }
])

const peminjaman = ref([
  { judul: 'Dasar Pemrograman Web', penulis: 'Abdul Kadir', tanggalPinjam: '28 Mei 2026', batasKembali: '11 Juni 2026', status: 'Dipinjam', warna: '#1e3a8a' },
  { judul: 'Algoritma & Pemrograman dengan Python', penulis: 'Munir', tanggalPinjam: '27 Mei 2026', batasKembali: '10 Juni 2026', status: 'Dipinjam', warna: '#334155' },
  { judul: 'Database System Concepts', penulis: 'Abraham Silberschatz', tanggalPinjam: '25 Mei 2026', batasKembali: '08 Juni 2026', status: 'Terlambat', warna: '#7c2d12' }
])

const notifikasi = ref([
  { judul: 'Peminjaman disetujui', deskripsi: 'Peminjaman buku "Dasar Pemrograman Web" telah disetujui.', waktu: '2 jam yang lalu', icon: 'checkCircle', bg: '#dcfce7', color: '#16a34a' },
  { judul: 'Pengembalian segera', deskripsi: 'Buku "Database System Concepts" sudah melewati batas pengembalian.', waktu: '1 hari yang lalu', icon: 'alertTriangle', bg: '#fef3c7', color: '#d97706' },
  { judul: 'Buku baru tersedia', deskripsi: 'Buku "Kecerdasan Artifisial" tersedia di perpustakaan.', waktu: '2 hari yang lalu', icon: 'info', bg: '#dbeafe', color: '#2563eb' },
  { judul: 'Rekomendasi buku baru', deskripsi: 'Kami punya rekomendasi buku baru untuk Anda.', waktu: '3 hari yang lalu', icon: 'book', bg: '#ede9fe', color: '#7c3aed' }
])

const riwayat = ref([
  { judul: 'Pemrograman Java untuk Pemula', tanggalPinjam: '10 Mei 2026', tanggalKembali: '17 Mei 2026', status: 'Dikembalikan', denda: 'Rp0' },
  { judul: 'Jaringan Komputer', tanggalPinjam: '01 Mei 2026', tanggalKembali: '08 Mei 2026', status: 'Dikembalikan', denda: 'Rp0' },
  { judul: 'Sistem Operasi Konsep & Implementasi', tanggalPinjam: '20 Apr 2026', tanggalKembali: '27 Apr 2026', status: 'Dikembalikan', denda: 'Rp0' },
  { judul: 'Rekayasa Perangkat Lunak', tanggalPinjam: '05 Apr 2026', tanggalKembali: '12 Apr 2026', status: 'Dikembalikan', denda: 'Rp0' },
  { judul: 'Struktur Data dan Algoritma', tanggalPinjam: '28 Mar 2026', tanggalKembali: '04 Apr 2026', status: 'Dikembalikan', denda: 'Rp0' }
])

const ringkasan = ref([
  { icon: 'book', label: 'Total Peminjaman', value: '4 buku', warna: '#2563eb' },
  { icon: 'checkCircle', label: 'Telah Dikembalikan', value: '3 buku', warna: '#16a34a' },
  { icon: 'clock', label: 'Terlambat', value: '1 buku', warna: '#d97706' },
  { icon: 'receipt', label: 'Total Denda', value: 'Rp5.000', warna: '#7c3aed' }
])
</script>

<template>
  <div class="content">
    <div class="welcome-row">
      <div>
        <h1>Selamat datang, {{ props.guru.nama }}!</h1>
        <p class="muted">Selamat membaca dan terus berbagi ilmu.</p>
      </div>
      <div class="date-chip">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {{ tanggalHariIni }}
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" v-for="s in statistik" :key="s.label">
        <div class="stat-icon" :style="{ background: s.bg, color: s.color }" v-html="icons[s.icon]"></div>
        <div>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-sub">{{ s.sub }}</div>
        </div>
      </div>
    </div>

    <div class="middle-grid">
      <div class="left-col">
        <div class="card">
          <h3>Cari Buku</h3>
          <div class="search-box">
            <input v-model="keyword" type="text" placeholder="Cari judul, penulis, atau kategori buku..." />
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Rekomendasi Untuk Anda</h3>
            <router-link to="/guru/rekomendasi" class="link">Lihat semua</router-link>
          </div>
          <div class="rekomendasi-grid">
            <div class="buku-card" v-for="b in rekomendasi" :key="b.judul">
              <div class="buku-cover" :style="{ background: b.warna }">
                <span class="buku-kategori">{{ b.kategori }}</span>
                <span class="buku-judul-cover">{{ b.judul }}</span>
              </div>
              <div class="buku-info">
                <div class="buku-judul">{{ b.judul }}</div>
                <div class="buku-penulis">{{ b.penulis }}</div>
                <div class="buku-rating">
                  <svg class="icon-star" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9" />
                  </svg>
                  {{ b.rating }} ({{ b.jumlahRating }})
                </div>
                <button class="btn-outline">Lihat Detail</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Riwayat Peminjaman Terakhir</h3>
          <table class="tabel">
            <thead>
              <tr>
                <th>No</th>
                <th>Judul Buku</th>
                <th>Tanggal Pinjam</th>
                <th>Tanggal Kembali</th>
                <th>Status</th>
                <th>Denda</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in riwayat" :key="r.judul">
                <td>{{ i + 1 }}</td>
                <td>{{ r.judul }}</td>
                <td>{{ r.tanggalPinjam }}</td>
                <td>{{ r.tanggalKembali }}</td>
                <td><span class="status-selesai">{{ r.status }}</span></td>
                <td>{{ r.denda }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Peminjaman Saya</h3>
          <router-link to="/guru/peminjaman-saya" class="link">Lihat semua</router-link>
        </div>
        <div class="pinjam-item" v-for="p in peminjaman" :key="p.judul">
          <div class="pinjam-cover" :style="{ background: p.warna }"></div>
          <div class="pinjam-info">
            <div class="pinjam-judul">{{ p.judul }}</div>
            <div class="pinjam-penulis">{{ p.penulis }}</div>
            <div class="pinjam-tanggal">Dipinjam: {{ p.tanggalPinjam }}</div>
            <div class="pinjam-tanggal">Batas kembali: {{ p.batasKembali }}</div>
          </div>
          <span :class="['tag', p.status === 'Terlambat' ? 'tag-merah' : 'tag-hijau']">
            {{ p.status }}
          </span>
        </div>
        <button class="btn-primary full">+ Ajukan Peminjaman Baru</button>
      </div>

      <div class="right-col">
        <div class="card">
          <div class="card-header">
            <h3>Notifikasi</h3>
            <router-link to="/guru/notifikasi" class="link">Lihat semua</router-link>
          </div>
          <div class="notif-item" v-for="n in notifikasi" :key="n.judul">
            <div class="notif-icon-bubble" :style="{ background: n.bg, color: n.color }" v-html="icons[n.icon]"></div>
            <div>
              <div class="notif-judul">{{ n.judul }}</div>
              <div class="notif-desc">{{ n.deskripsi }}</div>
              <div class="notif-waktu">{{ n.waktu }}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Ringkasan Aktivitas</h3>
            <select class="select-kecil">
              <option>Bulan Ini</option>
              <option>Bulan Lalu</option>
            </select>
          </div>
          <div class="ringkasan-item" v-for="r in ringkasan" :key="r.label">
            <span class="ringkasan-left">
              <span class="ringkasan-icon" :style="{ color: r.warna }" v-html="icons[r.icon]"></span>
              {{ r.label }}
            </span>
            <strong :style="{ color: r.warna }">{{ r.value }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.icon-star {
  width: 14px;
  height: 14px;
  color: #f59e0b;
  vertical-align: -2px;
  margin-right: 2px;
}

.content {
  padding: 24px;
}

.welcome-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.welcome-row h1 {
  margin: 0;
  font-size: 22px;
}

.muted {
  color: #6b7280;
  margin: 4px 0 0;
}

.date-chip {
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-sub {
  font-size: 11px;
  color: #9ca3af;
}

.middle-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card h3 {
  margin: 0 0 12px;
  font-size: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.link {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}

.search-box {
  display: flex;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
  color: #6b7280;
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 13px;
}

.rekomendasi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.buku-cover {
  height: 90px;
  border-radius: 8px;
  color: #fff;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
}

.buku-kategori {
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 999px;
  align-self: flex-start;
}

.buku-judul-cover {
  font-weight: 600;
}

.buku-judul {
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
}

.buku-penulis {
  font-size: 11px;
  color: #6b7280;
}

.buku-rating {
  font-size: 11px;
  margin: 4px 0;
  display: flex;
  align-items: center;
}

.btn-outline {
  width: 100%;
  border: 1px solid #2563eb;
  color: #2563eb;
  background: #fff;
  padding: 6px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}

.tabel {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tabel th {
  text-align: left;
  color: #6b7280;
  font-weight: 500;
  padding: 8px 6px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
  text-transform: uppercase;
}

.tabel td {
  padding: 10px 6px;
  border-bottom: 1px solid #f1f5f9;
}

.status-selesai {
  background: #dcfce7;
  color: #16a34a;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.pinjam-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.pinjam-cover {
  width: 40px;
  height: 50px;
  border-radius: 6px;
  flex-shrink: 0;
}

.pinjam-info {
  flex: 1;
}

.pinjam-judul {
  font-size: 13px;
  font-weight: 600;
}

.pinjam-penulis,
.pinjam-tanggal {
  font-size: 11px;
  color: #6b7280;
}

.tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  height: fit-content;
}

.tag-hijau {
  background: #dcfce7;
  color: #16a34a;
}

.tag-merah {
  background: #fee2e2;
  color: #dc2626;
}

.btn-primary.full {
  width: 100%;
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 8px;
  margin-top: 8px;
  cursor: pointer;
  font-size: 13px;
}

.notif-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.notif-icon-bubble {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-icon-bubble :deep(svg) {
  width: 16px;
  height: 16px;
}

.notif-judul {
  font-size: 13px;
  font-weight: 600;
}

.notif-desc {
  font-size: 11px;
  color: #6b7280;
}

.notif-waktu {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
}

.select-kecil {
  font-size: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px 8px;
}

.ringkasan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid #f1f5f9;
}

.ringkasan-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ringkasan-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

@media (max-width: 1100px) {
  .middle-grid {
    grid-template-columns: 1fr;
  }
}
</style>