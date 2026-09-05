<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
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

const peminjam = ref({
  nama: "",
  kelas: "",
  tanggalPinjam: new Date().toISOString().slice(0, 10),
  tanggalKembali: "",
})

function resetHasilPindai() {
  scanError.value = ""
  bookNotFound.value = false
  bookData.value = null
}

async function siapkanDaftarKamera() {
  try {
    const cams = await Html5Qrcode.getCameras()

    availableCameras.value = cams

    if (cams.length > 0 && !selectedCameraId.value) {
      const belakang = cams.find((k) =>
        /back|belakang|rear/i.test(k.label)
      )

      selectedCameraId.value = belakang
        ? belakang.id
        : cams[0].id
    }
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  siapkanDaftarKamera()
})

async function mulaiPindai() {
  resetHasilPindai()

  if (!selectedCameraId.value) {
    await siapkanDaftarKamera()
  }

  if (!selectedCameraId.value) {
    scanError.value =
      "Tidak ada kamera terdeteksi di perangkat ini."
    return
  }

  isScanning.value = true

  await new Promise((resolve) => setTimeout(resolve, 0))

  scanner = new Html5Qrcode("reader")

  try {
    await scanner.start(
      selectedCameraId.value,
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 150,
        },
      },
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
    } catch (e) {
      // scanner belum sempat start
    }

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

  if (!scanner) {
    scanner = new Html5Qrcode("reader")
  }

  try {
    const decodedText = await scanner.scanFile(file, true)

    barcode.value = decodedText

    await cariBuku(decodedText)
  } catch (err) {
    scanError.value =
      "Barcode tidak terbaca dari gambar ini. Coba foto lain yang lebih jelas dan tidak buram."
  } finally {
    e.target.value = ""
  }
}

async function cariBuku(kodeBarcode) {
  try {
    const res = await fetch(
      `/api/eksemplar-buku/${kodeBarcode}`
    )

    if (res.status === 404) {
      bookNotFound.value = true
      bookData.value = null
      return
    }

    if (!res.ok) {
      throw new Error("Gagal mengambil data buku")
    }

    bookData.value = await res.json()
  } catch (err) {
    scanError.value =
      "Terjadi kesalahan saat mencari data buku."
  }
}

async function simpanPeminjaman() {
  isSaving.value = true
  saveSuccess.value = false

  try {
    const res = await fetch("/api/peminjaman", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eksemplarId: bookData.value.eksemplarId,
        nama: peminjam.value.nama,
        kelas: peminjam.value.kelas,
        tanggalPinjam: peminjam.value.tanggalPinjam,
        tanggalKembali: peminjam.value.tanggalKembali,
      }),
    })

    if (!res.ok) {
      throw new Error("Gagal menyimpan peminjaman")
    }

    saveSuccess.value = true

    resetForm()
  } catch (err) {
    scanError.value =
      "Gagal menyimpan data peminjaman. Coba lagi."
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  bookData.value = null
  barcode.value = ""

  peminjam.value = {
    nama: "",
    kelas: "",
    tanggalPinjam: new Date()
      .toISOString()
      .slice(0, 10),
    tanggalKembali: "",
  }
}

watch(activeTab, async (tab) => {
  resetHasilPindai()

  if (tab !== "kamera" && isScanning.value) {
    await hentikanPindai()
  }
})

onBeforeUnmount(() => {
  if (scanner) {
    hentikanPindai()
  }
})
</script>

