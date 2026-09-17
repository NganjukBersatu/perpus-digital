/**
 * isbn-ocr.js
 * Modul untuk membaca ISBN dari foto (bukan barcode, tapi teks ISBN tercetak)
 * menggunakan Tesseract.js, lalu memvalidasi hasilnya dengan algoritma checksum ISBN.
 *
 * Cara pakai (browser, dengan bundler):
 *   import { createTesseractWorker, recognizeIsbnFromImage } from './isbn-ocr.js';
 *
 * Cara pakai (browser, tanpa bundler / CDN):
 *   <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
 *   <script src="./isbn-ocr.js"></script>
 *   (fungsi-fungsi di bawah otomatis nempel ke window.IsbnOcr)
 */

// ---------------------------------------------------------------------------
// 1. Setup Tesseract worker
// ---------------------------------------------------------------------------

/**
 * Membuat & menyiapkan worker Tesseract sekali di awal (jangan bikin worker baru
 * setiap kali scan — berat & lambat kalau diulang-ulang).
 *
 * @param {(status: string, progress: number) => void} [onProgress] callback opsional untuk progress bar UI
 * @returns {Promise<Tesseract.Worker>}
 */
async function createTesseractWorker(onProgress) {
  const Tesseract = window.Tesseract;
  if (!Tesseract) {
    throw new Error(
      'Tesseract belum ter-load. Pastikan sudah import "tesseract.js" atau load via <script> CDN sebelum file ini.'
    );
  }

  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress) onProgress(m.status, m.progress);
    },
  });

  // Batasi karakter yang dikenali cuma angka + tanda hubung/spasi.
  // Ini SANGAT membantu akurasi karena OCR nggak perlu nebak huruf sama sekali.
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789-Xx ',
  });

  return worker;
}

// ---------------------------------------------------------------------------
// 2. Ambil frame dari video kamera → jadi gambar yang bisa dibaca Tesseract
// ---------------------------------------------------------------------------

/**
 * Ambil 1 frame dari elemen <video> (stream kamera) dan kembalikan sebagai
 * data URL PNG, siap dikirim ke Tesseract.
 *
 * @param {HTMLVideoElement} videoEl
 * @returns {string} data URL gambar (image/png)
 */
function captureFrameFromVideo(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

/**
 * Preprocessing sederhana: grayscale + naikkan kontras.
 * Ini seringkali menaikkan akurasi OCR untuk cetakan buram/kertas menguning.
 *
 * @param {string} dataUrl data URL gambar asli
 * @returns {Promise<string>} data URL gambar hasil preprocessing
 */
async function preprocessImage(dataUrl) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const contrastFactor = 1.4; // >1 = naikkan kontras
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrasted = (gray - 128) * contrastFactor + 128;
    const clamped = Math.max(0, Math.min(255, contrasted));
    data[i] = data[i + 1] = data[i + 2] = clamped;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ---------------------------------------------------------------------------
// 3. Extract kandidat ISBN dari teks mentah hasil OCR
// ---------------------------------------------------------------------------

/**
 * Cari pola mirip ISBN-13 (13 digit, diawali 978/979) di dalam teks bebas.
 * Membersihkan spasi/strip supaya polanya ketemu walau OCR baca dengan
 * pemisah yang berantakan.
 *
 * @param {string} rawText
 * @returns {string[]} daftar kandidat ISBN-13 (13 digit, tanpa strip)
 */
function extractIsbnCandidates(rawText) {
  // Buang semua karakter selain digit dan 'X' (X dipakai di akhir ISBN-10)
  const cleaned = rawText.replace(/[^0-9Xx]/g, '');

  const candidates = new Set();

  // ISBN-13: 13 digit berurutan yang diawali 978 atau 979
  const isbn13Matches = cleaned.match(/(978|979)\d{10}/g);
  if (isbn13Matches) isbn13Matches.forEach((m) => candidates.add(m));

  // ISBN-10 (untuk buku lama sebelum standar ISBN-13): 9 digit + 1 digit/X checksum
  const isbn10Matches = cleaned.match(/\d{9}[\dXx]/g);
  if (isbn10Matches) isbn10Matches.forEach((m) => candidates.add(m.toUpperCase()));

  return Array.from(candidates);
}

// ---------------------------------------------------------------------------
// 4. Validasi checksum ISBN (buat nyaring hasil OCR yang salah baca)
// ---------------------------------------------------------------------------

/**
 * @param {string} isbn 13 digit, tanpa strip
 * @returns {boolean}
 */
function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = Number(isbn[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

/**
 * @param {string} isbn 9 digit + 1 digit/X, tanpa strip
 * @returns {boolean}
 */
function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(isbn[i]) * (10 - i);
  }
  const last = isbn[9] === 'X' ? 10 : Number(isbn[9]);
  sum += last;
  return sum % 11 === 0;
}

/**
 * Validasi otomatis (deteksi ISBN-10 vs ISBN-13 dari panjangnya).
 * @param {string} isbn
 * @returns {boolean}
 */
function isValidIsbn(isbn) {
  if (isbn.length === 13) return isValidIsbn13(isbn);
  if (isbn.length === 10) return isValidIsbn10(isbn);
  return false;
}

// ---------------------------------------------------------------------------
// 5. Fungsi utama: gabungkan semua langkah di atas jadi satu pemanggilan
// ---------------------------------------------------------------------------

/**
 * @param {Tesseract.Worker} worker dari createTesseractWorker()
 * @param {string} imageDataUrl data URL gambar (dari captureFrameFromVideo, atau upload file)
 * @returns {Promise<{ rawText: string, validCandidates: string[], allCandidates: string[] }>}
 */
async function recognizeIsbnFromImage(worker, imageDataUrl) {
  const processed = await preprocessImage(imageDataUrl);
  const { data } = await worker.recognize(processed);
  const rawText = data.text;

  const allCandidates = extractIsbnCandidates(rawText);
  const validCandidates = allCandidates.filter(isValidIsbn);

  return { rawText, validCandidates, allCandidates };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const IsbnOcr = {
  createTesseractWorker,
  captureFrameFromVideo,
  preprocessImage,
  extractIsbnCandidates,
  isValidIsbn,
  isValidIsbn13,
  isValidIsbn10,
  recognizeIsbnFromImage,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IsbnOcr;
} else {
  window.IsbnOcr = IsbnOcr;
}