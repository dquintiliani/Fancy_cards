const THEME_KEY = 'flashcard_theme';

let THEMES = null; // global-ish so other code in this file can see it

fetch("theme.json")
  .then((res) => res.json())
  .then((data) => {
    THEMES = data;
    console.log("THEMES loaded:", THEMES);
  })
  .catch((err) => {
    console.error("Failed to load theme.json", err);
  });

function themeSave(id) { try { localStorage.setItem(THEME_KEY, id); } catch(e) {} }
function themeLoad() { try { return localStorage.getItem(THEME_KEY) || 'classic'; } catch(e) { return 'classic'; } }

let activeTheme = themeLoad();
function applyTheme(themeId) {
  activeTheme = themeId;
  if (!document.getElementById('studyScreen').classList.contains('hidden') && CARDS.length) render();
}

function buildPreviewStyle(t) {
  const filterMap = { classic: 'url(#filter-classic)', watercolour: 'url(#filter-watercolour)', newsprint: 'url(#filter-newsprint)', vellum: 'url(#filter-vellum)', kraft: 'url(#filter-kraft)' };
  const linenOverlay = t.id === 'linen' ? `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(180,160,120,0.07) 2px, rgba(180,160,120,0.07) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(180,160,120,0.05) 2px, rgba(180,160,120,0.05) 3px),` : '';
  const newsprintOverlay = t.id === 'newsprint' ? `repeating-linear-gradient(92deg, transparent, transparent 1px, rgba(160,140,90,0.06) 1px, rgba(160,140,90,0.06) 2px), repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(140,120,70,0.04) 14px, rgba(140,120,70,0.04) 15px),` : '';
  const wcoOverlay = t.id === 'watercolour' ? `radial-gradient(ellipse 60% 40% at 20% 30%, rgba(210,195,160,0.35) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(200,185,145,0.25) 0%, transparent 65%),` : '';
  const kraftOverlay = t.id === 'kraft' ? `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(100,70,30,0.04) 3px, rgba(100,70,30,0.04) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(80,55,20,0.03) 3px, rgba(80,55,20,0.03) 4px),` : '';
  const vellumExtra = t.id === 'vellum' ? 'box-shadow: inset 0 0 30px rgba(200,195,180,0.15), -1px -1px 0 rgba(255,255,255,0.85), 1px 1px 0 rgba(100,85,60,0.18), 0 4px 8px rgba(0,0,0,0.12), 0 12px 28px rgba(0,0,0,0.18);' : '';
  const bgImage = linenOverlay + newsprintOverlay + wcoOverlay + kraftOverlay + t.bg;
  const filter = filterMap[t.id] ? `filter: ${filterMap[t.id]};` : '';
  const edgeStyle = `border-right: 3px solid ${t.edgeRight};`;
  return { card: `background: ${bgImage}; ${filter} ${vellumExtra} ${edgeStyle}`, overlay: 'display:none' };
}

function buildThemeGrid() {
  const grid = document.getElementById('themeGrid'); grid.innerHTML = '';
  THEMES.forEach(t => {
    const opt = document.createElement('div');
    opt.className = 'theme-option' + (t.id === activeTheme ? ' selected' : '');
    opt.dataset.themeId = t.id;
    const previewStyles = buildPreviewStyle(t);
    opt.innerHTML = `<div class="theme-card-preview" style="${previewStyles.card}"><div style="${previewStyles.overlay}"></div><div class="theme-preview-label" style="color:${t.inkLabel}">Question</div><div class="theme-preview-text" style="color:${t.inkDark}; font-family:'Crimson Pro',serif; font-weight:300;">What is the powerhouse of the cell?</div><div class="theme-fold"></div></div><div class="theme-meta"><div class="theme-name-row"><div class="theme-name">${t.name}</div><div class="theme-tick">&#x2713;</div></div><div class="theme-desc">${t.desc}</div></div>`;
    opt.addEventListener('click', () => selectTheme(t.id));
    grid.appendChild(opt);
  });
}

