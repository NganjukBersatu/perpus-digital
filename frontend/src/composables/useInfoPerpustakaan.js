import { ref } from 'vue'

const info = ref({
  namaPerpustakaan: 'Perpustakaan',
  namaSekolah: '',
  alamat: '',
  telepon: '',
  email: '',
  kepalaPerpustakaan: '',
  tahunAjaran: '',
})

let sudahDimuat = false
let promiseAktif = null

async function muatInfo(force = false) {
  if (sudahDimuat && !force) return info.value
  if (promiseAktif) return promiseAktif

  const p = (async () => {
    try {
      const BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${BASE}/api/pengaturan/publik`)
      if (res.ok) {
        const data = await res.json()
        Object.assign(info.value, data)
        sudahDimuat = true
      }
    } catch (e) {
      console.warn('Gagal memuat info perpustakaan:', e)
    } finally {
      promiseAktif = null
    }
    return info.value
  })()

  promiseAktif = p
  return p
}

function setInfo(data = {}) {
  Object.assign(info.value, data)
  sudahDimuat = true
}

export function useInfoPerpustakaan() {
  return { info, muatInfo, setInfo }
}