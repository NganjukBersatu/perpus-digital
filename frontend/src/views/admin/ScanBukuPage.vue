<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import { Html5Qrcode } from "html5-qrcode"

const activeTab = ref("kamera")
const isScanning = ref(false)
const scanError = ref("")
const barcode = ref("")
const bookData = ref(null)
const bookNotFound = ref(false)
const isSaving = ref(false)
const saveSuccess = ref(false)
const fileInput = ref(null)

const availableCameras = ref([])
const selectedCameraId = ref(null)
let scanner = null

// 1 = scan, 2 = informasi buku, 3 = form peminjaman
const currentStep = ref(1)

// ===== PEMINJAM =====
const tipePeminjam = ref("siswa") // 'siswa' | 'guru'
const peminjam = ref({
  nama: "",
  kelas: "",
  tanggalPinjam: new Date().toISOString().slice(0, 10),
  tanggalKembali: "",
  anggotaId: null,
})

const daftarGuru = ref([])

// ===== COMBOBOX KELAS =====
const daftarKelas = ref([])
const kelasQuery = ref("")
const showKelasDropdown = ref(false)
const kelasInputRef = ref(null)

const filteredKelas = computed(() => {
  const q = kelasQuery.value.trim().toLowerCase()
  if (!q) return daftarKelas.value
  return daftarKelas.value.filter((k) => k.toLowerCase().includes(q))
})

async function ambilDaftarKelas() {
  try {
    const res = await fetch("/api/kelas")
    if (res.ok) daftarKelas.value = await res.json()
  } catch (err) {
    console.error(err)
  }
}

async function ambilDaftarGuru() {
  try {
    const res = await fetch("http://localhost:3000/api/guru")
    if (res.ok) daftarGuru.value = await res.json()
  } catch (err) {
    console.error(err)
  }
}

function pilihKelas(kelas) {
  peminjam.value.kelas = kelas
  kelasQuery.value = kelas
  showKelasDropdown.value = false
}

function onKelasInput() {
  peminjam.value.kelas = kelasQuery.value
  showKelasDropdown.value = true
}

function tutupKelasDropdown() {
  setTimeout(() => {
    showKelasDropdown.value = false
  }, 150)
}

function gantiTipePeminjam(tipe) {
  tipePeminjam.value = tipe
  peminjam.value.nama = ""
  peminjam.value.kelas = ""
  peminjam.value.anggotaId = null
  kelasQuery.value = ""
  guruQuery.value = ""
  scanError.value = ""
}

// ===== COMBOBOX GURU =====
const guruQuery = ref("")
const showGuruDropdown = ref(false)

const filteredGuru = computed(() => {
  const q = guruQuery.value.trim().toLowerCase()
  if (!q) return daftarGuru.value
  return daftarGuru.value.filter((g) => g.nama.toLowerCase().includes(q))
})

// true kalau nama yang diketik tidak cocok dengan guru manapun di daftar
const isGuruBaru = computed(() => {
  const q = guruQuery.value.trim().toLowerCase()
  if (!q) return false
  return !daftarGuru.value.some((g) => g.nama.toLowerCase() === q)
})

function pilihGuru(guru) {
  peminjam.value.anggotaId = guru.id
  peminjam.value.nama = guru.nama
  guruQuery.value = guru.nama
  showGuruDropdown.value = false
}

function onGuruInput() {
  // ketikan berubah -> anggap belum memilih guru manapun sampai dipilih lagi dari daftar/ditambah baru
  peminjam.value.anggotaId = null
  peminjam.value.nama = guruQuery.value
  showGuruDropdown.value = true
}

function tutupGuruDropdown() {
  setTimeout(() => {
    showGuruDropdown.value = false
  }, 150)
}

async function tambahGuruBaru() {
  const namaBaru = guruQuery.value.trim()
  if (!namaBaru) return

  try {
    const res = await fetch("http://localhost:3000/api/guru", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: namaBaru }),
    })
    if (!res.ok) throw new Error("Gagal menambah guru")
    const guruBaru = await res.json()

    daftarGuru.value.push(guruBaru)
    pilihGuru(guruBaru)
  } catch (err) {
    console.error(err)
    scanError.value = "Gagal menambahkan guru baru. Coba lagi."
  }
}


