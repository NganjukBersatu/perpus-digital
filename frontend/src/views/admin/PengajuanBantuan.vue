<script setup>
import { ref, computed, onMounted } from 'vue'

const API = import.meta.env.VITE_API_BASE_URL

const daftar = ref([])
const memuat = ref(false)
const pesan = ref('')
const filterStatus = ref('Semua')
const kataKunci = ref('')
const terpilih = ref(null) // pengajuan yang dibuka detailnya

const TAB = ['Semua', 'baru', 'diproses', 'selesai']
const LABEL = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai' }

async function panggil(path, opsi = {}) {
  const res = await fetch(API + path, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + localStorage.getItem('token'),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Terjadi kesalahan')
  return data
}

async function muat() {
  memuat.value = true
  pesan.value = ''
  try {
    daftar.value = await panggil('/bantuan')
  } catch (e) {
    pesan.value = e.message
  } finally {
    memuat.value = false
  }
}

async function ubahStatus(item, status) {
  pesan.value = ''
  try {
    const baru = await panggil(`/bantuan/${item.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    item.status = baru.status ?? status
  } catch (e) {
    pesan.value = e.message
  }
}

const tampil = computed(() => {
  const q = kataKunci.value.trim().toLowerCase()
  return daftar.value.filter((d) => {
    const cocokStatus = filterStatus.value === 'Semua' || d.status === filterStatus.value
    const cocokCari =
      !q ||
      [d.nama, d.nisNip, d.jenis, d.pesan].some((v) => String(v ?? '').toLowerCase().includes(q))
    return cocokStatus && cocokCari
  })
})

const jumlah = (st) =>
  st === 'Semua' ? daftar.value.length : daftar.value.filter((d) => d.status === st).length

const tanggal = (t) =>
  t
    ? new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-'

onMounted(muat)
</script>

<template>
  <div class="halaman">
    <div class="judul-baris">
      <div>
        <h1>Pengajuan Bantuan</h1>
        <p class="sub">Kendala login dan pendaftaran yang diajukan siswa dan guru.</p>
      </div>
      <button class="btn-garis" :disabled="memuat" @click="muat">
        {{ memuat ? 'Memuat...' : 'Muat ulang' }}
      </button>
    </div>

    <div class="filter-baris">
      <div class="cari">
        <span>⌕</span>
        <input v-model="kataKunci" type="text" placeholder="Cari nama, NIS/NIP, atau kendala..." />
      </div>
      <div class="tab">
        <button
          v-for="t in TAB"
          :key="t"
          :class="{ pilih: filterStatus === t }"
          @click="filterStatus = t"
        >
          {{ t === 'Semua' ? 'Semua' : LABEL[t] }} ({{ jumlah(t) }})
        </button>
      </div>
    </div>

    <p v-if="pesan" class="galat">{{ pesan }}</p>
    <p v-if="!memuat && tampil.length === 0" class="kosong">
      Tidak ada pengajuan yang cocok.
    </p>

    <div v-if="tampil.length" class="kartu-tabel">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Peran</th>
            <th>NIS / NIP</th>
            <th>Kendala</th>
            <th>Tanggal</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in tampil" :key="d.id">
            <td>{{ i + 1 }}</td>
            <td class="tebal">{{ d.nama }}</td>
            <td class="kapital">{{ d.peran }}</td>
            <td>{{ d.nisNip || '-' }}</td>
            <td>{{ d.jenis }}</td>
            <td>{{ tanggal(d.createdAt) }}</td>
            <td>
              <span class="lencana" :class="d.status">{{ LABEL[d.status] || d.status }}</span>
            </td>
            <td class="aksi">
              <button class="btn-garis biru" @click="terpilih = d">Detail</button>
              <button
                v-if="d.status === 'baru'"
                class="btn-garis biru"
                @click="ubahStatus(d, 'diproses')"
              >
                Proses
              </button>
              <button
                v-if="d.status !== 'selesai'"
                class="btn-garis hijau"
                @click="ubahStatus(d, 'selesai')"
              >
                Selesai
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- DETAIL -->
    <div v-if="terpilih" class="lapisan" @click.self="terpilih = null">
      <div class="modal">
        <h2>Detail Pengajuan</h2>
        <dl>
          <dt>Nama</dt><dd>{{ terpilih.nama }}</dd>
          <dt>Peran</dt><dd class="kapital">{{ terpilih.peran }}</dd>
          <dt>NIS / NIP</dt><dd>{{ terpilih.nisNip || '-' }}</dd>
          <dt>Kendala</dt><dd>{{ terpilih.jenis }}</dd>
          <dt>Pesan</dt><dd class="pesan">{{ terpilih.pesan || '-' }}</dd>
          <dt>Kontak balasan</dt><dd>{{ terpilih.kontak || '-' }}</dd>
          <dt>Tanggal</dt><dd>{{ tanggal(terpilih.createdAt) }}</dd>
        </dl>
        <div class="modal-aksi">
          <button class="btn-garis" @click="terpilih = null">Tutup</button>
          <button
            v-if="terpilih.status === 'baru'"
            class="btn-utama"
            @click="ubahStatus(terpilih, 'diproses')"
          >
            Tandai Diproses
          </button>
          <button
            v-if="terpilih.status !== 'selesai'"
            class="btn-utama hijau-bg"
            @click="ubahStatus(terpilih, 'selesai')"
          >
            Tandai Selesai
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.halaman { padding: 28px 24px; background: #f4f5fa; min-height: 100%; font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; }
.judul-baris { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
h1 { margin: 0; font-size: 1.8rem; font-weight: 700; }
.sub { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }

.filter-baris { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
.cari { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 0 16px; height: 44px; }
.cari input { flex: 1; border: 0; outline: 0; font-size: 0.9rem; background: transparent; }
.tab { display: flex; gap: 6px; flex-wrap: wrap; }
.tab button { border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 9px 16px; font-size: 0.85rem; cursor: pointer; }
.tab .pilih { background: #4f46e5; color: #fff; border-color: #4f46e5; }

.kartu-tabel { background: #fff; border-radius: 14px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 14px 16px; font-size: 0.85rem; color: #64748b; font-weight: 600; border-bottom: 1px solid #eef0f4; }
td { padding: 14px 16px; border-bottom: 1px solid #f1f3f7; font-size: 0.9rem; vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
.tebal { font-weight: 700; }
.kapital { text-transform: capitalize; }
.aksi { white-space: nowrap; }
.aksi button { margin-right: 6px; }

.btn-garis { border: 1px solid #d5dae3; background: #fff; border-radius: 8px; padding: 6px 14px; font-size: 0.8rem; cursor: pointer; }
.btn-garis:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-garis.biru { color: #2563eb; }
.btn-garis.hijau { color: #15803d; }
.btn-utama { border: 0; background: #2563eb; color: #fff; border-radius: 8px; padding: 9px 16px; font-weight: 600; cursor: pointer; }
.btn-utama.hijau-bg { background: #16a34a; }

.lencana { padding: 3px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 600; background: #e2e8f0; }
.lencana.baru { background: #fef3c7; color: #92400e; }
.lencana.diproses { background: #dbeafe; color: #1e40af; }
.lencana.selesai { background: #dcfce7; color: #166534; }

.galat { color: #dc2626; margin: 8px 0; }
.kosong { color: #64748b; margin-top: 24px; }

.lapisan { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
.modal { background: #fff; border-radius: 14px; padding: 24px; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; }
.modal h2 { margin: 0 0 14px; font-size: 1.15rem; }
dl { display: grid; grid-template-columns: 120px 1fr; gap: 10px 12px; margin: 0 0 18px; font-size: 0.9rem; }
dt { color: #64748b; }
dd { margin: 0; }
.pesan { white-space: pre-wrap; }
.modal-aksi { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
</style>