<template>
  <div class="scan-page">

    <!-- ================= HEADER ================= -->
    <header class="scan-header">

      <div class="scan-header__content">

        <div class="scan-header__icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 8v8" />
            <path d="M10 8v8" />
            <path d="M14 8v8" />
            <path d="M17 8v8" />
          </svg>
        </div>

        <div>
          <span class="scan-header__eyebrow">
            KOLEKSI PERPUSTAKAAN
          </span>

          <h1 class="scan-header__title">
            Pindai buku masuk
          </h1>

          <p class="scan-header__subtitle">
            Gunakan kamera atau unggah foto barcode untuk
            menemukan data buku secara otomatis.
          </p>
        </div>

      </div>

      <div class="scan-header__badge">
        <span class="status-dot"></span>
        Sistem siap digunakan
      </div>

    </header>


    <!-- ================= MAIN ================= -->
    <main class="scan-layout">

      <!-- ================= SCANNER ================= -->
      <section class="scanner-card">

        <div class="scanner-card__header">

          <div>
            <span class="section-label">
              LANGKAH 01
            </span>

            <h2>
              Pindai barcode
            </h2>

            <p>
              Pilih metode yang ingin digunakan.
            </p>
          </div>

        </div>


        <!-- TABS -->
        <div class="scan-tabs">

          <button
            class="scan-tab"
            :class="{
              'scan-tab--active': activeTab === 'kamera'
            }"
            @click="activeTab = 'kamera'"
          >
            <span class="scan-tab__icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
                />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </span>

            <span>
              <strong>Pindai kamera</strong>
              <small>Gunakan kamera perangkat</small>
            </span>
          </button>


          <button
            class="scan-tab"
            :class="{
              'scan-tab--active': activeTab === 'unggah'
            }"
            @click="activeTab = 'unggah'"
          >
            <span class="scan-tab__icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path
                  d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
                />
              </svg>
            </span>

            <span>
              <strong>Unggah foto</strong>
              <small>Gunakan foto barcode</small>
            </span>
          </button>

        </div>


        <!-- SCANNER BODY -->
        <div class="scanner-card__body">

          <!-- CAMERA IDLE -->
          <template v-if="activeTab === 'kamera'">

            <div
              v-if="!isScanning && !bookData"
              class="scanner-idle"
            >

              <div class="scanner-illustration">
                <div class="scanner-illustration__corner scanner-illustration__corner--tl"></div>
                <div class="scanner-illustration__corner scanner-illustration__corner--tr"></div>
                <div class="scanner-illustration__corner scanner-illustration__corner--bl"></div>
                <div class="scanner-illustration__corner scanner-illustration__corner--br"></div>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                  />

                  <path d="M7 8v8" />
                  <path d="M10 8v8" />
                  <path d="M14 8v8" />
                  <path d="M17 8v8" />
                </svg>
              </div>

              <h3>
                Siap memindai buku?
              </h3>

              <p>
                Arahkan kamera ke barcode yang terdapat
                pada sampul belakang buku.
              </p>


              <label
                v-if="availableCameras.length > 1"
                class="camera-select"
              >
                <span>Pilih kamera</span>

                <select v-model="selectedCameraId">
                  <option
                    v-for="cam in availableCameras"
                    :key="cam.id"
                    :value="cam.id"
                  >
                    {{ cam.label || cam.id }}
                  </option>
                </select>
              </label>


              <button
                class="primary-button"
                @click="mulaiPindai"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
                  />
                  <circle cx="12" cy="13" r="3" />
                </svg>

                Mulai pindai
              </button>

            </div>


            <!-- CAMERA ACTIVE -->
            <div
              v-show="isScanning"
              class="viewfinder"
            >

              <div id="reader"></div>

              <div class="scan-frame">

                <span class="scan-frame__corner scan-frame__corner--tl"></span>
                <span class="scan-frame__corner scan-frame__corner--tr"></span>
                <span class="scan-frame__corner scan-frame__corner--bl"></span>
                <span class="scan-frame__corner scan-frame__corner--br"></span>

                <span class="scan-line"></span>

              </div>

              <div class="viewfinder__info">
                <span class="live-dot"></span>
                Kamera aktif — arahkan ke barcode
              </div>

              <button
                class="secondary-button"
                @click="hentikanPindai"
              >
                Batalkan
              </button>

            </div>

          </template>


          <!-- UPLOAD -->
          <template v-else>

            <div
              class="upload-zone"
              @click="fileInput.click()"
            >

              <div class="upload-icon">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <path
                    d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
                  />
                </svg>

              </div>

              <h3>
                Unggah foto barcode
              </h3>

              <p>
                Klik area ini untuk memilih foto barcode
                dari perangkat.
              </p>

              <span class="upload-hint">
                JPG, PNG atau WEBP
              </span>

              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="upload-zone__input"
                @change="handleFileUpload"
              />

            </div>

            <div
              id="reader"
              class="reader-hidden"
            ></div>

          </template>


          <!-- ERROR -->
          <div
            v-if="scanError"
            class="message message--error"
          >
            <div class="message__icon">
              !
            </div>

            <div>
              <strong>Terjadi masalah</strong>
              <p>{{ scanError }}</p>
            </div>
          </div>


          <!-- NOT FOUND -->
          <div
            v-if="bookNotFound"
            class="message message--warning"
          >
            <div class="message__icon">
              !
            </div>

            <div>
              <strong>Buku tidak ditemukan</strong>

              <p>
                Barcode
                <span class="mono">
                  {{ barcode }}
                </span>
                belum terdaftar di katalog.
              </p>
            </div>
          </div>

        </div>
      </section>


      <!-- ================= RESULT ================= -->
      <section class="result-section">

        <div class="result-heading">

          <div>
            <span class="section-label">
              LANGKAH 02
            </span>

            <h2>
              Data buku
            </h2>
          </div>

          <span
            v-if="bookData"
            class="result-complete"
          >
            ✓ Ditemukan
          </span>

        </div>


        <!-- EMPTY -->
        <div
          v-if="!bookData"
          class="empty-result"
        >

          <div class="empty-result__icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <path
                d="M4 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
              />
              <path d="M8 7h6" />
              <path d="M8 11h6" />
              <path d="M8 15h4" />
            </svg>
          </div>

          <h3>
            Belum ada data buku
          </h3>

          <p>
            Setelah barcode berhasil dibaca,
            informasi buku akan tampil di sini.
          </p>

          <div class="empty-result__step">
            <span>1</span>
            <p>Pindai barcode buku</p>
          </div>

          <div class="empty-result__step">
            <span>2</span>
            <p>Periksa informasi buku</p>
          </div>

          <div class="empty-result__step">
            <span>3</span>
            <p>Isi data peminjam</p>
          </div>

        </div>


        <!-- BOOK DATA -->
        <template v-if="bookData">

          <div class="book-card">

            <div class="book-card__top">

              <div class="book-card__book-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                >
                  <path
                    d="M5 4a2 2 0 0 1 2-2h10v20H7a2 2 0 0 1-2-2V4Z"
                  />
                  <path d="M17 2v20" />
                  <path d="M8 7h5" />
                  <path d="M8 11h5" />
                </svg>
              </div>

              <div>
                <span class="book-card__label">
                  INFORMASI BUKU
                </span>

                <h3>
                  {{ bookData.judul }}
                </h3>
              </div>

              <span
                class="status-badge"
                :class="
                  bookData.status === 'tersedia'
                    ? 'status-badge--ok'
                    : 'status-badge--warn'
                "
              >
                <span></span>
                {{ bookData.status }}
              </span>

            </div>


            <div class="book-info-grid">

              <div class="book-info">
                <span>Penulis</span>
                <strong>
                  {{ bookData.penulis }}
                </strong>
              </div>

              <div class="book-info">
                <span>Penerbit</span>
                <strong>
                  {{ bookData.penerbit }}
                </strong>
              </div>

              <div class="book-info book-info--barcode">
                <span>Barcode</span>
                <strong class="mono">
                  {{ barcode }}
                </strong>
              </div>

            </div>

          </div>


          <!-- BORROWER FORM -->
          <form
            class="borrow-card"
            @submit.prevent="simpanPeminjaman"
          >

            <div class="borrow-card__header">

              <div class="borrow-card__number">
                03
              </div>

              <div>
                <span class="section-label">
                  LANGKAH 03
                </span>

                <h2>
                  Data peminjam
                </h2>

                <p>
                  Lengkapi informasi siswa yang meminjam buku.
                </p>
              </div>

            </div>


            <div class="form-grid">

              <label class="field">
                <span>
                  Nama siswa
                </span>

                <div class="input-wrapper">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                  >
                    <circle cx="12" cy="8" r="3" />
                    <path
                      d="M5 21a7 7 0 0 1 14 0"
                    />
                  </svg>

                  <input
                    v-model="peminjam.nama"
                    type="text"
                    required
                    placeholder="Masukkan nama siswa"
                  />
                </div>
              </label>


              <label class="field">
                <span>
                  Kelas
                </span>

                <div class="input-wrapper">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                  >
                    <path
                      d="M4 5h16v14H4z"
                    />
                    <path d="M8 9h8" />
                    <path d="M8 13h5" />
                  </svg>

                  <input
                    v-model="peminjam.kelas"
                    type="text"
                    required
                    placeholder="Contoh: XII RPL 2"
                  />
                </div>
              </label>


              <label class="field">
                <span>
                  Tanggal pinjam
                </span>

                <div class="input-wrapper">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="16"
                      rx="2"
                    />
                    <path d="M16 3v4" />
                    <path d="M8 3v4" />
                    <path d="M3 10h18" />
                  </svg>

                  <input
                    v-model="peminjam.tanggalPinjam"
                    type="date"
                    required
                  />
                </div>
              </label>


              <label class="field">
                <span>
                  Tanggal kembali
                </span>

                <div class="input-wrapper">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="16"
                      rx="2"
                    />
                    <path d="M16 3v4" />
                    <path d="M8 3v4" />
                    <path d="M3 10h18" />
                  </svg>

                  <input
                    v-model="peminjam.tanggalKembali"
                    type="date"
                    required
                  />
                </div>
              </label>

            </div>


            <button
              class="save-button"
              type="submit"
              :disabled="isSaving"
            >

              <span v-if="!isSaving">
                Simpan peminjaman
              </span>

              <span v-else>
                Menyimpan data...
              </span>

              <svg
                v-if="!isSaving"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>

            </button>


            <div
              v-if="saveSuccess"
              class="success-message"
            >
              <span>✓</span>
              Peminjaman berhasil disimpan.
            </div>

          </form>

        </template>

      </section>

    </main>

  </div>
