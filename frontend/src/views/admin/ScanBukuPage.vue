<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { DecodeHintType, BarcodeFormat } from "@zxing/library"
import { useRouter, useRoute } from "vue-router"
import IsbnOcr from "../../utils/isbn-ocr.js" // sesuaikan path relatif ke folder utils/ kamu
import Tesseract from "tesseract.js"

const notFoundMessageRef = ref(null)
const activeTab = ref("kamera")
const router = useRouter()
const route = useRoute()
const isScanning = ref(false)
const scanError = ref("")
const barcode = ref("")
const manualBarcode = ref("")

async function cariBukuManual() {
  const kode = manualBarcode.value.trim()
  if (!kode) return
  barcode.value = kode
  await cariBuku(kode)
}

const metodeManual = ref(null) // null | 'kode' | 'judul'

function pilihMetode(metode) {
  metodeManual.value = metode
  scanError.value = ""
}

// ===== CARI BUKU BERDASARKAN JUDUL (untuk buku tanpa barcode) =====
const queryJudulManual = ref("")
const hasilJudulManual = ref([])
const isSearchingJudulManual = ref(false)
let debounceTimerManual = null

function onQueryJudulManualInput() {
  clearTimeout(debounceTimerManual)
  debounceTimerManual = setTimeout(cariJudulManual, 300)
}

async function cariJudulManual() {
  const q = queryJudulManual.value.trim()
  if (!q) {
    hasilJudulManual.value = []
    return
  }
  isSearchingJudulManual.value = true
  try {
    const res = await fetch(`/api/buku?q=${encodeURIComponent(q)}`)
    if (res.ok) hasilJudulManual.value = await res.json()
  } catch (err) {
    console.error(err)
  } finally {
    isSearchingJudulManual.value = false
  }
}

async function pilihBukuDariJudul(bukuTerpilih) {
  scanError.value = ""
  try {
    const res = await fetch(`/api/buku/${bukuTerpilih.id}/untuk-pinjam`)
    if (res.status === 404) {
      scanError.value = "Buku ini belum punya eksemplar yang bisa dipinjam."
      return
    }
    if (!res.ok) throw new Error()

    bookData.value = await res.json()
    barcode.value =
      bookData.value.eksemplarList?.find((ek) => ek.id === bookData.value.eksemplarId)?.barcode || ""
    bookNotFound.value = false
    currentStep.value = 2
  } catch (err) {
    console.error(err)
    scanError.value = "Terjadi kesalahan saat mengambil data buku."
  }
}

// ===== TAMBAH BUKU BARU DARI TAB MANUAL (hasil pencarian judul kosong) =====
function tambahBukuDariJudulManual() {
  const judul = queryJudulManual.value.trim()
  if (!judul) return
  router.push({
    path: '/admin/data-buku',
    query: { judul, from: 'pinjam-judul' }
  })
}

function resetPencarianJudulManual() {
  queryJudulManual.value = ''
  hasilJudulManual.value = []
}

async function cariBuku(kodeBarcode) {
  try {
    const res = await fetch(`/api/eksemplar-buku/${kodeBarcode}`)
    if (res.status === 404) {
      bookNotFound.value = true
      bookData.value = null
      currentStep.value = 1

      await nextTick()
      notFoundMessageRef.value?.scrollIntoView({ behavior: "smooth", block: "center" })
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

function tambahBukuBaru() {
  router.push({
    path: '/admin/data-buku',
    query: {
      barcode: barcode.value,
      from: 'scan'
    }
  })
}

// ===== TAMBAH KOPI BARU DARI BUKU YANG SEDANG DITAMPILKAN (Step 2) =====
const showKonfirmasiKopiBaru = ref(false)
const isAddingKopiBaru = ref(false)

function bukaKonfirmasiKopiBaru() {
  showKonfirmasiKopiBaru.value = true
}

function batalKonfirmasiKopiBaru() {
  showKonfirmasiKopiBaru.value = false
}

async function konfirmasiTambahKopiBaru() {
  if (!bookData.value?.bukuId) {
    console.log('DEBUG: fungsi berhenti di sini karena bukuId kosong')
    return
  }

  isAddingKopiBaru.value = true
  scanError.value = ""
  try {
    const res = await fetch(`/api/buku/${bookData.value.bukuId}/eksemplar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: barcode.value }),
    })
    if (!res.ok) throw new Error("Gagal menambah eksemplar")

    showKonfirmasiKopiBaru.value = false
    await cariBuku(barcode.value)
  } catch (err) {
    console.error(err)
    scanError.value = "Gagal menambahkan kopi baru. Coba lagi."
  } finally {
    isAddingKopiBaru.value = false
  }
}

// ===== TAMBAH EKSEMPLAR KE BUKU YANG SUDAH ADA =====
const showPilihBukuLama = ref(false)
const queryJudulLama = ref("")
const hasilPencarianBuku = ref([])
const isSearchingBuku = ref(false)
const isAddingEksemplar = ref(false)
let debounceTimer = null

function bukaPilihBukuLama() {
  showPilihBukuLama.value = true
  queryJudulLama.value = ""
  hasilPencarianBuku.value = []
}

function tutupPilihBukuLama() {
  showPilihBukuLama.value = false
}

function onQueryJudulLamaInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(cariBukuLama, 300)
}

async function cariBukuLama() {
  const q = queryJudulLama.value.trim()
  if (!q) {
    hasilPencarianBuku.value = []
    return
  }
  isSearchingBuku.value = true
  try {
    const res = await fetch(`/api/buku?q=${encodeURIComponent(q)}`)
    if (res.ok) hasilPencarianBuku.value = await res.json()
  } catch (err) {
    console.error(err)
  } finally {
    isSearchingBuku.value = false
  }
}

async function pilihBukuLamaDanSimpan(bukuTerpilih) {
  isAddingEksemplar.value = true
  scanError.value = ""
  try {
    const res = await fetch(`/api/buku/${bukuTerpilih.id}/eksemplar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: barcode.value }),
    })
    if (!res.ok) throw new Error("Gagal menambah eksemplar")

    showPilihBukuLama.value = false
    bookNotFound.value = false
    bukuBaruDitambah.value = true

    await cariBuku(barcode.value) // tampilkan Step 2 (info buku)
  } catch (err) {
    console.error(err)
    scanError.value = "Gagal menambahkan eksemplar baru. Coba lagi."
  } finally {
    isAddingEksemplar.value = false
  }
}