function selectTheme(id) {
  activeTheme = id;
  document.querySelectorAll('.theme-option').forEach(el => el.classList.toggle('selected', el.dataset.themeId === id));
  document.getElementById('themeSavedNote').textContent = '';
}


const STORAGE_KEY = 'flashcard_deck';

let CARDS = [];
let reviewQueue = []; // array of card indices
let correctPile = [];
let retryPile = [];

function storageSaveInitial(cards) {
  const data = { uploadedAt: new Date().toISOString(), cards, reviewQueue: cards.map((_,i)=>i), correctPile: [], retryPile: [] };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

function storageSaveSession() {
  const saved = storageLoad();
  if (saved) {
    saved.reviewQueue = reviewQueue;
    saved.correctPile = correctPile;
    saved.retryPile = retryPile;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch(e) {}
  }
}

function storageLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.cards || !Array.isArray(p.cards) || !p.cards.length) return null;
    return p;
  } catch(e) { return null; }
}
function storageClear() { try { localStorage.removeItem(STORAGE_KEY); } catch(e) {} }
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return 'Uploaded ' + d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) + ' at ' + d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  } catch(e) { return ''; }
}


const fileInput = document.getElementById('fileInput'), dropzone = document.getElementById('dropzone'), parseStatus = document.getElementById('parseStatus'), previewWrap = document.getElementById('previewWrap'), previewBody = document.getElementById('previewBody'), startBtn = document.getElementById('startBtn'), savedBanner = document.getElementById('savedBanner'), savedInfo = document.getElementById('savedInfo'), savedDate = document.getElementById('savedDate'), resumeBtn = document.getElementById('resumeBtn'), discardBtn = document.getElementById('discardBtn');

function setStatus(msg, type) { parseStatus.textContent = msg; parseStatus.className = 'parse-status ' + (type||''); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function parseFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith('.csv'), isXLSX = name.endsWith('.xlsx')||name.endsWith('.xls');
  if (!isCSV && !isXLSX) { setStatus('Unsupported file type. Use .csv or .xlsx','err'); return; }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = isCSV ? XLSX.read(e.target.result,{type:'string'}) : XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      if (!rows.length) { setStatus('The sheet appears to be empty.','err'); return; }

      const norm = rows.map(r => { const o={}; for(const k of Object.keys(r)) o[k.toLowerCase().trim()]=r[k]; return o; });
      const s = norm[0];
      if (!('id' in s)||!('front' in s)||!('back' in s)) { setStatus('Missing columns. Need: id, front, back','err'); startBtn.disabled=true; previewWrap.style.display='none'; return; }

      const errors=[], seen=new Set(), valid=[];
      for (let i=0;i<norm.length;i++) {
        const r=norm[i], id=parseInt(r.id,10);
        if (isNaN(id)||id<1||id>50) { errors.push(`Row ${i+2}: id must be 1-50`); continue; }
        if (seen.has(id))            { errors.push(`Row ${i+2}: duplicate id ${id}`); continue; }
        if (!String(r.front).trim()) { errors.push(`Row ${i+2}: front is empty`); continue; }
        if (!String(r.back).trim())  { errors.push(`Row ${i+2}: back is empty`); continue; }
        seen.add(id);
        valid.push({id, front:String(r.front).trim(), back:String(r.back).trim()});
        if (valid.length>=50) break;
      }
      if (!valid.length) { setStatus(errors[0]||'No valid rows found.','err'); startBtn.disabled=true; previewWrap.style.display='none'; return; }
      valid.sort((a,b)=>a.id-b.id);

      previewBody.innerHTML = valid.map(r=>`<tr><td>${r.id}</td><td>${esc(r.front.length>40?r.front.slice(0,40)+'...':r.front)}</td><td>${esc(r.back.length>40?r.back.slice(0,40)+'...':r.back)}</td></tr>`).join('');
      previewWrap.style.display='block';

      setStatus('\u2713 '+valid.length+' card'+(valid.length>1?'s':'')+' ready', 'ok');
      CARDS = valid;
      startBtn.disabled = false;
    } catch(err) { setStatus('Could not parse file: '+err.message,'err'); }
  };
  if (isCSV) reader.readAsText(file); else reader.readAsArrayBuffer(file);
}