// ===== RESET =====
function resetHasilPindai() {
  scanError.value = ""
  bookNotFound.value = false
  bookData.value = null
  currentStep.value = 1
}

async function siapkanDaftarKamera() {
  try {
    const cams = await Html5Qrcode.getCameras()
    availableCameras.value = cams
    if (cams.length > 0 && !selectedCameraId.value) {
      const belakang = cams.find((k) => /back|belakang|rear/i.test(k.label))
      selectedCameraId.value = belakang ? belakang.id : cams[0].id
    }
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  siapkanDaftarKamera()
  ambilDaftarKelas()
  ambilDaftarGuru()
})

// ===== SCAN =====
async function mulaiPindai() {
  resetHasilPindai()
  if (!selectedCameraId.value) await siapkanDaftarKamera()
  if (!selectedCameraId.value) {
    scanError.value = "Tidak ada kamera terdeteksi di perangkat ini."
    return
  }

  isScanning.value = true
  await new Promise((resolve) => setTimeout(resolve, 0))
  scanner = new Html5Qrcode("reader")

  try {
    await scanner.start(
      selectedCameraId.value,
      { fps: 10, qrbox: { width: 250, height: 150 } },
      onScanSuccess,
      () => {}
    )
  } catch (err) {
    console.error(err)
    scanError.value =
      "Kamera tidak bisa diakses. Pastikan izin kamera sudah diberikan dan kamera terhubung dengan baik."
    isScanning.value = false
  }
}

async function hentikanPindai() {
  if (scanner) {
    try {
      await scanner.stop()
      scanner.clear()
    } catch (e) {}
    scanner = null
  }
  isScanning.value = false
}

async function onScanSuccess(decodedText) {
  barcode.value = decodedText
  await hentikanPindai()
  await cariBuku(decodedText)
}

async function handleFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  resetHasilPindai()
  if (!scanner) scanner = new Html5Qrcode("reader")
  try {
    const decodedText = await scanner.scanFile(file, true)
    barcode.value = decodedText.trim()        // 👈 pastikan ada .trim() di sini
    await cariBuku(barcode.value)              // 👈 pastikan pakai barcode.value, BUKAN decodedText langsung
  } catch (err) {
    scanError.value =
      "Barcode tidak terbaca dari gambar ini. Coba foto lain yang lebih jelas dan tidak buram."
  } finally {
    e.target.value = ""
  }
}

async function cariBuku(kodeBarcode) {
  console.log('RAW:', JSON.stringify(kodeBarcode), 'LENGTH:', kodeBarcode.length)   // 👈 baris baru
  try {
    const res = await fetch(`/api/eksemplar-buku/${kodeBarcode}`)
    if (res.status === 404) {
      bookNotFound.value = true
      bookData.value = null
      currentStep.value = 1
      return
    }
    if (!res.ok) throw new Error("Gagal mengambil data buku")
    bookData.value = await res.json()
    currentStep.value = 2
  } catch (err) {
    console.error(err)
    scanError.value = "Terjadi kesalahan saat mencari data buku."
  }
}

// ===== PINJAMAN =====
function mulaiPeminjaman() {
  if (!bookData.value) return
  saveSuccess.value = false
  scanError.value = ""
  currentStep.value = 3
}

function kembaliKeInformasiBuku() {
  currentStep.value = 2
  scanError.value = ""
}