async function lanjutDariQuery() {
  const kode = String(route.query.barcode || '').trim()
  const lanjutPinjam = route.query.lanjut === 'pinjam'
  bukuBaruDitambah.value = route.query.baru === '1'
  kembaliKeDataBuku.value = route.query.dari === 'data-buku'  

  if (!kode) return

  barcode.value = kode
  manualBarcode.value = kode
  await cariBuku(kode)

   if (!bookData.value && /^(978|979)\d{10}$/.test(kode)) {
    await cariBukuByIsbn(kode)
    if (bookData.value) bookNotFound.value = false
  }

  if (lanjutPinjam && bookData.value && bookData.value.status === 'tersedia') {
    currentStep.value = 3

    // Balik dari halaman tambah guru: isi otomatis guru yang baru ditambahkan
    const guruIdQuery = route.query.guruId
    const guruNamaQuery = route.query.guruNama
    if (guruIdQuery && guruNamaQuery) {
      tipePeminjam.value = 'guru'
      peminjam.value.anggotaId = Number(guruIdQuery)
      peminjam.value.nama = String(guruNamaQuery)
      guruQuery.value = String(guruNamaQuery)
    }
  }
}

const bookData = ref(null)
const bookNotFound = ref(false)
const bukuBaruDitambah = ref(false)
const kembaliKeDataBuku = ref(false)
const isSaving = ref(false)
const saveSuccess = ref(false)
const fileInput = ref(null)

const availableCameras = ref([])
const selectedCameraId = ref(null)
let scanner = null

const scanVideoRef = ref(null)
let scanStream = null
let scanTimer = null
let sedangMemprosesScan = false

// 1 = scan, 2 = informasi buku, 3 = form peminjaman
const currentStep = ref(1)

// ===== PEMINJAM =====
const tipePeminjam = ref("siswa")
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
  peminjam.value.anggotaId = null
  peminjam.value.nama = guruQuery.value
  showGuruDropdown.value = true
}

function tutupGuruDropdown() {
  setTimeout(() => {
    showGuruDropdown.value = false
  }, 150)
}

// Navigasi ke halaman Data Guru, langsung buka form tambah guru dengan nama terisi.
// Setelah disimpan di sana, halaman Data Guru akan redirect balik ke sini dengan
// guruId & guruNama sudah terisi (lihat lanjutDariQuery()).
function bukaTambahGuru() {
  const namaBaru = guruQuery.value.trim()
  if (!namaBaru) return

  router.push({
    path: '/admin/data-guru',
    query: {
      from: 'pinjam',
      nama: namaBaru,
      barcode: barcode.value,
    }
  })
}

// ===== RESET =====
function resetHasilPindai() {
  scanError.value = ""
  bookNotFound.value = false
  bookData.value = null
  currentStep.value = 1
  showPilihBukuLama.value = false
  queryJudulLama.value = ""
  hasilPencarianBuku.value = []
  showKonfirmasiKopiBaru.value = false
  bukuBaruDitambah.value = false
}