fileInput.addEventListener('change', () => parseFile(fileInput.files[0]));
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drag-over'); const f=e.dataTransfer.files[0]; if(f){fileInput.value='';parseFile(f);} });


function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

startBtn.addEventListener('click', () => {
  storageSaveInitial(CARDS);
  buildThemeGrid();
  document.getElementById('themeSavedNote').textContent = '';
  showScreen('themeScreen');
});

resumeBtn.addEventListener('click', () => {
  buildThemeGrid();
  const existing = THEMES.find(t=>t.id===activeTheme);
  document.getElementById('themeSavedNote').textContent = existing ? 'Current: ' + existing.name : '';
  showScreen('themeScreen');
});

document.getElementById('themeBackBtn').addEventListener('click', () => showScreen('uploadScreen'));

function defaultConfirmHandler() {
  themeSave(activeTheme);
  showScreen('studyScreen');
  initStudy();
}
document.getElementById('themeConfirmBtn').addEventListener('click', defaultConfirmHandler);

document.getElementById('changeThemeBtn').addEventListener('click', () => {
  buildThemeGrid();
  const existing = THEMES.find(t=>t.id===activeTheme);
  document.getElementById('themeSavedNote').textContent = existing ? 'Current: ' + existing.name : '';
  showScreen('themeScreen');
  const confirmBtn = document.getElementById('themeConfirmBtn');
  confirmBtn.onclick = () => {
    themeSave(activeTheme); applyTheme(activeTheme); showScreen('studyScreen');
    confirmBtn.onclick = null; confirmBtn.addEventListener('click', defaultConfirmHandler);
  };
});

discardBtn.addEventListener('click', () => { storageClear(); savedBanner.style.display='none'; resetUploadUI(); });
document.getElementById('restartBtn').addEventListener('click', () => { storageClear(); showScreen('uploadScreen'); resetUploadUI(); });

function resetUploadUI() { CARDS=[]; fileInput.value=''; setStatus('',''); previewWrap.style.display='none'; startBtn.disabled=true; checkSavedDeck(); }

function checkSavedDeck() {
  const saved = storageLoad();
  if (saved) {
    CARDS = saved.cards;
    const isComplete = saved.reviewQueue && saved.reviewQueue.length === 0 && saved.retryPile && saved.retryPile.length === 0;
    document.getElementById('savedTag').textContent = isComplete ? 'Completed deck' : 'Session in progress';
    
    let infoStr = saved.cards.length+' cards';
    if (saved.correctPile && saved.correctPile.length > 0) infoStr += ` · ${saved.correctPile.length} mastered`;
    
    savedInfo.textContent = infoStr;
    savedDate.textContent = formatDate(saved.uploadedAt);
    savedBanner.style.display = 'flex';
  } else {
    savedBanner.style.display = 'none';
  }
}
checkSavedDeck();


const scene = document.getElementById('scene');
const flipBtn = document.getElementById('flipBtn');
const ratingControls = document.getElementById('ratingControls');
const progressEl = document.getElementById('progress');
const doneMsg = document.getElementById('doneMsg');
const correctCountEl = document.getElementById('correctCount');
const retryCountEl = document.getElementById('retryCount');
const correctPileInd = document.getElementById('correctPileInd');
const retryPileInd = document.getElementById('retryPileInd');

let flipped=false, animating=false;

