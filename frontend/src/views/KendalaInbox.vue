<script setup>
// Satu komponen dipakai dua dashboard:
//   Admin sekolah : route /admin/kendala      (props di router)
//   Super admin   : route /superadmin/kendala (props di router)
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  endpoint: { type: String, required: true },
  tampilSekolah: { type: Boolean, default: false },
  judul: { type: String, default: 'Laporan Kendala' },
  // token bisa dikirim dari luar (dipakai halaman super admin yang menyimpan token sendiri)
  token: { type: String, default: '' }
})

const emit = defineEmits(['jumlah-baru', 'sesi-berakhir'])

const base = import.meta.env.VITE_API_BASE_URL
const daftar = ref([])
const memuat = ref(false)
const error = ref('')
const filter = ref('baru') // 'baru' | 'selesai' | 'semua'
const sedangProses = ref(null) // id laporan yang sedang ditandai selesai

const authHeaders = () => {
  const token = props.token || localStorage.getItem('token') || localStorage.getItem('accessToken')
  return { Authorization: `Bearer ${token}` }
}

async function muat() {
  memuat.value = true
  error.value = ''
  try {
    const res = await fetch(`${base}${props.endpoint}`, { headers: authHeaders() })
    const data = await res.json().catch(() => [])
    if (res.status === 401) {
      emit('sesi-berakhir')
      return
    }
    if (!res.ok) {
      error.value = data.error || data.message || `Gagal memuat laporan (${res.status})`
      return
    }
    daftar.value = data
    emit('jumlah-baru', jumlahBaru.value)
  } catch (err) {
    console.error('MUAT KENDALA ERROR:', err)
    error.value = 'Tidak bisa terhubung ke server'
  } finally {
    memuat.value = false
  }
}

async function tandaiSelesai(item) {
  sedangProses.value = item.id
  try {
    const res = await fetch(`${base}${props.endpoint}/${item.id}/selesai`, {
      method: 'PATCH',
      headers: authHeaders()
    })
    if (res.ok) {
      item.status = 'selesai'
      emit('jumlah-baru', jumlahBaru.value)
    } else if (res.status === 401) {
      emit('sesi-berakhir')
    } else {
      error.value = 'Gagal memperbarui status laporan'
    }
  } catch (err) {
    console.error('TANDAI SELESAI ERROR:', err)
    error.value = 'Tidak bisa terhubung ke server'
  } finally {
    sedangProses.value = null
  }
}

const jumlahBaru = computed(() => daftar.value.filter(k => k.status === 'baru').length)
const jumlahSelesai = computed(() => daftar.value.filter(k => k.status === 'selesai').length)
const tampil = computed(() =>
  filter.value === 'semua' ? daftar.value : daftar.value.filter(k => k.status === filter.value)
)