</template>


<style scoped>
/* =========================================================
   BASE
========================================================= */

.scan-page {
  --navy: #172b4d;
  --navy-dark: #0f1f38;
  --blue: #2864e8;
  --blue-light: #edf4ff;
  --blue-border: #cfe0ff;

  --text: #18243a;
  --muted: #718096;
  --muted-light: #9aa7b8;

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
  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(40, 100, 232, 0.055),
      transparent 28%
    ),
    var(--background);

  color: var(--text);

  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  padding: 42px 30px 70px;

  box-sizing: border-box;
}

.scan-page *,
.scan-page *::before,
.scan-page *::after {
  box-sizing: border-box;
}

button,
input,
select {
  font: inherit;
}


/* =========================================================
   HEADER
========================================================= */

.scan-header {
  max-width: 1180px;
  margin: 0 auto 34px;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 30px;
}

.scan-header__content {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.scan-header__icon {
  width: 52px;
  height: 52px;

  flex: 0 0 52px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--blue);

  background: var(--blue-light);
  border: 1px solid var(--blue-border);

  border-radius: 14px;
}

.scan-header__icon svg {
  width: 27px;
  height: 27px;
}

.scan-header__eyebrow,
.section-label {
  display: block;

  color: var(--blue);

  font-size: 10px;
  font-weight: 800;

  letter-spacing: 0.12em;
}

