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

export function logoutUser(router) {
  const keys = [
    'token',
    'accessToken',
    'user',
    'admin',
    'role',
    'auth',
    'perpus_akun_admin'
  ]

  keys.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })

  router.push('/')
}