async function siapkanDaftarKamera() {
  try {
    const cams = await Html5Qrcode.getCameras()
    availableCameras.value = cams
    if (cams.length > 0 && !selectedCameraId.value) {
      const logitech = cams.find((k) => /logitech|c270|c310|c920|webcam/i.test(k.label))
      selectedCameraId.value = logitech ? logitech.id : cams[0].id
    }
  } catch (err) {
    console.error(err)
    scanError.value = `Gagal mendeteksi kamera: ${err.message || err.name || 'penyebab tidak diketahui'}`
  }
}

onMounted(async () => {
  siapkanDaftarKamera()
  ambilDaftarKelas()
  ambilDaftarGuru()
  await lanjutDariQuery()
})

// ===== SCAN =====
// ===== SCAN BARCODE (ZXing) + FALLBACK OCR OTOMATIS =====
const statusScan = ref("Kamera aktif — arahkan ke barcode")
let zxingControls = null
let ocrFallbackTimer = null
let riwayatDeteksi = []

const FALLBACK_OCR_SETELAH_MS = 6000

const zxingHints = new Map()
zxingHints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13])
zxingHints.set(DecodeHintType.TRY_HARDER, true)
const zxingReader = new BrowserMultiFormatReader(zxingHints, {
  delayBetweenScanAttempts: 100,
})

function validasiChecksumEan13(kode) {
  if (!/^\d{13}$/.test(kode)) return false
  const digits = kode.split("").map(Number)
  const checksum = digits.slice(0, 12).reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0)
  const cekDigit = (10 - (checksum % 10)) % 10
  return cekDigit === digits[12]
}