function initStudy() {
  const saved = storageLoad();
  if (saved && saved.reviewQueue) {
    reviewQueue = saved.reviewQueue;
    correctPile = saved.correctPile || [];
    retryPile = saved.retryPile || [];
  } else {
    reviewQueue = CARDS.map((_, i) => i);
    correctPile = [];
    retryPile = [];
  }
  
  // If resumed a completed session, reset it automatically
  if (reviewQueue.length === 0 && retryPile.length === 0) {
     reviewQueue = CARDS.map((_, i) => i);
     correctPile = [];
     storageSaveSession();
  }

  flipped=false; animating=false;
  doneMsg.classList.remove('visible');
  scene.style.display='';
  document.getElementById('controls').style.display='flex';
  
  render();
}

function pad(n) { return String(n).padStart(3,'0'); }

function buildCardWrap(idx, cls) {
  const d = CARDS[idx];
  const wrap = document.createElement('div');
  wrap.className = 'card-wrap ' + cls;
  const fs = d.front.length>100?' small':'', bs = d.back.length>100?' small':'';
  const themeClass = 'theme-' + activeTheme;
  wrap.innerHTML = `
    <div class="face front ${themeClass}">
      <div class="rules"></div>
      <span class="card-corner-mark">Q</span>
      <span class="card-corner-mark bottom-left">${pad(d.id)}</span>
      <div class="card-label">Question</div>
      <div class="card-text${fs}">${esc(d.front)}</div>
      <div class="flip-hint">tap to reveal &#x2197;</div>
      <div class="corner-fold"></div>
    </div>
    <div class="face back ${themeClass}">
      <div class="dot-grid"></div>
      <span class="card-corner-mark">A</span>
      <div class="card-label">Answer</div>
      <div class="card-text${bs}">${esc(d.back)}</div>
      <div class="corner-fold"></div>
    </div>`;
  return wrap;
}

function render() {
  scene.innerHTML='';
  for (let offset=2;offset>=0;offset--) {
    if (offset < reviewQueue.length) {
      const idx = reviewQueue[offset];
      const cls = offset===0?'active':offset===1?'below-1':'below-2';
      scene.appendChild(buildCardWrap(idx,cls));
    }
  }
  bindActiveClick(); updateUI();
}

function bindActiveClick() { const a=scene.querySelector('.card-wrap.active'); if(a) a.addEventListener('click',doFlip); }

function updateUI() {
  progressEl.textContent = `Remaining: ${reviewQueue.length}`;
  correctCountEl.textContent = correctPile.length;
  retryCountEl.textContent = retryPile.length;
  
  correctPileInd.style.opacity = correctPile.length > 0 ? '1' : '0';
  retryPileInd.style.opacity = retryPile.length > 0 ? '1' : '0';

  if (flipped) {
    flipBtn.style.display = 'none';
    ratingControls.style.display = 'flex';
  } else {
    flipBtn.style.display = 'block';
    ratingControls.style.display = 'none';
  }
}

function doFlip() {
  if (animating || reviewQueue.length === 0) return;
  flipped = !flipped;
  const active = scene.querySelector('.card-wrap.active');
  if (!active) return;
  active.style.transition = 'transform 0.65s cubic-bezier(0.23,1,0.32,1)';
  active.style.transform = `rotateY(${flipped?180:0}deg) rotateX(2deg)`;
  updateUI();
}