async function simpanPeminjaman() {
  if (tipePeminjam.value === "siswa") {
    if (!peminjam.value.nama.trim() || !peminjam.value.kelas.trim()) {
      scanError.value = "Nama dan kelas siswa wajib diisi."
      return
    }
  } else {
    if (!peminjam.value.anggotaId || !peminjam.value.nama.trim()) {
      scanError.value = "Pilih guru dari daftar."
      return
    }
  }

  if (!peminjam.value.tanggalPinjam || !peminjam.value.tanggalKembali) {
    scanError.value = "Tanggal pinjam dan tanggal kembali wajib diisi."
    return
  }

  isSaving.value = true
  saveSuccess.value = false
  scanError.value = ""

  try {
    const res = await fetch("/api/peminjaman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eksemplarId: bookData.value.eksemplarId,
        nama: peminjam.value.nama,
        kelas: tipePeminjam.value === "siswa" ? peminjam.value.kelas : null,
        tanggalPinjam: peminjam.value.tanggalPinjam,
        tanggalKembali: peminjam.value.tanggalKembali,
        tipePeminjam: tipePeminjam.value,
        anggotaId: tipePeminjam.value === "guru" ? peminjam.value.anggotaId : null,
      }),
    })

    if (!res.ok) throw new Error("Gagal menyimpan peminjaman")
    saveSuccess.value = true
    resetForm()
  } catch (err) {
    console.error(err)
    scanError.value = "Gagal menyimpan data peminjaman. Coba lagi."
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  bookData.value = null
  barcode.value = ""
  kelasQuery.value = ""
  guruQuery.value = ""   // ← tambahkan ini
  tipePeminjam.value = "siswa"
  peminjam.value = {
    nama: "",
    kelas: "",
    tanggalPinjam: new Date().toISOString().slice(0, 10),
    tanggalKembali: "",
    anggotaId: null,
  }
  currentStep.value = 1
}

function mulaiScanLagi() {
  saveSuccess.value = false
  resetHasilPindai()
  activeTab.value = "kamera"
}

watch(activeTab, async (tab) => {
  if (tab !== "kamera" && isScanning.value) await hentikanPindai()
  if (currentStep.value === 1) {
    scanError.value = ""
    bookNotFound.value = false
  }
})

onBeforeUnmount(() => {
  if (scanner) hentikanPindai()
})
</script>