.scan-header__title {
  margin: 6px 0 7px;

  color: var(--navy);

  font-family:
    Georgia,
    "Times New Roman",
    serif;

  font-size: clamp(30px, 3vw, 40px);
  line-height: 1.1;

  letter-spacing: -0.025em;
}

.scan-header__subtitle {
  max-width: 650px;

  margin: 0;

  color: var(--muted);

  font-size: 14px;
  line-height: 1.65;
}

.scan-header__badge {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 9px 13px;

  color: var(--green);

  background: var(--green-bg);
  border: 1px solid #cceede;

  border-radius: 999px;

  white-space: nowrap;

  font-size: 12px;
  font-weight: 600;
}

.status-dot,
.live-dot {
  width: 7px;
  height: 7px;

  display: block;

  background: currentColor;

  border-radius: 50%;
}


/* =========================================================
   MAIN LAYOUT
========================================================= */

.scan-layout {
  max-width: 1180px;
  margin: 0 auto;

  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

  gap: 24px;

  align-items: start;
}


/* =========================================================
   SCANNER CARD
========================================================= */

.scanner-card,
.book-card,
.borrow-card {
  background: var(--surface);

  border: 1px solid var(--border);

  border-radius: 18px;

  box-shadow:
    0 8px 30px rgba(31, 56, 88, 0.055);
}

.scanner-card {
  overflow: hidden;
}

.scanner-card__header {
  padding: 25px 27px 20px;
}

.scanner-card__header h2,
.result-heading h2,
.borrow-card h2 {
  margin: 5px 0 4px;

  color: var(--navy);

  font-size: 19px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.scanner-card__header p,
.borrow-card__header p {
  margin: 0;

  color: var(--muted);

  font-size: 13px;
  line-height: 1.5;
}


/* =========================================================
   TABS
========================================================= */

.scan-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;

  padding: 0 14px;

  border-bottom: 1px solid var(--border);
}

.scan-tab {
  position: relative;

  display: flex;
  align-items: center;

  gap: 11px;

  padding: 15px 12px;

  color: var(--muted);

  background: transparent;

  border: 0;

  cursor: pointer;

  text-align: left;

  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.scan-tab:hover {
  color: var(--blue);
}

.scan-tab::after {
  content: "";

  position: absolute;

  left: 10px;
  right: 10px;
  bottom: -1px;

  height: 3px;

  background: transparent;

  border-radius: 4px 4px 0 0;
}

.scan-tab--active {
  color: var(--blue);
}

.scan-tab--active::after {
  background: var(--blue);
}

.scan-tab__icon {
  width: 35px;
  height: 35px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #f5f7fb;

  border-radius: 9px;
}

.scan-tab--active .scan-tab__icon {
  background: var(--blue-light);
}

.scan-tab__icon svg {
  width: 18px;
  height: 18px;
}

.scan-tab strong {
  display: block;

  font-size: 13px;
  font-weight: 700;
}

.scan-tab small {
  display: block;

  margin-top: 2px;

  font-size: 10px;

  color: var(--muted-light);
}


/* =========================================================
   SCANNER BODY
========================================================= */

.scanner-card__body {
  padding: 24px;

  min-height: 420px;

  display: flex;
  flex-direction: column;
  justify-content: center;
}


/* =========================================================
   IDLE CAMERA
========================================================= */

.scanner-idle {
  text-align: center;
}

.scanner-illustration {
  width: 128px;
  height: 105px;

  position: relative;

  margin: 0 auto 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--blue);

  background:
    linear-gradient(
      135deg,
      #f5f8ff,
      #eaf2ff
    );

  border: 1px solid var(--blue-border);

  border-radius: 18px;
}