async function mulaiPindai() {
  resetHasilPindai()
  riwayatDeteksi = []
  if (!selectedCameraId.value) await siapkanDaftarKamera()
  if (!selectedCameraId.value) {
    scanError.value = "Tidak ada kamera terdeteksi di perangkat ini."
    return
  }

  isScanning.value = true
  statusScan.value = "Kamera aktif — arahkan ke barcode"
  await new Promise((resolve) => setTimeout(resolve, 0))

  try {
    zxingControls = await zxingReader.decodeFromConstraints(
      {
        video: {
          deviceId: { exact: selectedCameraId.value },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      scanVideoRef.value,
      (result) => {
        if (result) handleKodeTerbaca(result.getText())
      }
    )
    mulaiFallbackOcr()
  } catch (err) {
    console.error("Gagal pakai deviceId exact, coba fallback facingMode:", err)
    try {
      zxingControls = await zxingReader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        scanVideoRef.value,
        (result) => {
          if (result) handleKodeTerbaca(result.getText())
        }
      )
      mulaiFallbackOcr()
    } catch (err2) {
      console.error(err2)
      scanError.value =
        "Kamera tidak bisa diakses. Izinkan kamera di browser, lalu coba lagi."
      isScanning.value = false
    }
  }
}

function handleKodeTerbaca(kode) {
  if (!validasiChecksumEan13(kode)) {
    riwayatDeteksi = []
    return
  }
  riwayatDeteksi.push(kode)
  if (riwayatDeteksi.length > 2) riwayatDeteksi.shift()

  if (riwayatDeteksi.length === 2 && riwayatDeteksi[0] === riwayatDeteksi[1]) {
    riwayatDeteksi = []
    onScanSuccess(kode)
  }
}

// --- Fallback: kalau barcode tidak terbaca beberapa detik, baca angka ISBN pakai OCR ---
// --- Fallback: kalau barcode tidak terbaca, tampilkan tombol baca angka ISBN (OCR) ---
const tampilkanTombolOcr = ref(false)
const sedangBacaIsbn = ref(false)

function mulaiFallbackOcr() {
  hentikanFallbackOcr()
  tampilkanTombolOcr.value = false
  ocrFallbackTimer = setTimeout(() => {
    if (!isScanning.value) return
    tampilkanTombolOcr.value = true
    statusScan.value = "Barcode sulit dibaca — tekan “Baca angka ISBN”"
  }, FALLBACK_OCR_SETELAH_MS)
}

function hentikanFallbackOcr() {
  if (ocrFallbackTimer) {
    clearTimeout(ocrFallbackTimer)
    ocrFallbackTimer = null
  }
  tampilkanTombolOcr.value = false
  sedangBacaIsbn.value = false
}

// Buang digit sisipan (dari batang pengaman barcode yang terbaca sebagai angka)
function pulihkanIsbn(teks, maksHapus = 4) {
  const raw = String(teks).replace(/\D/g, "")
  const hasil = new Set()
  if (raw.length < 13) return []

  const n = raw.length
  const banyakHapus = Math.min(maksHapus, n - 13)

  function cobaHapus(mulai, sisa, dipilih) {
    if (sisa === 0) {
      const kandidat = raw
        .split("")
        .filter((_, i) => !dipilih.includes(i))
        .join("")
      if (/^(978|979)/.test(kandidat) && validasiChecksumEan13(kandidat)) {
        hasil.add(kandidat)
      }
      return
    }
    for (let i = mulai; i < n; i++) cobaHapus(i + 1, sisa - 1, [...dipilih, i])
  }

  for (let k = 0; k <= banyakHapus; k++) cobaHapus(0, k, [])
  return [...hasil]
}

async function isbnAdaDiKatalog(isbn) {
  try {
    const res = await fetch(`/api/buku/isbn/${isbn}`)
    return res.ok
  } catch {
    return false
  }
}

let ocrWorker = null
let ocrWorkerReady = false

async function initOcrWorker() {
  if (ocrWorkerReady) return
  ocrWorker = await IsbnOcr.createTesseractWorker(() => {}, Tesseract)
  ocrWorkerReady = true
}

// Baca baris "ISBN 978-xxx-xxxx-xx-x": bersih dari gangguan batang barcode
async function bacaBarisIsbnBerstrip(frame) {
  await ocrWorker.setParameters({
    tessedit_char_whitelist: "0123456789-ISBN ",
    tessedit_pageseg_mode: "11", // teks tersebar, cari baris di mana saja
  })
  const { data } = await ocrWorker.recognize(frame)
  const baris = data.lines?.length ? data.lines.map((l) => l.text) : data.text.split("\n")

  const hasil = []
  for (const teks of baris) {
    if ((teks.match(/-/g) || []).length < 2) continue   // hanya baris ber-strip
    const digit = teks.replace(/\D/g, "")
    if (digit.length === 13 && /^(978|979)/.test(digit) && validasiChecksumEan13(digit)) {
      hasil.push(digit)
    }
  }
  console.log("Baris ber-strip:", baris, "->", hasil)
  return hasil
}

async function bacaIsbnDariKamera() {
  const videoEl = scanVideoRef.value
  if (!videoEl || !videoEl.videoWidth || sedangBacaIsbn.value) return

  sedangBacaIsbn.value = true
  try {
    if (!ocrWorkerReady) {
      statusScan.value = "Menyiapkan mesin OCR..."
      await initOcrWorker()
    }
    statusScan.value = "Membaca ISBN..."

    const frame = IsbnOcr.captureFrameFromVideo(videoEl)
    
        // 1) coba baris ISBN ber-strip dulu (paling bersih)
    const dariBaris = await bacaBarisIsbnBerstrip(frame).catch((e) => {
      console.log("baris ber-strip gagal:", e)
      return []
    })
    if (dariBaris.length > 0) {
      statusScan.value = `Terdeteksi: ${dariBaris[0]}`
      await onScanSuccess(dariBaris[0])
      return
    }

    // 2) kalau tidak ketemu, lanjut ke alur lama di bawah
    const { validCandidates, allCandidates } =
      await IsbnOcr.recognizeIsbnFromImage(ocrWorker, frame)
    console.log("OCR di tab kamera:", { allCandidates, validCandidates })

    if (!isScanning.value) return

        // Kumpulkan kandidat: yang sudah valid, lalu hasil pemulihan dari teks mentah
    const kandidat = new Set(validCandidates)
    for (const raw of allCandidates) pulihkanIsbn(raw).forEach((k) => kandidat.add(k))
    const daftar = [...kandidat]
    console.log("Kandidat ISBN setelah pemulihan:", daftar)

    if (daftar.length === 0) {
      statusScan.value = allCandidates.length
        ? `Terbaca "${allCandidates[0]}" tapi tidak cocok. Pastikan semua angka masuk frame.`
        : "Angka ISBN belum terbaca. Dekatkan buku dan coba lagi."
    } else {
      // Utamakan yang ada di katalog; kalau hanya satu kandidat, tetap dipakai
      let pilihan = null
      for (const k of daftar) {
        if (await isbnAdaDiKatalog(k)) { pilihan = k; break }
      }
      if (!pilihan && daftar.length === 1) pilihan = daftar[0]

      if (pilihan) {
        statusScan.value = `Terdeteksi: ${pilihan}`
        await onScanSuccess(pilihan)
      } else {
        statusScan.value = "Ada beberapa kemungkinan ISBN, tapi tidak ada di katalog. Coba lagi."
      }
    }
  } catch (err) {
    console.error(err)
    statusScan.value = "Gagal membaca ISBN. Coba lagi."
  } finally {
    sedangBacaIsbn.value = false
  }
}

async function hentikanPindai() {
  hentikanFallbackOcr()
  if (zxingControls) {
    zxingControls.stop()
    zxingControls = null
  }
  isScanning.value = false
}

async function onScanSuccess(decodedText) {
  barcode.value = decodedText
  await hentikanPindai()

  // Prefix 978/979 = Bookland EAN, ciri khas ISBN asli.
  // Kode toko/penerbit lain (walau sama-sama 13 digit) tetap dicari lewat kolom barcode eksemplar.
  if (/^(978|979)\d{10}$/.test(decodedText)) {
    await cariBukuByIsbn(decodedText)
    if (!bookData.value) bookNotFound.value = true
  } else {
    await cariBuku(decodedText)
  }
}

async function cariBukuByIsbn(isbn) {
  try {
    const res = await fetch(`/api/buku/isbn/${isbn}`)
    if (res.status === 404) {
      bookNotFound.value = true
      bookData.value = null
      currentStep.value = 1
      return
    }
    if (!res.ok) throw new Error("Gagal mengambil data buku")

    bookData.value = await res.json()

    const dipilih = bookData.value.eksemplarList?.find(
      (ek) => ek.id === bookData.value.eksemplarId
    )
    barcode.value = dipilih?.barcode || isbn

    currentStep.value = 2
  } catch (err) {
    console.error(err)
    scanError.value = "Terjadi kesalahan saat mencari data buku."
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  resetHasilPindai()
  if (!scanner) scanner = new Html5Qrcode("reader")
  try {
    const decodedText = await scanner.scanFile(file, true)
    barcode.value = decodedText.trim()
    await cariBuku(barcode.value)
  } catch (err) {
    scanError.value =
      "Barcode tidak terbaca dari gambar ini. Coba foto lain yang lebih jelas dan tidak buram."
  } finally {
    e.target.value = ""
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
      scanError.value = "Pilih guru dari daftar atau tambahkan sebagai guru baru."
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
    if (kembaliKeDataBuku.value) {
      kembaliKeDataBuku.value = false
      router.push('/admin/data-buku')
    }
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
  guruQuery.value = ""
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
  kembaliKeDataBuku.value = false  
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
  hentikanPindai()
  if (ocrWorker) ocrWorker.terminate()
})
</script>

<template>
  <div class="scan-page">
    <div class="page-header">
      <div>
        <h1> Mulai Pinjam</h1>
        <p>Proses peminjaman buku dalam beberapa langkah mudah.</p>
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
            <h2>Cari Buku</h2>
            <p>Temukan dan pinjam buku yang kamu butuhkan.</p>
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
            <button
              class="scan-tab"
              :class="{ 'scan-tab--active': activeTab === 'manual' }"
              @click="activeTab = 'manual'"
            >
              Manual
            </button>
          </div>

          <div class="scanner-area">
            <template v-if="activeTab === 'kamera'">
              <div v-if="!isScanning" class="scanner-idle">
                <h3>Siap memindai?</h3>
                <p>Arahkan kamera ke barcode yang terdapat pada buku.</p>

                <label v-if="availableCameras.length > 0" class="camera-select">
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
  <video ref="scanVideoRef" class="viewfinder-video" playsinline muted></video>
  <div class="viewfinder__info">{{ statusScan }}</div>
  <button
    v-if="tampilkanTombolOcr"
    class="secondary-button"
    :disabled="sedangBacaIsbn"
    @click="bacaIsbnDariKamera"
  >
    {{ sedangBacaIsbn ? "Membaca..." : "Baca angka ISBN" }}
  </button>
  <button class="secondary-button" @click="hentikanPindai">Batalkan</button>
</div>
</template>

            <template v-else-if="activeTab === 'unggah'">
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

                        <template v-else-if="activeTab === 'manual'">
              <div class="metode-pilih">
                
                <div class="metode-grid">
                  <button
                    type="button"
                    class="metode-card"
                    :class="{ 'metode-card--aktif': metodeManual === 'kode' }"
                    @click="pilihMetode('kode')"
                  >
                    <svg class="metode-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="5" width="2" height="14" />
                      <rect x="7" y="5" width="1" height="14" />
                      <rect x="10" y="5" width="3" height="14" />
                      <rect x="15" y="5" width="1" height="14" />
                      <rect x="18" y="5" width="2" height="14" />
                    </svg>
                    <span>Ketik kode</span>
                  </button>

                  <button
                    type="button"
                    class="metode-card"
                    :class="{ 'metode-card--aktif': metodeManual === 'judul' }"
                    @click="pilihMetode('judul')"
                  >
                    <svg class="metode-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
                      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
                    </svg>
                    <span>Cari judul</span>
                  </button>
                </div>
              </div>

              <!-- MODE: KETIK KODE -->
              <div v-if="metodeManual === 'kode'" class="manual-input manual-input--inline">
                <div class="manual-input-row">
                  <input
                    id="manual-barcode"
                    v-model="manualBarcode"
                    type="text"
                    placeholder="Contoh: 9786020633478-002"
                    @keyup.enter="cariBukuManual"
                  />
                  <button type="button" class="btn-cari-manual" @click="cariBukuManual">
                    Cari
                  </button>
                </div>
              </div>

              <!-- MODE: CARI JUDUL -->
              <div v-else-if="metodeManual === 'judul'" class="manual-input manual-input--inline">
                <div class="manual-input-row">
                  <input
                    id="manual-judul"
                    v-model="queryJudulManual"
                    type="text"
                    placeholder="Ketik judul buku..."
                    @input="onQueryJudulManualInput"
                  />
                </div>

                <p v-if="isSearchingJudulManual" class="manual-status">Mencari...</p>

                <ul v-if="hasilJudulManual.length" class="manual-result-list">
                  <li
                    v-for="b in hasilJudulManual"
                    :key="b.id"
                    class="manual-result-item"
                    @click="pilihBukuDariJudul(b)"
                  >
                    <span class="manual-result-item__avatar">{{ b.judul?.charAt(0)?.toUpperCase() }}</span>
                    <div class="manual-result-item__body">
                      <strong>{{ b.judul }}</strong>
                      <span class="manual-result-item__penulis">{{ b.penulis }}</span>
                    </div>
                    <span
                      class="manual-result-item__stok"
                      :class="{ 'manual-result-item__stok--habis': b.tersedia === 0 }"
                    >
                      {{ b.tersedia }}/{{ b.stok }}
                    </span>
                  </li>
                </ul>
<div v-else-if="queryJudulManual && !isSearchingJudulManual" class="manual-not-found">
  <p class="manual-not-found__text">
    Tidak ada judul yang cocok dengan
    <strong>"{{ queryJudulManual }}"</strong>.
  </p>
  <div class="manual-not-found__actions">
    <button
      type="button"
      class="btn-tambah-buku-dari-judul"
      @click="tambahBukuDariJudulManual"
    >
      + Ini buku baru
    </button>
    <button
      type="button"
      class="btn-cari-ulang"
      @click="resetPencarianJudulManual"
    >
      Cari ulang
    </button>
  </div>
</div>
</div>
</template>

          <div v-if="scanError" class="message message--error">
            <div class="message__icon">!</div>
            <div>
              <strong>Terjadi masalah</strong>
              <p>{{ scanError }}</p>
            </div>
          </div>

          <div v-if="bookNotFound" ref="notFoundMessageRef" class="message message--warning">
            <div class="message__icon">!</div>
            <div class="not-found-body">
              <strong>Buku tidak ditemukan</strong>
              <p>
                Barcode <span class="mono">{{ barcode }}</span> belum terdaftar di katalog.
              </p>

              <div v-if="!showPilihBukuLama" class="not-found-actions">
                <button type="button" class="btn-tambah-buku" @click="tambahBukuBaru">
                  + Ini buku baru
                </button>
                <button type="button" class="btn-tambah-eksemplar" @click="bukaPilihBukuLama">
                  Tambah eksemplar dari judul yang sudah ada
                </button>
              </div>

              <div v-else class="pilih-buku-lama">
                <input
                  v-model="queryJudulLama"
                  type="text"
                  placeholder="Ketik judul buku..."
                  class="pilih-buku-lama__input"
                  @input="onQueryJudulLamaInput"
                />

                <p v-if="isSearchingBuku" class="pilih-buku-lama__status">Mencari...</p>

                <ul v-if="hasilPencarianBuku.length" class="pilih-buku-lama__list">
                  <li
                    v-for="b in hasilPencarianBuku"
                    :key="b.id"
                    class="pilih-buku-lama__item"
                    :class="{ 'pilih-buku-lama__item--disabled': isAddingEksemplar }"
                    @click="!isAddingEksemplar && pilihBukuLamaDanSimpan(b)"
                  >
                    <strong>{{ b.judul }}</strong> — {{ b.penulis }}
                    <span class="pilih-buku-lama__meta">({{ b.tersedia }}/{{ b.totalEksemplar }} tersedia)</span>
                  </li>
                </ul>

                <p v-else-if="queryJudulLama && !isSearchingBuku" class="pilih-buku-lama__status">
                  Tidak ada judul yang cocok.
                </p>

                <button type="button" class="secondary-light-button pilih-buku-lama__batal" @click="tutupPilihBukuLama">
                  Batal
                </button>
              </div>
            </div>
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

          <div v-if="bukuBaruDitambah" class="success-message banner-buku-baru">
            <span>✓</span>
            Buku berhasil ditambahkan ke katalog. Kamu bisa scan buku lain atau lanjut ke peminjaman.
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

            <div v-if="bookData.eksemplarList && bookData.eksemplarList.length" class="eksemplar-list">
              <span class="eksemplar-list__title">
                Eksemplar buku ini ({{ bookData.eksemplarList.length }})
              </span>
              <ul>
                <li
                  v-for="ek in bookData.eksemplarList"
                  :key="ek.id"
                  class="eksemplar-list__item"
                  :class="{ 'eksemplar-list__item--active': ek.id === bookData.eksemplarId }"
                >
                  <span
                    class="eksemplar-list__dot"
                    :class="ek.status === 'tersedia' ? 'eksemplar-list__dot--ok' : 'eksemplar-list__dot--warn'"
                  ></span>
                  <span class="eksemplar-list__label">Eksemplar #{{ ek.id }}</span>
                  <span class="eksemplar-list__status">{{ ek.status }}</span>
                  <span class="eksemplar-list__barcode mono">{{ ek.barcode }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div v-if="bookData.status !== 'tersedia'" class="message message--warning">
            <div class="message__icon">!</div>
            <div>
              <strong>Buku belum tersedia</strong>
              <p>Buku ini tidak dapat dipinjam saat ini.</p>
            </div>
          </div>

          <div v-if="!showKonfirmasiKopiBaru" class="result-actions">
            <button class="secondary-light-button" @click="mulaiScanLagi">
              {{ bukuBaruDitambah ? "Selesai, scan buku lain" : "Cari buku lain" }}
            </button>
            <button class="secondary-light-button" @click="bukaKonfirmasiKopiBaru">
              + Ini kopi baru
            </button>
            <button
              v-if="bookData.status === 'tersedia'"
              class="primary-button primary-button--large"
              @click="mulaiPeminjaman"
            >
              Mulai peminjaman
            </button>
          </div>

          <div v-else class="message message--warning kopi-baru-confirm">
            <div class="message__icon">!</div>
            <div>
              <strong>Yakin ini kopi fisik baru?</strong>
              <p>
                Eksemplar baru akan ditambahkan untuk <strong>{{ bookData.judul }}</strong>
                dengan barcode <span class="mono">{{ barcode }}</span>.
              </p>
              <div class="kopi-baru-confirm__actions">
                <button
                  type="button"
                  class="secondary-light-button"
                  :disabled="isAddingKopiBaru"
                  @click="batalKonfirmasiKopiBaru"
                >
                  Batal
                </button>
                <button
                  type="button"
                  class="btn-tambah-buku"
                  :disabled="isAddingKopiBaru"
                  @click="konfirmasiTambahKopiBaru"
                >
                  {{ isAddingKopiBaru ? "Menyimpan..." : "Ya, tambahkan eksemplar" }}
                </button>
              </div>
            </div>
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

                <!-- Dropdown daftar guru -->
                <ul v-if="showGuruDropdown && filteredGuru.length" class="kelas-dropdown">
                  <li
                    v-for="g in filteredGuru"
                    :key="g.id"
                    @mousedown.prevent="pilihGuru(g)"
                  >
                    {{ g.nama }}{{ g.mapel ? ` — ${g.mapel}` : "" }}
                  </li>
                </ul>
              </label>

              <!-- Warning jika nama guru belum terdaftar -->
              <div v-if="isGuruBaru && !peminjam.anggotaId" class="message message--warning tambah-guru-warning">
                <div class="message__icon">!</div>
                <div>
                  <strong>Guru belum ditambahkan</strong>
                  <p>Nama "{{ guruQuery.trim() }}" belum ada di data guru.</p>
                  <button type="button" class="btn-tambah-guru" @click="bukaTambahGuru">
                    + Tambah Guru
                  </button>
                </div>
              </div>
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
  grid-template-columns: 1fr 1fr 1fr;
   max-width: 560px;
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

.manual-input {
  margin-top: 20px;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 12px;
}
.manual-input--inline {
  margin-top: 0;
}
.manual-input label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--navy);
}
.manual-input-row {
  display: flex;
  gap: 10px;
}
.manual-input-row input {
  flex: 1;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
}
.manual-input-row input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(40, 100, 232, 0.1);
}
.manual-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.metode-pilih {
  padding: 4px 0 18px;
}
.metode-pilih__judul {
  margin: 0 0 12px;
  color: var(--navy);
  font-size: 15px;
  font-weight: 700;
  text-align: center;
}

