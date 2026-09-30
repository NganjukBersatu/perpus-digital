export function getToken() {
  return localStorage.getItem('token')
}

export function getAdmin() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// dipakai untuk menempelkan token ke header setiap fetch ke endpoint yang butuh login
export function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// helper supaya Content-Type tidak lupa disertakan saat POST/PUT JSON
export function jsonHeaders() {
  return {
    'Content-Type': 'application/json',
    ...authHeaders(),
  }
}

// key eksplisit yang memang dipakai aplikasi
const AUTH_KEYS = [
  'token',
  'accessToken',
  'refreshToken',
  'user',
  'admin',
  'role',
  'auth',
  'perpus_akun_admin',
]

function bersihkanStorage(storage) {
  if (!storage) return
  AUTH_KEYS.forEach((key) => storage.removeItem(key))
}

export function logoutUser(router) {
  bersihkanStorage(localStorage)
  bersihkanStorage(sessionStorage)

  // reset state global (Pinia/Vuex) kalau ada, tanpa hard-import
  // supaya file ini tetap bisa dipakai di project yang tidak pakai store.
  try {
    // event ini bisa didengarkan oleh store / komponen lain
    window.dispatchEvent(new Event('auth:logout'))
  } catch {
    // SSR / non-browser, abaikan
  }

  if (router && typeof router.push === 'function') {
    router.push('/')
  }
}