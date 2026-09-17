/**
 * isbn-ocr.js
 * Modul untuk membaca ISBN dari foto (bukan barcode, tapi teks ISBN tercetak)
 * menggunakan Tesseract.js, lalu memvalidasi hasilnya dengan algoritma checksum ISBN.
 *
 * Versi ES Module untuk Vite/Vue.
 */

// ---------------------------------------------------------------------------
// 1. Setup Tesseract worker
// ---------------------------------------------------------------------------

async function createTesseractWorker(onProgress, Tesseract) {
  if (!Tesseract) {
    throw new Error(
      'Tesseract belum di-pass. Panggil createTesseractWorker(onProgress, Tesseract) dari komponen Vue.'
    );
  }

  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress) onProgress(m.status, m.progress);
    },
  });

  // Batasi karakter yang dikenali cuma angka + tanda hubung/spasi.
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789-Xx ',
  });

  return worker;
}

// ---------------------------------------------------------------------------
// 2. Ambil frame dari video kamera → jadi gambar yang bisa dibaca Tesseract
// ---------------------------------------------------------------------------

function captureFrameFromVideo(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

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

  const contrastFactor = 1.4;
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

function extractIsbnCandidates(rawText) {
  const cleaned = rawText.replace(/[^0-9Xx]/g, '');

  const candidates = new Set();

  const isbn13Matches = cleaned.match(/(978|979)\d{10}/g);
  if (isbn13Matches) isbn13Matches.forEach((m) => candidates.add(m));

  const isbn10Matches = cleaned.match(/\d{9}[\dXx]/g);
  if (isbn10Matches) isbn10Matches.forEach((m) => candidates.add(m.toUpperCase()));

  return Array.from(candidates);
}

// ---------------------------------------------------------------------------
// 4. Validasi checksum ISBN
// ---------------------------------------------------------------------------

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = Number(isbn[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

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

function isValidIsbn(isbn) {
  if (isbn.length === 13) return isValidIsbn13(isbn);
  if (isbn.length === 10) return isValidIsbn10(isbn);
  return false;
}

// ---------------------------------------------------------------------------
// 5. Fungsi utama
// ---------------------------------------------------------------------------

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

export default IsbnOcr;