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