.scanner-illustration svg {
  width: 48px;
  height: 48px;
}

.scanner-illustration__corner {
  position: absolute;

  width: 18px;
  height: 18px;

  border-color: var(--blue);
}

.scanner-illustration__corner--tl {
  top: 13px;
  left: 13px;

  border-top: 2px solid;
  border-left: 2px solid;

  border-radius: 4px 0 0 0;
}

.scanner-illustration__corner--tr {
  top: 13px;
  right: 13px;

  border-top: 2px solid;
  border-right: 2px solid;

  border-radius: 0 4px 0 0;
}

.scanner-illustration__corner--bl {
  bottom: 13px;
  left: 13px;

  border-bottom: 2px solid;
  border-left: 2px solid;

  border-radius: 0 0 0 4px;
}

.scanner-illustration__corner--br {
  right: 13px;
  bottom: 13px;

  border-right: 2px solid;
  border-bottom: 2px solid;

  border-radius: 0 0 4px 0;
}

.scanner-idle h3,
.upload-zone h3,
.empty-result h3 {
  margin: 0 0 7px;

  color: var(--navy);

  font-size: 16px;
  font-weight: 750;
}

.scanner-idle > p,
.upload-zone > p,
.empty-result > p {
  max-width: 390px;

  margin: 0 auto 20px;

  color: var(--muted);

  font-size: 13px;
  line-height: 1.6;
}


/* =========================================================
   CAMERA SELECT
========================================================= */

.camera-select {
  max-width: 340px;

  display: flex;
  flex-direction: column;
  gap: 6px;

  margin: 0 auto 16px;

  text-align: left;
}

.camera-select span {
  color: var(--muted);

  font-size: 11px;
  font-weight: 650;
}

.camera-select select {
  width: 100%;

  padding: 11px 12px;

  color: var(--text);

  background: white;

  border: 1px solid var(--border);
  border-radius: 9px;

  outline: none;

  cursor: pointer;
}

.camera-select select:focus {
  border-color: var(--blue);

  box-shadow:
    0 0 0 3px rgba(40, 100, 232, 0.1);
}


/* =========================================================
   BUTTONS
========================================================= */

.primary-button,
.save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;

  border: 0;

  color: white;

  background: var(--blue);

  border-radius: 10px;

  font-weight: 700;

  cursor: pointer;

  box-shadow:
    0 5px 15px rgba(40, 100, 232, 0.2);

  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.primary-button {
  min-height: 44px;

  padding: 0 20px;

  font-size: 13px;
}

.primary-button svg,
.save-button svg {
  width: 17px;
  height: 17px;
}

.primary-button:hover,
.save-button:hover {
  background: #2059d6;

  transform: translateY(-1px);

  box-shadow:
    0 7px 18px rgba(40, 100, 232, 0.25);
}

.primary-button:active,
.save-button:active {
  transform: translateY(0);
}

.secondary-button {
  display: block;

  margin: 12px auto 0;

  padding: 9px 16px;

  color: white;

  background: rgba(255, 255, 255, 0.12);

  border: 1px solid rgba(255, 255, 255, 0.3);

  border-radius: 8px;

  cursor: pointer;

  font-size: 12px;
  font-weight: 600;
}


/* =========================================================
   VIEWFINDER
========================================================= */

.viewfinder {
  position: relative;

  overflow: hidden;

  min-height: 360px;

  background: #071426;

  border-radius: 14px;
}

:deep(#reader) {
  width: 100% !important;

  border: 0 !important;
}

:deep(#reader video) {
  width: 100% !important;

  height: 360px !important;

  object-fit: cover !important;

  display: block;
}

:deep(#reader__scan_region) {
  min-height: 360px;
}

:deep(#reader img) {
  display: none !important;
}

.reader-hidden {
  display: none;
}

.scan-frame {
  position: absolute;

  left: 50%;
  top: 50%;

  width: min(72%, 320px);
  height: 150px;

  transform: translate(-50%, -50%);

  pointer-events: none;
}

.scan-frame__corner {
  position: absolute;

  width: 30px;
  height: 30px;

  border-color: #ffb62e;
}

.scan-frame__corner--tl {
  top: 0;
  left: 0;

  border-top: 3px solid;
  border-left: 3px solid;

  border-radius: 7px 0 0 0;
}

.scan-frame__corner--tr {
  top: 0;
  right: 0;

  border-top: 3px solid;
  border-right: 3px solid;

  border-radius: 0 7px 0 0;
}