.metode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.metode-card:hover {
  border-color: #bcd2fb;
}
.metode-card--aktif {
  border: 2px solid var(--blue);
}

.metode-card__icon {
  width: 22px;
  height: 22px;
  color: var(--muted);
}
.metode-card--aktif .metode-card__icon {
  color: var(--blue);
}

.metode-card span {
  font-size: 12px;
  font-weight: 700;
  color: var(--navy);
}

.manual-status {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.manual-result-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.manual-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fbfcfe;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.manual-result-item:hover {
  border-color: #bcd2fb;
  background: var(--blue-light);
}

.manual-result-item__avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blue);
  background: var(--blue-light);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
}

.manual-result-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.manual-result-item__body strong {
  color: var(--navy);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.manual-result-item__penulis {
  color: var(--muted);
  font-size: 11px;
}

.manual-result-item__stok {
  flex: 0 0 auto;
  padding: 4px 8px;
  color: var(--green);
  background: var(--green-bg);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.manual-result-item__stok--habis {
  color: var(--red);
  background: var(--red-bg);
}
.btn-cari-manual {
  min-width: 90px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: var(--blue);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-cari-manual:hover {
  background: #1e56d6;
}

@media (max-width: 480px) {
  .manual-input {
    padding: 14px;
  }
  .manual-input-row {
    flex-direction: column;
  }
  .btn-cari-manual {
    min-height: 42px;
  }
}

.ocr-box { padding: 12px 16px; text-align: center; }
.ocr-video {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 12px;
  background: #071426;
  margin-bottom: 12px;
}
.ocr-result {
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
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
  height: auto !important;
  max-height: 360px !important;
  object-fit: contain !important;
  background: #071426;
  display: block;
}
.reader-hidden { display: none; }

.viewfinder-video {
  position: relative;
  width: 100%;
  max-height: 360px;
  overflow: hidden;
  background: #071426;
  display: block;
  object-fit: contain;
}
.viewfinder-video :deep(video),
.viewfinder-video :deep(canvas) {
  width: 100% !important;
  height: auto !important;
  max-height: 360px;
  object-fit: contain;
  display: block;
}

.viewfinder__info {
  position: absolute;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  width: max-content;
  max-width: 90%;
  text-align: center;
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

.not-found-body { width: 100%; }

.not-found-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.btn-tambah-buku {
  margin-top: 8px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: var(--orange);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-tambah-buku:hover {
  opacity: 0.9;
}

.btn-tambah-eksemplar {
  margin-top: 8px;
  padding: 6px 14px;
  border: 1px solid #ffe2b4;
  border-radius: 8px;
  background: #fff;
  color: var(--orange);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-tambah-eksemplar:hover {
  background: var(--orange-bg);
}

.pilih-buku-lama {
  margin-top: 10px;
}

.pilih-buku-lama__input {
  width: 100%;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
  outline: none;
  background: #fff;
}
.pilih-buku-lama__input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(40, 100, 232, 0.1);
}

.pilih-buku-lama__status {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--muted);
}

.pilih-buku-lama__list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}

.pilih-buku-lama__item {
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}
.pilih-buku-lama__item:last-child { border-bottom: 0; }
.pilih-buku-lama__item:hover {
  background: var(--blue-light);
}
.pilih-buku-lama__item--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pilih-buku-lama__meta {
  color: var(--muted);
}

.pilih-buku-lama__batal {
  min-height: 34px;
  padding: 0 12px;
  font-size: 11px;
}

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

.eksemplar-list {
  padding: 14px 18px 16px;
}
.eksemplar-list__title {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.eksemplar-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.eksemplar-list__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fbfcfe;
  font-size: 12px;
}
.eksemplar-list__item--active {
  border-color: #bcd2fb;
  background: var(--blue-light);
}
.eksemplar-list__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}
.eksemplar-list__dot--ok { background: var(--green); }
.eksemplar-list__dot--warn { background: var(--orange); }
.eksemplar-list__label {
  font-weight: 700;
  color: var(--navy);
}
.eksemplar-list__status {
  color: var(--muted);
  text-transform: capitalize;
}
.eksemplar-list__barcode {
  margin-left: auto;
  color: var(--muted);
  font-size: 10px !important;
}

.kopi-baru-confirm { margin-top: 12px; }
.kopi-baru-confirm__actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
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

/* ===== TAMBAHAN UNTUK GURU BARU (via halaman Data Guru) ===== */
.tambah-guru-warning {
  grid-column: 1 / -1;
  margin-top: -4px;
}

.btn-tambah-guru {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 14px;
  border: 1px dashed #2864e8;
  border-radius: 8px;
  background: #edf4ff;
  color: #2864e8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-tambah-guru:hover {
  background: #dbeafe;
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

.banner-buku-baru {
  margin: 0 0 14px;
  padding: 10px 12px;
  text-align: left;
}

@media (max-width: 700px) {
  .form-grid { grid-template-columns: 1fr; }
  .result-actions, .form-actions { flex-direction: column-reverse; }
  .result-actions > *, .form-actions > * { width: 100%; }
}

/* ===== TAMBAHAN: BUKU TIDAK DITEMUKAN DI TAB MANUAL ===== */
.manual-not-found {
  margin-top: 12px;
  padding: 14px;
  background: var(--orange-bg);
  border: 1px solid #ffe2b4;
  border-radius: 10px;
}

.manual-not-found__text {
  margin: 0 0 10px;
  color: var(--orange);
  font-size: 12px;
  line-height: 1.5;
}

.manual-not-found__text strong {
  color: var(--navy);
}

.manual-not-found__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-tambah-buku-dari-judul {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: var(--orange);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-tambah-buku-dari-judul:hover {
  opacity: 0.9;
}

.btn-cari-ulang {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--navy);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-cari-ulang:hover {
  background: #f8fafc;
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

  .not-found-actions {
    flex-direction: column;
  }
  .not-found-actions > * {
    width: 100%;
  }
}
</style>