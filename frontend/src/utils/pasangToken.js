import axios from 'axios'

// Pasang token login ke SEMUA panggilan ke API kita (fetch maupun axios),
// dan keluarkan user ke halaman login kalau server membalas 401.
// Dipanggil sekali dari main.js, jadi tiap halaman tidak perlu mengurus token sendiri.

const KUNCI_SESI = ['token', 'accessToken', 'role', 'user']

// Token HANYA dikirim ke origin milik kita (halaman ini + VITE_API_BASE_URL),
// supaya tidak bocor ke situs lain (mis. API pencarian ISBN eksternal).
const ORIGIN_DIIZINKAN = new Set([window.location.origin])
try {
  ORIGIN_DIIZINKAN.add(
    new URL(import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin).origin
  )
} catch {
  /* VITE_API_BASE_URL tidak valid: pakai origin halaman saja */
}

function urlApiKita(url) {
  try {
    const u = new URL(url, window.location.origin)
    return ORIGIN_DIIZINKAN.has(u.origin) && u.pathname.startsWith('/api')
  } catch {
    return false
  }
}

// 401 di halaman login/daftar berarti "password salah", bukan "sesi habis"
const HALAMAN_TANPA_LOGOUT = /\/(login|daftar|lupa-password)(\/|$)/

function perluKeluar(status, url, adaToken) {
  if (status !== 401 || !adaToken) return false
  const { pathname } = new URL(url, window.location.origin)
  return !HALAMAN_TANPA_LOGOUT.test(pathname)
}

function sesiBerakhir() {
  KUNCI_SESI.forEach((k) => localStorage.removeItem(k))
  if (window.location.pathname !== '/') {
    window.location.href = '/'
  }
}

// ---------------------------------------------------------------- fetch
const fetchAsli = window.fetch.bind(window)

window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!urlApiKita(url)) return fetchAsli(input, init)

  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
  const token = localStorage.getItem('token')
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetchAsli(input, { ...init, headers })
  if (perluKeluar(res.status, url, headers.has('Authorization'))) sesiBerakhir()
  return res
}

// ---------------------------------------------------------------- axios (instance bawaan)
function punyaAuth(headers) {
  return typeof headers?.has === 'function' ? headers.has('Authorization') : !!headers?.Authorization
}

axios.interceptors.request.use((config) => {
  if (!urlApiKita(axios.getUri(config))) return config
  const token = localStorage.getItem('token')
  if (token && !punyaAuth(config.headers)) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error.config
    if (cfg && error.response) {
      const url = axios.getUri(cfg)
      if (urlApiKita(url) && perluKeluar(error.response.status, url, punyaAuth(cfg.headers))) {
        sesiBerakhir()
      }
    }
    return Promise.reject(error)
  }
)