.scan-frame__corner--bl {
  bottom: 0;
  left: 0;

  border-bottom: 3px solid;
  border-left: 3px solid;

  border-radius: 0 0 0 7px;
}

.scan-frame__corner--br {
  right: 0;
  bottom: 0;

  border-right: 3px solid;
  border-bottom: 3px solid;

  border-radius: 0 0 7px 0;
}

.scan-line {
  position: absolute;

  left: 8px;
  right: 8px;
  top: 50%;

  height: 2px;

  background: #ffb62e;

  box-shadow:
    0 0 12px rgba(255, 182, 46, 0.9);

  animation: scanMove 2s ease-in-out infinite;
}

@keyframes scanMove {
  0%,
  100% {
    transform: translateY(-55px);
  }

  50% {
    transform: translateY(55px);
  }
}

.viewfinder__info {
  position: absolute;

  left: 50%;
  bottom: 57px;

  transform: translateX(-50%);

  display: flex;
  align-items: center;
  gap: 7px;

  width: max-content;
  max-width: 90%;

  padding: 7px 11px;

  color: white;

  background: rgba(7, 20, 38, 0.72);

  backdrop-filter: blur(5px);

  border-radius: 999px;

  font-size: 11px;
}

.viewfinder__info .live-dot {
  color: #ffb62e;
}


/* =========================================================
   UPLOAD
========================================================= */

.upload-zone {
  position: relative;

  padding: 55px 25px;

  text-align: center;

  background:
    linear-gradient(
      145deg,
      #f9fbff,
      #f3f7fd
    );

  border: 1.5px dashed #c9d7ea;

  border-radius: 15px;

  cursor: pointer;

  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.upload-zone:hover {
  border-color: var(--blue);

  background: var(--blue-light);

  transform: translateY(-1px);
}

.upload-icon {
  width: 62px;
  height: 62px;

  margin: 0 auto 17px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--blue);

  background: white;

  border: 1px solid var(--blue-border);

  border-radius: 16px;

  box-shadow:
    0 8px 20px rgba(40, 100, 232, 0.08);
}

.upload-icon svg {
  width: 28px;
  height: 28px;
}

.upload-zone__input {
  position: absolute;

  inset: 0;

  opacity: 0;

  cursor: pointer;
}

.upload-hint {
  display: inline-block;

  padding: 5px 9px;

  color: var(--muted);

  background: white;

  border: 1px solid var(--border);

  border-radius: 999px;

  font-size: 10px;
}


/* =========================================================
   MESSAGES
========================================================= */

.message {
  display: flex;
  align-items: flex-start;

  gap: 11px;

  margin-top: 17px;

  padding: 13px;

  border-radius: 11px;

  font-size: 12px;
}

.message__icon {
  width: 25px;
  height: 25px;

  flex: 0 0 25px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  font-weight: 800;
}

.message strong {
  display: block;

  margin-bottom: 3px;

  font-size: 12px;
}

.message p {
  margin: 0;

  line-height: 1.5;
}

.message--error {
  color: var(--red);

  background: var(--red-bg);

  border: 1px solid #ffd6d6;
}

.message--error .message__icon {
  background: #ffdada;
}

.message--warning {
  color: var(--orange);

  background: var(--orange-bg);

  border: 1px solid #ffe2b4;
}

.message--warning .message__icon {
  background: #ffe7c5;
}


/* =========================================================
   RESULT SECTION
========================================================= */

.result-section {
  min-width: 0;
}

.result-heading {
  min-height: 76px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 2px;
}

.result-complete {
  padding: 7px 10px;

  color: var(--green);

  background: var(--green-bg);

  border-radius: 999px;

  font-size: 11px;
  font-weight: 700;
}


/* =========================================================
   EMPTY RESULT
========================================================= */

.empty-result {
  min-height: 420px;

  padding: 35px 28px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  text-align: center;

  background: rgba(255, 255, 255, 0.7);

  border: 1.5px dashed #d5dfec;

  border-radius: 18px;
}

.empty-result__icon {
  width: 70px;
  height: 70px;

  margin-bottom: 18px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: #7c91ad;

  background: #edf2f8;

  border-radius: 18px;
}

.empty-result__icon svg {
  width: 32px;
  height: 32px;
}

.empty-result > p {
  max-width: 330px;

  margin-bottom: 24px;
}

.empty-result__step {
  width: min(100%, 300px);

  display: flex;
  align-items: center;

  gap: 11px;

  padding: 9px 0;

  border-top: 1px solid #e8edf4;

  text-align: left;
}

.empty-result__step span {
  width: 25px;
  height: 25px;

  display: flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 25px;

  color: var(--blue);

  background: var(--blue-light);

  border-radius: 50%;

  font-size: 10px;
  font-weight: 800;
}

