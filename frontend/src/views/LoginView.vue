<template>
  <div class="login-page">
    <h1>Login Perpustakaan</h1>

    <!-- Pilih Role -->
    <div class="role-selector">
      <label
        v-for="role in roles"
        :key="role.value"
        class="role-option"
        :class="{ active: selectedRole === role.value }"
      >
        <input
          type="radio"
          :value="role.value"
          v-model="selectedRole"
          hidden
        />
        {{ role.label }}
      </label>
    </div>

    <form @submit.prevent="handleLogin">
      <!-- Form untuk Siswa -->
      <template v-if="selectedRole === 'siswa'">
        <div class="form-group">
          <label>NIS</label>
          <input
            v-model="form.nis"
            type="text"
            placeholder="Masukkan NIS"
            required
          />
        </div>
        <div class="form-group">
          <label>Tanggal Lahir</label>
          <input
            v-model="form.tanggalLahir"
            type="date"
            required
          />
        </div>
      </template>

      <!-- Form untuk Guru -->
      <template v-else-if="selectedRole === 'guru'">
        <div class="form-group">
          <label>NIP</label>
          <input
            v-model="form.nip"
            type="text"
            placeholder="Masukkan NIP"
            required
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="Masukkan password"
            required
          />
       </div>
      </template>

      <!-- Form untuk Admin -->
      <template v-else>
        <div class="form-group">
          <label>Username</label>
          <input
            v-model="form.username"
            type="text"
            placeholder="Masukkan username"
            required
          />
          </div>
        <div class="form-group">
          <label>Password</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="Masukkan password"
            required
          />
        </div>
      </template>

      <button type="submit" class="btn-login">
        Masuk sebagai {{ roleLabel }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const roles = [
  { value: 'siswa', label: 'Siswa' },
  { value: 'guru', label: 'Guru' },
  { value: 'admin', label: 'Admin' }
]

const selectedRole = ref('siswa')

const form = ref({
  nis: '',
  tanggalLahir: '',
  username: '',
  password: '',
  nip: ''
})

// Label yang ditampilkan di tombol
const roleLabel = computed(() => {
  const found = roles.find(r => r.value === selectedRole.value)
  return found ? found.label : ''
})

// Reset form setiap ganti role
watch(selectedRole, () => {
  form.value = {
    nis: '',
    tanggalLahir: '',
    username: '',
    password: '',
    nip: ''
  }
})

function handleLogin() {
  if (selectedRole.value === 'siswa') {
    console.log('Login Siswa:', {
      nis: form.value.nis,
      tanggalLahir: form.value.tanggalLahir
    })
    // Nanti diganti dengan API call
   router.push('/siswa')
  } 
  
  else if (selectedRole.value === 'admin') {
    console.log('Login Admin:', {
      username: form.value.username,
      password: form.value.password
    })
    // Nanti diganti dengan API call
    router.push('/admin') // contoh route
  } 
  
  else if (selectedRole.value === 'guru') {
    console.log('Login Guru:', {
      username: form.value.nip,
      password: form.value.password
    })
    // Nanti diganti dengan API call
    router.push('/guru')
  }
}
</script>

<style scoped>
.login-page {
  max-width: 420px;
  margin: 60px auto;
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background: white;
}

h1 {
  text-align: center;
  margin-bottom: 28px;
  font-size: 1.6rem;
  color: #1f2937;
}

/* Role Selector */
.role-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  background: #f3f4f6;
  padding: 6px;
  border-radius: 10px;
}

.role-option {
  flex: 1;
  text-align: center;
  padding: 10px 6px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #4b5563;
  user-select: none;
}

.role-option.active {
  background: white;
  color: #111827;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Form */
.form-group {
  margin-bottom: 18px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  text-align: left;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.btn-login {
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-login:hover {
  background: #1d4ed8;
}
</style>