function doRate(isCorrect) {
  if (animating || reviewQueue.length === 0) return;
  animating = true;

  const activeId = reviewQueue.shift(); 
  if (isCorrect) correctPile.push(activeId);
  else retryPile.push(activeId);

  storageSaveSession();
  updateUI();

  const active = scene.querySelector('.card-wrap.active');
  const b1 = scene.querySelector('.card-wrap.below-1');
  const b2 = scene.querySelector('.card-wrap.below-2');

  if (active) {
    // Set variables for exit animation path
    active.style.setProperty('--exit-x', isCorrect ? '500px' : '-500px');
    active.style.setProperty('--exit-y', isCorrect ? '-400px' : '400px');
    active.style.setProperty('--exit-rot', isCorrect ? '20deg' : '-20deg');
    active.style.setProperty('--exit-start-ry', flipped ? '180deg' : '0deg');
    
    active.style.transition = 'none';
    void active.offsetWidth; // Reflow
    active.classList.replace('active', 'exiting');
    active.addEventListener('animationend', () => active.remove(), {once:true});
  }

  if (b1) {
    b1.classList.replace('below-1', 'entering');
    b1.style.transition = ''; b1.style.transform = '';
    b1.addEventListener('animationend', () => {
      b1.classList.replace('entering', 'active');
      b1.style.transition = 'none'; b1.style.transform = 'rotateY(0deg) rotateX(2deg)';
      b1.addEventListener('click', doFlip);
      animating = false; flipped = false;
      updateUI(); checkCompletion();
    }, {once:true});
  } else {
    animating = false; flipped = false;
    updateUI(); checkCompletion();
  }

  if (b2) {
    b2.classList.replace('below-2', 'below-1');
    b2.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1) 0.15s';
    b2.style.transform = '';
  }

  if (reviewQueue.length >= 3) {
    const nc = buildCardWrap(reviewQueue[2], 'below-2');
    nc.style.opacity = '0'; scene.appendChild(nc);
    requestAnimationFrame(() => requestAnimationFrame(() => { nc.style.transition = 'opacity 0.3s ease 0.2s'; nc.style.opacity = ''; }));
  }
}

function checkCompletion() {
  if (reviewQueue.length === 0) {
    scene.style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    correctPileInd.style.opacity = '0';
    retryPileInd.style.opacity = '0';
    
    document.getElementById('doneStats').innerHTML = `<span class="green">${correctPile.length} mastered</span> &middot; <span class="red">${retryPile.length} to review</span>`;
    
    const continueBtn = document.getElementById('continueReviewBtn');
    if (retryPile.length > 0) {
       continueBtn.textContent = 'Review incorrect cards \u2192';
       continueBtn.style.display = 'block';
    } else {
       continueBtn.style.display = 'none';
       document.getElementById('doneStats').innerHTML = `<span class="green">100% Mastered</span> &middot; Great job!`;
    }
    
    doneMsg.classList.add('visible');
  }
}

document.getElementById('continueReviewBtn').addEventListener('click', () => {
  reviewQueue = [...retryPile];
  retryPile = [];
  storageSaveSession();
  doneMsg.classList.remove('visible');
  scene.style.display = '';
  document.getElementById('controls').style.display = 'flex';
  render();
});

// Event Listeners for Rating
document.getElementById('gotItBtn').addEventListener('click', () => doRate(true));
document.getElementById('reviewBtn').addEventListener('click', () => doRate(false));
flipBtn.addEventListener('click', doFlip);

// Mouse tilt
document.addEventListener('mousemove', e => {
  const active=scene.querySelector('.card-wrap.active');
  if (!active||animating) return;
  const cx=window.innerWidth/2, cy=window.innerHeight/2;
  const tx=((e.clientY-cy)/cy)*-4, ty=((e.clientX-cx)/cx)*5;
  active.style.transition='transform 0.08s linear';
  active.style.transform=`rotateY(${(flipped?180:0)+ty}deg) rotateX(${2+tx}deg)`;
});
document.addEventListener('mouseleave', () => {
  const active=scene.querySelector('.card-wrap.active');
  if (!active||animating) return;
  active.style.transition='transform 0.4s ease-out';
  active.style.transform=`rotateY(${flipped?180:0}deg) rotateX(2deg)`;
});

// Keyboard
document.addEventListener('keydown', e => {
  if (document.getElementById('studyScreen').classList.contains('hidden')) return;
  if (!flipped && (e.key==='f'||e.key==='F'||e.key===' ')) { e.preventDefault(); doFlip(); return; }
  if (flipped) {
      if (e.key==='1') { doRate(false); }
      if (e.key==='2' || e.key===' ') { e.preventDefault(); doRate(true); }
  }
});