.empty-result__step p {
  margin: 0;

  color: var(--muted);

  font-size: 11px;
}


/* =========================================================
   BOOK CARD
========================================================= */

.book-card {
  overflow: hidden;
}

.book-card__top {
  position: relative;

  display: grid;

  grid-template-columns: auto 1fr auto;

  gap: 14px;

  align-items: center;

  padding: 23px 23px 20px;

  background:
    linear-gradient(
      135deg,
      #f8fbff,
      #eef5ff
    );

  border-bottom: 1px solid var(--border);
}

.book-card__book-icon {
  width: 46px;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--blue);

  background: white;

  border: 1px solid var(--blue-border);

  border-radius: 12px;
}

.book-card__book-icon svg {
  width: 23px;
  height: 23px;
}

.book-card__label {
  display: block;

  margin-bottom: 4px;

  color: var(--blue);

  font-size: 9px;
  font-weight: 800;

  letter-spacing: 0.1em;
}

.book-card h3 {
  margin: 0;

  color: var(--navy);

  font-size: 17px;
  line-height: 1.35;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 6px 9px;

  border-radius: 999px;

  font-size: 10px;
  font-weight: 750;

  white-space: nowrap;
}

.status-badge span {
  width: 5px;
  height: 5px;

  background: currentColor;

  border-radius: 50%;
}

.status-badge--ok {
  color: var(--green);

  background: var(--green-bg);
}

.status-badge--warn {
  color: var(--orange);

  background: var(--orange-bg);
}

.book-info-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 0;

  padding: 4px 23px 8px;
}

.book-info {
  padding: 15px 5px;

  border-bottom: 1px solid #edf1f6;
}

.book-info:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.book-info--barcode {
  grid-column: 1 / -1;
}

.book-info span {
  display: block;

  margin-bottom: 5px;

  color: var(--muted);

  font-size: 10px;
  font-weight: 600;
}

.book-info strong {
  display: block;

  color: var(--text);

  font-size: 12px;

  line-height: 1.4;
}

.mono {
  font-family:
    "IBM Plex Mono",
    "SFMono-Regular",
    Consolas,
    monospace;

  font-size: 11px !important;

  word-break: break-all;
}


/* =========================================================
   BORROW FORM
========================================================= */

.borrow-card {
  margin-top: 18px;

  padding: 23px;
}

.borrow-card__header {
  display: flex;
  align-items: flex-start;

  gap: 13px;

  margin-bottom: 22px;
}

.borrow-card__number {
  width: 34px;
  height: 34px;

  flex: 0 0 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--blue);

  background: var(--blue-light);

  border-radius: 10px;

  font-size: 11px;
  font-weight: 800;
}

.form-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 15px;
}

.field {
  display: flex;
  flex-direction: column;

  gap: 7px;
}

.field > span {
  color: var(--text);

  font-size: 11px;
  font-weight: 700;
}

.input-wrapper {
  position: relative;
}

.input-wrapper svg {
  position: absolute;

  left: 12px;
  top: 50%;

  width: 17px;
  height: 17px;

  transform: translateY(-50%);

  color: #91a0b3;

  pointer-events: none;
}