<template>
  <div class="scan-page">
    <div class="page-header">
      <div>
        <h1>Scan Buku</h1>
        <p>Scan barcode buku untuk memulai proses peminjaman.</p>
      </div>
    </div>

    <main class="process">
      <!-- STEP 1 : SCAN -->
      <section v-if="currentStep === 1" class="process-card">
        <div class="progress">
          <div class="progress-item progress-item--active"><span>1</span> Scan buku</div>
          <div class="progress-line"></div>
          <div class="progress-item"><span>2</span> Informasi buku</div>
          <div class="progress-line"></div>
          <div class="progress-item"><span>3</span> Data peminjam</div>
        </div>

        <div class="scan-box">
          <div class="scan-box__intro">
            <h2>Scan barcode buku</h2>
            <p>Gunakan kamera atau unggah foto barcode buku.</p>
          </div>

          <div class="scan-tabs">
            <button
              class="scan-tab"
              :class="{ 'scan-tab--active': activeTab === 'kamera' }"
              @click="activeTab = 'kamera'"
            >
              Kamera
            </button>
            <button
              class="scan-tab"
              :class="{ 'scan-tab--active': activeTab === 'unggah' }"
              @click="activeTab = 'unggah'"
            >
              Unggah foto
            </button>
          </div>

          <div class="scanner-area">
            <template v-if="activeTab === 'kamera'">
              <div v-if="!isScanning" class="scanner-idle">
                <h3>Siap memindai?</h3>
                <p>Arahkan kamera ke barcode yang terdapat pada buku.</p>

                <label v-if="availableCameras.length > 1" class="camera-select">
                  <span>Pilih kamera</span>
                  <select v-model="selectedCameraId">
                    <option v-for="cam in availableCameras" :key="cam.id" :value="cam.id">
                      {{ cam.label || cam.id }}
                    </option>
                  </select>
                </label>

                <button class="primary-button" @click="mulaiPindai">Mulai scan</button>
              </div>

              <div v-show="isScanning" class="viewfinder">
                <div id="reader"></div>
                <div class="viewfinder__info">Kamera aktif — arahkan ke barcode</div>
                <button class="secondary-button" @click="hentikanPindai">Batalkan</button>
              </div>
            </template>

            <template v-else>
              <div class="upload-zone" @click="fileInput.click()">
                <h3>Unggah foto barcode</h3>
                <p>Klik area ini untuk memilih foto barcode dari perangkat.</p>
                <span class="upload-hint">JPG, PNG atau WEBP</span>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="upload-zone__input"
                  @change="handleFileUpload"
                />
              </div>
              <div id="reader" class="reader-hidden"></div>
            </template>
          </div>

          <div v-if="scanError" class="message message--error">
            <div class="message__icon">!</div>
            <div>
              <strong>Terjadi masalah</strong>
              <p>{{ scanError }}</p>
            </div>
          </div>

          <div v-if="bookNotFound" class="message message--warning">
            <div class="message__icon">!</div>
            <div>
              <strong>Buku tidak ditemukan</strong>
              <p>
                Barcode <span class="mono">{{ barcode }}</span> belum terdaftar di katalog.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- STEP 2 : INFORMASI BUKU -->
      <section v-else-if="currentStep === 2 && bookData" class="process-card">
        <div class="progress">
          <div class="progress-item progress-item--done"><span>✓</span> Scan buku</div>
          <div class="progress-line progress-line--done"></div>
          <div class="progress-item progress-item--active"><span>2</span> Informasi buku</div>
          <div class="progress-line"></div>
          <div class="progress-item"><span>3</span> Data peminjam</div>
        </div>

        <div class="book-result">
          <div class="result-status">
            <span class="result-status__icon">✓</span>
            Barcode berhasil ditemukan
          </div>

          <div class="book-card">
            <div class="book-card__top">
              <div class="book-title">
                <span>INFORMASI BUKU</span>
                <h2>{{ bookData.judul }}</h2>
              </div>
              <span
                class="status-badge"
                :class="bookData.status === 'tersedia' ? 'status-badge--ok' : 'status-badge--warn'"
              >
                {{ bookData.status }}
              </span>
            </div>
            <div class="book-info-grid">
              <div class="book-info">
                <span>Penulis</span>
                <strong>{{ bookData.penulis }}</strong>
              </div>
              <div class="book-info">
                <span>Penerbit</span>
                <strong>{{ bookData.penerbit }}</strong>
              </div>
              <div class="book-info book-info--barcode">
                <span>Barcode</span>
                <strong class="mono">{{ barcode }}</strong>
              </div>
            </div>
          </div>

          <div v-if="bookData.status !== 'tersedia'" class="message message--warning">
            <div class="message__icon">!</div>
            <div>
              <strong>Buku belum tersedia</strong>
              <p>Buku ini tidak dapat dipinjam saat ini.</p>
            </div>
          </div>

          <div class="result-actions">
            <button class="secondary-light-button" @click="mulaiScanLagi">Scan buku lain</button>
            <button
              v-if="bookData.status === 'tersedia'"
              class="primary-button primary-button--large"
              @click="mulaiPeminjaman"
            >
              Mulai peminjaman
            </button>
          </div>
        </div>
      </section>

      <!-- STEP 3 : FORM PEMINJAMAN -->
      <section v-else-if="currentStep === 3 && bookData" class="process-card">
        <div class="progress">
          <div class="progress-item progress-item--done"><span>✓</span> Scan buku</div>
          <div class="progress-line progress-line--done"></div>
          <div class="progress-item progress-item--done"><span>✓</span> Informasi buku</div>
          <div class="progress-line progress-line--done"></div>
          <div class="progress-item progress-item--active"><span>3</span> Data peminjam</div>
        </div>

        <form class="borrow-form" @submit.prevent="simpanPeminjaman">
          <div class="borrow-book">
            <div>
              <span>Buku yang dipinjam</span>
              <strong>{{ bookData.judul }}</strong>
              <small>{{ barcode }}</small>
            </div>
          </div>

          <div class="form-intro">
            <h2>Data peminjam</h2>
            <p>Lengkapi data peminjam untuk menyelesaikan peminjaman.</p>
          </div>

          <!-- Pilih Siswa / Guru -->
          <div class="tipe-peminjam">
            <button
              type="button"
              class="tipe-btn"
              :class="{ 'tipe-btn--active': tipePeminjam === 'siswa' }"
              @click="gantiTipePeminjam('siswa')"
            >
              Siswa
            </button>
            <button
              type="button"
              class="tipe-btn"
              :class="{ 'tipe-btn--active': tipePeminjam === 'guru' }"
              @click="gantiTipePeminjam('guru')"
            >
              Guru
            </button>
          </div>

          <div class="form-grid">
            <!-- MODE SISWA -->
            <template v-if="tipePeminjam === 'siswa'">
              <label class="field">
                <span>Nama siswa</span>
                <div class="input-wrapper">
                  <input
                    v-model="peminjam.nama"
                    type="text"
                    required
                    placeholder="Masukkan nama siswa"
                  />
                </div>
              </label>

              <label class="field field--combobox">
                <span>Kelas</span>
                <div class="input-wrapper">
                  <input
                    ref="kelasInputRef"
                    v-model="kelasQuery"
                    type="text"
                    required
                    autocomplete="off"
                    placeholder="Ketik atau pilih kelas"
                    @input="onKelasInput"
                    @focus="showKelasDropdown = true"
                    @blur="tutupKelasDropdown"
                  />
                </div>
                <ul
                  v-if="showKelasDropdown && filteredKelas.length"
                  class="kelas-dropdown"
                >
                  <li
                    v-for="k in filteredKelas"
                    :key="k"
                    @mousedown.prevent="pilihKelas(k)"
                  >
                    {{ k }}
                  </li>
                </ul>
                <p
                  v-if="showKelasDropdown && !filteredKelas.length"
                  class="kelas-dropdown__empty"
                >
                  Kelas tidak ditemukan
                </p>
              </label>
            </template>

