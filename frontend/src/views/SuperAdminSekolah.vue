<script setup>
import { ref, computed, onMounted } from 'vue'

// samakan dengan cara halaman lain memanggil backend (cek VITE_API_URL / baseURL Anda)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const KUNCI = 'superadmin_token'

const token = ref(localStorage.getItem(KUNCI) || '')
const username = ref('')
const password = ref('')
const pesan = ref('')
const memuat = ref(false)
const daftar = ref([])
const filter = ref('menunggu')

const TAB = [
  { nilai: 'menunggu', label: 'Menunggu' },
  { nilai: 'aktif', label: 'Aktif' },
  { nilai: 'ditolak', label: 'Ditolak' },
  { nilai: 'nonaktif', label: 'Nonaktif' },
  { nilai: 'semua', label: 'Semua' },
]

async function panggil(path, opsi = {}) {
  const res = await fetch(API + path, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: 'Bearer ' + token.value } : {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token.value) {
    keluar()
    throw new Error('Sesi berakhir, silakan masuk lagi')
  }
  if (!res.ok) throw new Error(data.error || data.message || 'Terjadi kesalahan')
  return data
}

function keluar() {
  token.value = ''
  localStorage.removeItem(KUNCI)
  daftar.value = []
}

async function masuk() {
  pesan.value = ''
  memuat.value = true
  try {
    // tanpa sekolahId, backend hanya mencari akun superadmin
    const data = await panggil('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.value.trim(), password: password.value }),
    })
    if (data.role !== 'superadmin') throw new Error('Akun ini bukan super admin')
    token.value = data.token
    localStorage.setItem(KUNCI, data.token)
    password.value = ''
    await muat()
  } catch (e) {
    pesan.value = e.message
  } finally {
    memuat.value = false
  }
}

async function muat() {
  memuat.value = true
  pesan.value = ''
  try {
    daftar.value = await panggil('/api/sekolah')
  } catch (e) {
    pesan.value = e.message
  } finally {
    memuat.value = false
  }
}

async function ubahStatus(s, status, tanya) {
  if (!window.confirm(`${tanya} "${s.nama}"?`)) return
  pesan.value = ''
  try {
    const baru = await panggil(`/api/sekolah/${s.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    s.status = baru.status
    s.aktif = baru.aktif
  } catch (e) {
    pesan.value = e.message
  }
}

const tampil = computed(() =>
  filter.value === 'semua' ? daftar.value : daftar.value.filter((s) => s.status === filter.value)
)
const jumlah = (st) =>
  st === 'semua' ? daftar.value.length : daftar.value.filter((s) => s.status === st).length
const tanggal = (t) =>
  t ? new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

onMounted(() => { if (token.value) muat() })
</script>

<template>
  <main class="sa">
    <form v-if="!token" class="kartu sempit" @submit.prevent="masuk">
      <h1>Masuk Super Admin</h1>
      <input v-model="username" placeholder="Username" autocomplete="username" required />
      <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" required />
      <p v-if="pesan" class="galat">{{ pesan }}</p>
      <button class="utama" :disabled="memuat">{{ memuat ? 'Memproses…' : 'Masuk' }}</button>
    </form>

    <section v-else class="kartu">
      <header class="atas">
        <h1>Persetujuan Sekolah</h1>
        <div>
          <button class="kecil" :disabled="memuat" @click="muat">Muat ulang</button>
          <button class="kecil" @click="keluar">Keluar</button>
        </div>
      </header>

      <nav class="tab">
        <button v-for="t in TAB" :key="t.nilai" :class="{ pilih: filter === t.nilai }" @click="filter = t.nilai">
          {{ t.label }} ({{ jumlah(t.nilai) }})
        </button>
      </nav>

      <p v-if="pesan" class="galat">{{ pesan }}</p>
      <p v-if="!memuat && tampil.length === 0" class="kosong">Tidak ada sekolah pada status ini.</p>

      <div v-if="tampil.length" class="bungkus">
        <table>
          <thead>
            <tr><th>Sekolah</th><th>Admin</th><th>Terdaftar</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in tampil" :key="s.id">
              <td>{{ s.nama }}</td>
              <td>{{ s.adminUsername }}<br /><small>{{ s.adminEmail }}</small></td>
              <td>{{ tanggal(s.createdAt) }}</td>
              <td><span class="lencana" :class="s.status">{{ s.status }}</span></td>
              <td class="aksi">
                <template v-if="s.status === 'menunggu'">
                  <button class="ya" @click="ubahStatus(s, 'aktif', 'Setujui')">Setujui</button>
                  <button class="tidak" @click="ubahStatus(s, 'ditolak', 'Tolak')">Tolak</button>
                </template>
                <button v-else-if="s.status === 'aktif'" class="tidak" @click="ubahStatus(s, 'nonaktif', 'Nonaktifkan')">Nonaktifkan</button>
                <button v-else class="ya" @click="ubahStatus(s, 'aktif', 'Aktifkan')">Aktifkan</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.sa { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 40px 16px; background: #f1f5f9; font-family: system-ui, sans-serif; }
.kartu { width: 100%; max-width: 900px; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.08); display: flex; flex-direction: column; gap: 12px; }
.sempit { max-width: 380px; margin-top: 60px; }
h1 { margin: 0; font-size: 1.3rem; color: #0f172a; }
input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
button { cursor: pointer; border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 600; background: #e2e8f0; color: #0f172a; }
button:disabled { opacity: .6; cursor: not-allowed; }
.utama { background: #2563eb; color: #fff; padding: 10px; }
.atas { display: flex; justify-content: space-between; align-items: center; }
.kecil { margin-left: 6px; padding: 6px 12px; }
.tab { display: flex; gap: 6px; flex-wrap: wrap; }
.tab .pilih { background: #2563eb; color: #fff; }
.bungkus { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
small { color: #64748b; }
.aksi { white-space: nowrap; }
.aksi button { margin-right: 6px; }
.ya { background: #16a34a; color: #fff; }
.tidak { background: #dc2626; color: #fff; }
.lencana { padding: 2px 10px; border-radius: 999px; font-size: .8rem; background: #e2e8f0; }
.lencana.menunggu { background: #fef3c7; color: #92400e; }
.lencana.aktif { background: #dcfce7; color: #166534; }
.lencana.ditolak { background: #fee2e2; color: #991b1b; }
.galat { color: #dc2626; margin: 0; }
.kosong { color: #64748b; }
</style>