function tanggal(iso) {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const labelRole = { siswa: 'Siswa', guru: 'Guru', admin: 'Admin' }

// Kontak berupa email -> mailto, berupa nomor -> WhatsApp, selain itu tanpa tombol
function linkKontak(kontak) {
  const k = (kontak || '').trim()
  if (k.includes('@')) return { url: `mailto:${k}`, label: 'Kirim email' }
  const digit = k.replace(/[^0-9]/g, '')
  if (digit.length >= 9) {
    const nomor = digit.startsWith('0') ? '62' + digit.slice(1) : digit
    return { url: `https://wa.me/${nomor}`, label: 'Chat WhatsApp' }
  }
  return null
}

onMounted(muat)
</script>

<template>
  <section class="kendala">
    <header class="kendala-head">
      <div>
        <h2>{{ judul }}</h2>
        <p class="sub">
          {{ jumlahBaru }} laporan baru · {{ jumlahSelesai }} selesai
        </p>
      </div>
      <button type="button" class="btn-muat" :disabled="memuat" @click="muat">
        {{ memuat ? 'Memuat...' : 'Muat ulang' }}
      </button>
    </header>

    <div class="tabs">
      <button
        v-for="t in [
          { v: 'baru', l: 'Baru' },
          { v: 'selesai', l: 'Selesai' },
          { v: 'semua', l: 'Semua' }
        ]"
        :key="t.v"
        type="button"
        class="tab"
        :class="{ active: filter === t.v }"
        @click="filter = t.v"
      >
        {{ t.l }}
      </button>
    </div>

    <p v-if="error" class="pesan error">{{ error }}</p>
    <p v-else-if="memuat && !daftar.length" class="pesan">Memuat laporan...</p>
    <p v-else-if="!tampil.length" class="pesan">
      {{ filter === 'baru' ? 'Tidak ada laporan baru.' : 'Belum ada laporan.' }}
    </p>

    <ul v-else class="list">
      <li v-for="k in tampil" :key="k.id" class="item" :class="{ selesai: k.status === 'selesai' }">
        <div class="item-top">
          <span class="jenis">{{ k.jenis }}</span>
          <span class="badge" :class="'role-' + k.role">{{ labelRole[k.role] || k.role }}</span>
          <span v-if="k.status === 'selesai'" class="badge done">Selesai</span>
        </div>

        <p class="meta">
          <span v-if="tampilSekolah">{{ k.sekolah_nama || 'Sekolah belum terdaftar' }} · </span>
          {{ tanggal(k.dibuat_pada) }}
        </p>

        <p class="isi">{{ k.pesan }}</p>

        <div class="item-bottom">
          <span class="kontak">Kontak: <strong>{{ k.kontak }}</strong></span>
          <div class="aksi">
            <a
              v-if="linkKontak(k.kontak)"
              :href="linkKontak(k.kontak).url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-aksi"
            >
              {{ linkKontak(k.kontak).label }}
            </a>
            <button
              v-if="k.status === 'baru'"
              type="button"
              class="btn-aksi primary"
              :disabled="sedangProses === k.id"
              @click="tandaiSelesai(k)"
            >
              {{ sedangProses === k.id ? 'Menyimpan...' : 'Tandai selesai' }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.kendala { max-width: 860px; margin: 0 auto; padding: 24px 16px; font-family: 'Segoe UI', sans-serif; color: #0b1a3a; }
.kendala-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.kendala-head h2 { margin: 0 0 4px; font-size: 22px; }
.sub { margin: 0; font-size: 13px; color: #64748b; }

.btn-muat { padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-muat:disabled { opacity: 0.6; cursor: not-allowed; }

.tabs { display: inline-flex; gap: 4px; padding: 4px; background: #eaf1ff; border-radius: 10px; margin-bottom: 16px; }
.tab { padding: 7px 16px; border: 0; border-radius: 7px; background: transparent; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; }
.tab.active { background: #2864e8; color: #fff; }

.pesan { padding: 28px 12px; text-align: center; color: #64748b; font-size: 14px; }
.pesan.error { color: #dc2626; }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.item { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #2864e8; border-radius: 12px; padding: 14px 16px; }
.item.selesai { border-left-color: #94a3b8; opacity: 0.8; }

.item-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.jenis { font-weight: 700; font-size: 14px; }
.badge { padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #dbeafe; color: #1e40af; }
.badge.role-guru { background: #fef3c7; color: #92400e; }
.badge.role-admin { background: #ede9fe; color: #5b21b6; }
.badge.done { background: #dcfce7; color: #166534; }

.meta { margin: 4px 0 8px; font-size: 12px; color: #64748b; }
.isi { margin: 0 0 12px; font-size: 14px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }

.item-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
.kontak { font-size: 13px; color: #475569; }
.aksi { display: flex; gap: 8px; }
.btn-aksi { padding: 7px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #0b1a3a; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; }
.btn-aksi.primary { background: #2864e8; border-color: #2864e8; color: #fff; }
.btn-aksi:disabled { opacity: 0.6; cursor: not-allowed; }
</style>