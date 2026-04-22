import { storageLoad, formatDate } from './storage.js';
import { esc } from './cards.js';

export let CARDS = [];

const fileInput  = document.getElementById('fileInput');
const dropzone   = document.getElementById('dropzone');
const parseStatus = document.getElementById('parseStatus');
const previewWrap = document.getElementById('previewWrap');
const previewBody = document.getElementById('previewBody');
const startBtn   = document.getElementById('startBtn');
const savedBanner = document.getElementById('savedBanner');
const savedInfo  = document.getElementById('savedInfo');
const savedDate  = document.getElementById('savedDate');

export function setStatus(msg, type) {
  parseStatus.textContent = msg;
  parseStatus.className = 'parse-status ' + (type || '');
}

export function parseFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  const isCSV  = name.endsWith('.csv');
  const isXLSX = name.endsWith('.xlsx') || name.endsWith('.xls');
  if (!isCSV && !isXLSX) { setStatus('Unsupported file type. Use .csv or .xlsx', 'err'); return; }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = isCSV
        ? XLSX.read(e.target.result, { type: 'string' })
        : XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (!rows.length) { setStatus('The sheet appears to be empty.', 'err'); return; }

      const norm = rows.map(r => {
        const o = {};
        for (const k of Object.keys(r)) o[k.toLowerCase().trim()] = r[k];
        return o;
      });
      if (!('id' in norm[0]) || !('front' in norm[0]) || !('back' in norm[0])) {
        setStatus('Missing columns. Need: id, front, back', 'err');
        startBtn.disabled = true;
        previewWrap.style.display = 'none';
        return;
      }

      const errors = [], seen = new Set(), valid = [];
      for (let i = 0; i < norm.length; i++) {
        const r = norm[i], id = parseInt(r.id, 10);
        if (isNaN(id) || id < 1 || id > 50) { errors.push(`Row ${i + 2}: id must be 1-50`); continue; }
        if (seen.has(id))                    { errors.push(`Row ${i + 2}: duplicate id ${id}`); continue; }
        if (!String(r.front).trim())         { errors.push(`Row ${i + 2}: front is empty`); continue; }
        if (!String(r.back).trim())          { errors.push(`Row ${i + 2}: back is empty`); continue; }
        seen.add(id);
        valid.push({ id, front: String(r.front).trim(), back: String(r.back).trim() });
        if (valid.length >= 50) break;
      }
      if (!valid.length) {
        setStatus(errors[0] || 'No valid rows found.', 'err');
        startBtn.disabled = true;
        previewWrap.style.display = 'none';
        return;
      }
      valid.sort((a, b) => a.id - b.id);

      previewBody.innerHTML = valid.map(r =>
        `<tr><td>${r.id}</td><td>${esc(r.front.length > 40 ? r.front.slice(0, 40) + '...' : r.front)}</td><td>${esc(r.back.length > 40 ? r.back.slice(0, 40) + '...' : r.back)}</td></tr>`
      ).join('');
      previewWrap.style.display = 'block';
      setStatus('✓ ' + valid.length + ' card' + (valid.length > 1 ? 's' : '') + ' ready', 'ok');
      CARDS = valid;
      startBtn.disabled = false;
    } catch(err) {
      setStatus('Could not parse file: ' + err.message, 'err');
    }
  };
  if (isCSV) reader.readAsText(file); else reader.readAsArrayBuffer(file);
}

export function checkSavedDeck() {
  const saved = storageLoad();
  if (saved) {
    CARDS = saved.cards;
    const isComplete = saved.reviewQueue && saved.reviewQueue.length === 0
      && saved.retryPile && saved.retryPile.length === 0;
    document.getElementById('savedTag').textContent = isComplete ? 'Completed deck' : 'Session in progress';
    let infoStr = saved.cards.length + ' cards';
    if (saved.correctPile && saved.correctPile.length > 0) infoStr += ` · ${saved.correctPile.length} mastered`;
    savedInfo.textContent = infoStr;
    savedDate.textContent = formatDate(saved.uploadedAt);
    savedBanner.style.display = 'flex';
  } else {
    savedBanner.style.display = 'none';
  }
}

export function resetUploadUI() {
  CARDS = [];
  fileInput.value = '';
  setStatus('', '');
  previewWrap.style.display = 'none';
  startBtn.disabled = true;
  checkSavedDeck();
}

export function initUploadListeners() {
  fileInput.addEventListener('change', () => parseFile(fileInput.files[0]));
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) { fileInput.value = ''; parseFile(f); }
  });
}