.field input {
  width: 100%;

  min-height: 43px;

  padding: 0 12px 0 38px;

  color: var(--text);

  background: #fbfcfe;

  border: 1px solid var(--border);

  border-radius: 9px;

  outline: none;

  font-size: 12px;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.field input::placeholder {
  color: #a6b1c0;
}

.field input:focus {
  background: white;

  border-color: var(--blue);

  box-shadow:
    0 0 0 3px rgba(40, 100, 232, 0.1);
}

.save-button {
  width: 100%;

  min-height: 46px;

  margin-top: 20px;

  padding: 0 20px;

  font-size: 13px;
}

.save-button:disabled {
  opacity: 0.6;

  cursor: not-allowed;

  transform: none;
}

.success-message {
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 7px;

  margin-top: 13px;

  padding: 9px;

  color: var(--green);

  background: var(--green-bg);

  border-radius: 9px;

  font-size: 11px;
  font-weight: 650;
}

.success-message span {
  width: 18px;
  height: 18px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #c9edda;

  border-radius: 50%;

  font-size: 10px;
}


/* =========================================================
   TABLET
========================================================= */

@media (max-width: 950px) {
  .scan-page {
    padding: 30px 22px 60px;
  }

  .scan-layout {
    grid-template-columns: 1fr;

    max-width: 720px;
  }

  .scanner-card__body {
    min-height: 390px;
  }

  .empty-result {
    min-height: 350px;
  }
}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 600px) {
  .scan-page {
    padding: 20px 14px 45px;
  }

  .scan-header {
    margin-bottom: 22px;

    display: block;
  }

  .scan-header__content {
    gap: 12px;
  }

  .scan-header__icon {
    width: 43px;
    height: 43px;

    flex-basis: 43px;

    border-radius: 11px;
  }

  .scan-header__icon svg {
    width: 22px;
    height: 22px;
  }

  .scan-header__eyebrow {
    font-size: 8px;
  }

  .scan-header__title {
    margin-top: 5px;

    font-size: 27px;
  }

  .scan-header__subtitle {
    font-size: 12px;

    line-height: 1.55;
  }

  .scan-header__badge {
    width: fit-content;

    margin: 14px 0 0 55px;

    font-size: 10px;
  }

  .scan-layout {
    gap: 16px;
  }

  .scanner-card,
  .book-card,
  .borrow-card,
  .empty-result {
    border-radius: 14px;
  }

  .scanner-card__header {
    padding: 20px 17px 16px;
  }

  .scanner-card__header h2,
  .result-heading h2,
  .borrow-card h2 {
    font-size: 17px;
  }

  .scan-tabs {
    padding: 0 7px;
  }

  .scan-tab {
    gap: 7px;

    padding: 12px 7px;
  }

  .scan-tab__icon {
    width: 31px;
    height: 31px;

    flex: 0 0 31px;

    border-radius: 8px;
  }

  .scan-tab__icon svg {
    width: 16px;
    height: 16px;
  }

  .scan-tab strong {
    font-size: 11px;
  }

  .scan-tab small {
    font-size: 8px;
  }

  .scanner-card__body {
    padding: 17px;

    min-height: 350px;
  }

  .scanner-illustration {
    width: 110px;
    height: 90px;

    margin-bottom: 17px;
  }

  .scanner-illustration svg {
    width: 40px;
    height: 40px;
  }

  .scanner-idle h3,
  .upload-zone h3,
  .empty-result h3 {
    font-size: 15px;
  }

  .scanner-idle > p,
  .upload-zone > p,
  .empty-result > p {
    font-size: 12px;
  }

  .primary-button {
    width: 100%;

    min-height: 45px;
  }

  .viewfinder {
    min-height: 300px;
  }

  :deep(#reader video) {
    height: 300px !important;
  }

  :deep(#reader__scan_region) {
    min-height: 300px;
  }

  .scan-frame {
    width: 78%;
    height: 120px;
  }

  .scan-frame__corner {
    width: 25px;
    height: 25px;
  }

  .viewfinder__info {
    bottom: 55px;

    font-size: 9px;
  }

  .upload-zone {
    padding: 42px 17px;
  }

  .upload-icon {
    width: 55px;
    height: 55px;
  }

  .result-heading {
    min-height: 62px;
  }

  .empty-result {
    min-height: 330px;

    padding: 28px 18px;
  }

  .empty-result__icon {
    width: 60px;
    height: 60px;
  }

  .empty-result__step {
    width: 100%;
  }

  .book-card__top {
    grid-template-columns: auto 1fr;

    padding: 18px;
  }

  .book-card__book-icon {
    width: 40px;
    height: 40px;
  }

  .book-card__book-icon svg {
    width: 20px;
    height: 20px;
  }

  .book-card h3 {
    font-size: 15px;
  }

  .status-badge {
    grid-column: 1 / -1;

    width: fit-content;
  }

  .book-info-grid {
    grid-template-columns: 1fr;

    padding: 2px 18px 7px;
  }

  .book-info {
    padding: 12px 2px;
  }

  .book-info:nth-last-child(-n + 2) {
    border-bottom: 1px solid #edf1f6;
  }

  .book-info:last-child {
    border-bottom: 0;
  }

  .book-info--barcode {
    grid-column: auto;
  }

  .borrow-card {
    padding: 18px;
  }

  .borrow-card__header {
    gap: 10px;

    margin-bottom: 18px;
  }

  .borrow-card__number {
    width: 31px;
    height: 31px;

    flex-basis: 31px;
  }

  .form-grid {
    grid-template-columns: 1fr;

    gap: 13px;
  }

  .field input {
    min-height: 45px;

    font-size: 13px;
  }

  .save-button {
    min-height: 47px;
  }
}


/* =========================================================
   SMALL MOBILE
========================================================= */

@media (max-width: 380px) {
  .scan-page {
    padding-left: 10px;
    padding-right: 10px;
  }

  .scan-header__title {
    font-size: 24px;
  }

  .scan-header__badge {
    margin-left: 0;
  }

  .scanner-card__body {
    padding: 13px;
  }

  .scan-tab small {
    display: none;
  }

  .scan-tab {
    justify-content: center;
  }

  .book-card__top {
    gap: 10px;
  }
}
</style>