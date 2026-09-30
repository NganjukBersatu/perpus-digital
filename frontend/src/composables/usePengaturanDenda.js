import { ref } from 'vue'

const dendaAktif = ref(false)

export function usePengaturanDenda() {
  async function muat() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pengaturan`)
      if (!res.ok) return
      const data = await res.json()
      dendaAktif.value = data.detail?.denda?.aktif !== false
    } catch (err) {
      console.error(err)
    }
  }

  return { dendaAktif, muat }
}