<!-- MODE GURU -->
<template v-else>
  <label class="field field--full field--combobox">
    <span>Nama guru</span>
    <div class="input-wrapper">
      <input
        v-model="guruQuery"
        type="text"
        required
        autocomplete="off"
        placeholder="Ketik atau pilih nama guru"
        @input="onGuruInput"
        @focus="showGuruDropdown = true"
        @blur="tutupGuruDropdown"
      />
    </div>
    <ul v-if="showGuruDropdown && filteredGuru.length" class="kelas-dropdown">
      <li v-for="g in filteredGuru" :key="g.id" @mousedown.prevent="pilihGuru(g)">
        {{ g.nama }}{{ g.mapel ? ` — ${g.mapel}` : "" }}
      </li>
    </ul>
    <ul v-else-if="showGuruDropdown && isGuruBaru" class="kelas-dropdown">
      <li @mousedown.prevent="tambahGuruBaru">
        + Tambahkan "{{ guruQuery.trim() }}" sebagai guru baru
      </li>
    </ul>
  </label>
</template>

            <label class="field">
              <span>Tanggal pinjam</span>
              <div class="input-wrapper">
                <input v-model="peminjam.tanggalPinjam" type="date" required />
              </div>
            </label>

            <label class="field">
              <span>Tanggal kembali</span>
              <div class="input-wrapper">
                <input v-model="peminjam.tanggalKembali" type="date" required />
              </div>
            </label>
          </div>

          <div v-if="scanError" class="message message--error">
            <div class="message__icon">!</div>
            <div>
              <strong>Terjadi masalah</strong>
              <p>{{ scanError }}</p>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="secondary-light-button" @click="kembaliKeInformasiBuku">
              Kembali
            </button>
            <button class="primary-button primary-button--large" type="submit" :disabled="isSaving">
              {{ isSaving ? "Menyimpan data..." : "Simpan peminjaman" }}
            </button>
          </div>

          <div v-if="saveSuccess" class="success-message">
            <span>✓</span>
            Peminjaman berhasil disimpan.
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.scan-page {
  --navy: #172b4d;
  --blue: #2864e8;
  --blue-light: #edf4ff;
  --text: #18243a;
  --muted: #718096;
  --background: #f5f8fc;
  --surface: #ffffff;
  --border: #e3e9f2;
  --green: #18865b;
  --green-bg: #eaf8f1;
  --orange: #d98216;
  --orange-bg: #fff6e7;
  --red: #c53d3d;
  --red-bg: #fff0f0;

  min-height: 100vh;
  padding: 12px 24px 40px;
  box-sizing: border-box;
  background: var(--background);
  color: var(--text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.scan-page *,
.scan-page *::before,
.scan-page *::after {
  box-sizing: border-box;
}

button, input, select { font: inherit; }

.page-header { margin-bottom: 12px; }
.page-header h1 { margin: 0; color: var(--navy); font-size: 18px; font-weight: 700; }
.page-header p { margin: 2px 0 0; color: #6b7280; font-size: 12px; }

.process { max-width: 820px; margin: 0 auto; }

.process-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(31, 56, 88, 0.06);
  overflow: hidden;
}

.progress {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fbfcfe;
  border-bottom: 1px solid var(--border);
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9aa7b8;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.progress-item span {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8d9bae;
  background: #edf1f6;
  border-radius: 50%;
  font-size: 10px;
}

.progress-item--active { color: var(--blue); }
.progress-item--active span { color: white; background: var(--blue); }
.progress-item--done { color: var(--green); }
.progress-item--done span { color: white; background: var(--green); }

.progress-line {
  flex: 1;
  height: 1px;
  min-width: 20px;
  margin: 0 10px;
  background: #e0e6ef;
}
.progress-line--done { background: #bfe4d1; }

.scan-box { padding: 18px 22px 22px; }
.scan-box__intro { margin-bottom: 14px; text-align: center; }
.scan-box__intro h2, .form-intro h2 {
  margin: 0 0 4px;
  color: var(--navy);
  font-size: 18px;
  font-weight: 750;
}
.scan-box__intro p, .form-intro p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.scan-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 480px;
  margin: 0 auto 14px;
  padding: 3px;
  background: #f3f6fa;
  border-radius: 10px;
}

.scan-tab {
  min-height: 38px;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}
.scan-tab--active {
  color: var(--blue);
  background: white;
  box-shadow: 0 2px 8px rgba(31, 56, 88, 0.07);
}

.scanner-area {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.scanner-idle { padding: 12px 16px; text-align: center; }
.scanner-idle h3 { margin: 0 0 5px; color: var(--navy); font-size: 15px; }
.scanner-idle > p {
  max-width: 360px;
  margin: 0 auto 14px;
  color: var(--muted);
  font-size: 12px;
}

.camera-select {
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0 auto 12px;
  text-align: left;
}
.camera-select span { color: var(--muted); font-size: 11px; font-weight: 650; }
.camera-select select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 18px;
  color: white;
  background: var(--blue);
  border: 0;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.primary-button--large { min-height: 44px; font-size: 13px; }
.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }

.secondary-button {
  display: block;
  margin: 10px auto 0;
  padding: 8px 14px;
  color: white;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}

.secondary-light-button {
  min-height: 40px;
  padding: 0 16px;
  color: var(--navy);
  background: white;
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.viewfinder {
  position: relative;
  overflow: hidden;
  min-height: 260px;
  background: #071426;
  border-radius: 12px;
}

:deep(#reader) { width: 100% !important; border: 0 !important; }
:deep(#reader video) {
  width: 100% !important;
  height: 260px !important;
  object-fit: cover !important;
  display: block;
}
.reader-hidden { display: none; }

.viewfinder__info {
  position: absolute;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  padding: 6px 10px;
  color: white;
  background: rgba(7, 20, 38, 0.72);
  border-radius: 999px;
  font-size: 11px;
}

.upload-zone {
  position: relative;
  padding: 36px 20px;
  text-align: center;
  background: #f9fbff;
  border: 1.5px dashed #c9d7ea;
  border-radius: 12px;
  cursor: pointer;
}
.upload-zone__input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.upload-hint {
  display: inline-block;
  padding: 4px 8px;
  color: var(--muted);
  background: white;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 10px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 11px;
  border-radius: 10px;
  font-size: 12px;
}
.message__icon {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 800;
}
.message strong { display: block; margin-bottom: 2px; }
.message p { margin: 0; line-height: 1.45; }
.message--error { color: var(--red); background: var(--red-bg); border: 1px solid #ffd6d6; }
.message--error .message__icon { background: #ffdada; }
.message--warning { color: var(--orange); background: var(--orange-bg); border: 1px solid #ffe2b4; }
.message--warning .message__icon { background: #ffe7c5; }

.book-result { padding: 24px; }
.result-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--green);
  font-size: 12px;
  font-weight: 700;
}
.result-status__icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: var(--green);
  border-radius: 50%;
}

.book-card {
  overflow: hidden;
  background: white;
  border: 1px solid var(--border);
  border-radius: 14px;
}
.book-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px;
  background: linear-gradient(135deg, #f8fbff, #eef5ff);
  border-bottom: 1px solid var(--border);
}
.book-title > span {
  display: block;
  margin-bottom: 3px;
  color: var(--blue);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
}
.book-title h2 { margin: 0; color: var(--navy); font-size: 16px; }

.status-badge {
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
}
.status-badge--ok { color: var(--green); background: var(--green-bg); }
.status-badge--warn { color: var(--orange); background: var(--orange-bg); }

.book-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px 18px 6px;
}
.book-info { padding: 12px 4px; border-bottom: 1px solid #edf1f6; }
.book-info--barcode { grid-column: 1 / -1; }
.book-info span {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}
.book-info strong { display: block; font-size: 12px; }

.mono {
  font-family: "IBM Plex Mono", Consolas, monospace;
  font-size: 11px !important;
  word-break: break-all;
}

.result-actions, .form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
}

.borrow-form { padding: 24px; }
.borrow-book {
  margin-bottom: 22px;
  padding: 12px;
  background: var(--blue-light);
  border: 1px solid #cfe0ff;
  border-radius: 12px;
}
.borrow-book span, .borrow-book small {
  display: block;
  color: var(--muted);
  font-size: 10px;
}
.borrow-book strong {
  display: block;
  margin: 2px 0;
  color: var(--navy);
  font-size: 13px;
}

.form-intro { margin-bottom: 16px; }

.tipe-peminjam {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-width: 320px;
  margin-bottom: 18px;
  padding: 4px;
  background: #f3f6fa;
  border-radius: 10px;
}
.tipe-btn {
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #718096;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.tipe-btn--active {
  background: #fff;
  color: var(--blue);
  box-shadow: 0 2px 8px rgba(31, 56, 88, 0.08);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field--full { grid-column: 1 / -1; }
.field > span {
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
}
.input-wrapper { position: relative; }
.field input, .select-guru {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  color: var(--text);
  background: #fbfcfe;
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  font-size: 12px;
}
.field input:focus, .select-guru:focus {
  background: white;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(40, 100, 232, 0.1);
}

.kelas-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: 5px;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(31, 56, 88, 0.12);
}
.kelas-dropdown li {
  padding: 8px 9px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.kelas-dropdown li:hover {
  color: var(--blue);
  background: var(--blue-light);
}
.kelas-dropdown__empty {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: 9px;
  color: var(--muted);
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 11px;
}

.success-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px;
  color: var(--green);
  background: var(--green-bg);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 650;
}

@media (max-width: 700px) {
  .form-grid { grid-template-columns: 1fr; }
  .result-actions, .form-actions { flex-direction: column-reverse; }
  .result-actions > *, .form-actions > * { width: 100%; }
}

@media (max-width: 480px) {
  .scan-page {
    padding: 10px 12px 28px;
  }

  .page-header h1 {
    font-size: 16px;
  }

  .process-card {
    border-radius: 12px;
  }

  /* Progress stepper: sembunyikan teks label, sisakan angka/centang saja */
  .progress {
    padding: 10px 12px;
  }
  .progress-item span {
    width: 20px;
    height: 20px;
    font-size: 9px;
  }
  .progress-item {
    font-size: 0;
    gap: 0;
  }
  .progress-item span {
    font-size: 10px;
  }
  .progress-line {
    margin: 0 6px;
    min-width: 12px;
  }

  .scan-box {
    padding: 14px 14px 18px;
  }
  .scan-box__intro h2, .form-intro h2 {
    font-size: 16px;
  }

  .scan-tabs {
    max-width: 100%;
  }

  .scanner-idle {
    padding: 8px 4px;
  }

  :deep(#reader video) {
    height: 220px !important;
  }
  .viewfinder {
    min-height: 220px;
  }

  .upload-zone {
    padding: 26px 14px;
  }

  .book-result {
    padding: 16px;
  }
  .book-card__top {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .book-info-grid {
    grid-template-columns: 1fr;
    padding: 4px 14px 6px;
  }

  .borrow-form {
    padding: 16px;
  }

  .tipe-peminjam {
    max-width: 100%;
  }

  .result-actions, .form-actions {
    gap: 8px;
  }
}
</style>