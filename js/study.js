import { storageLoad, storageSaveSession } from './storage.js';
import { settings } from './settings.js';
import { themeState } from './themes.js';
import { CARDS } from './upload.js';
import { pad, esc, shuffleArray } from './cards.js';

export let reviewQueue = [];
export let correctPile = [];
export let retryPile   = [];
export let masteryHits = {};
export let flipped    = false;
export let animating  = false;

const scene          = document.getElementById('scene');
const flipBtn        = document.getElementById('flipBtn');
const ratingControls = document.getElementById('ratingControls');
const progressEl     = document.getElementById('progress');
const doneMsg        = document.getElementById('doneMsg');
const correctCountEl = document.getElementById('correctCount');
const retryCountEl   = document.getElementById('retryCount');
const correctPileInd = document.getElementById('correctPileInd');
const retryPileInd   = document.getElementById('retryPileInd');

// fresh=true: ignore any saved queue, build from settings (shuffle, subset)
// fresh=false: resume if a queue exists in storage, otherwise build fresh
export function initStudy(fresh = false) {
  const saved = storageLoad();
  const isResume = !fresh && saved && Array.isArray(saved.reviewQueue) && saved.reviewQueue.length > 0;

  if (isResume) {
    reviewQueue = saved.reviewQueue;
    correctPile = saved.correctPile || [];
    retryPile   = saved.retryPile   || [];
    masteryHits = saved.masteryHits || {};
  } else {
    let allIndices = CARDS.map((_, i) => i);
    if (settings.shuffle) allIndices = shuffleArray(allIndices);
    const cap = settings.subsetSize > 0 ? Math.min(settings.subsetSize, allIndices.length) : allIndices.length;
    reviewQueue = allIndices.slice(0, cap);
    correctPile = [];
    retryPile   = [];
    masteryHits = {};
    storageSaveSession(reviewQueue, correctPile, retryPile, masteryHits);
  }

  flipped   = false;
  animating = false;
  doneMsg.classList.remove('visible');
  scene.style.display = '';
  document.getElementById('controls').style.display = 'flex';
  render();
}

function buildCardWrap(idx, cls) {
  const d = CARDS[idx];
  const wrap = document.createElement('div');
  wrap.className = 'card-wrap ' + cls;
  const frontText = settings.reverseMode ? d.back  : d.front;
  const backText  = settings.reverseMode ? d.front : d.back;
  const fs = frontText.length > 100 ? ' small' : '';
  const bs = backText.length  > 100 ? ' small' : '';
  const themeClass = 'theme-' + themeState.active;
  wrap.innerHTML = `
    <div class="face front ${themeClass}">
      <div class="rules"></div>
      <span class="card-corner-mark">Q</span>
      <span class="card-corner-mark bottom-left">${pad(d.id)}</span>
      <div class="card-label">Question</div>
      <div class="card-text${fs}">${esc(frontText)}</div>
      <div class="flip-hint">tap to reveal &#x2197;</div>
      <div class="corner-fold"></div>
    </div>
    <div class="face back ${themeClass}">
      <div class="dot-grid"></div>
      <span class="card-corner-mark">A</span>
      <div class="card-label">Answer</div>
      <div class="card-text${bs}">${esc(backText)}</div>
      <div class="corner-fold"></div>
    </div>`;
  return wrap;
}

export function render() {
  scene.innerHTML = '';
  for (let offset = 2; offset >= 0; offset--) {
    if (offset < reviewQueue.length) {
      const idx = reviewQueue[offset];
      const cls = offset === 0 ? 'active' : offset === 1 ? 'below-1' : 'below-2';
      scene.appendChild(buildCardWrap(idx, cls));
    }
  }
  bindActiveClick();
  updateUI();
}

function bindActiveClick() {
  const a = scene.querySelector('.card-wrap.active');
  if (a) a.addEventListener('click', doFlip);
}

export function updateUI() {
  progressEl.textContent = `Remaining: ${reviewQueue.length}`;
  correctCountEl.textContent = correctPile.length;
  retryCountEl.textContent   = retryPile.length;
  correctPileInd.style.opacity = correctPile.length > 0 ? '1' : '0';
  retryPileInd.style.opacity   = retryPile.length   > 0 ? '1' : '0';
  if (flipped) {
    flipBtn.style.display        = 'none';
    ratingControls.style.display = 'flex';
  } else {
    flipBtn.style.display        = 'block';
    ratingControls.style.display = 'none';
  }
}

export function doFlip() {
  if (animating || reviewQueue.length === 0) return;
  flipped = !flipped;
  const active = scene.querySelector('.card-wrap.active');
  if (!active) return;
  active.style.transition = 'transform 0.65s cubic-bezier(0.23,1,0.32,1)';
  active.style.transform  = `rotateY(${flipped ? 180 : 0}deg) rotateX(2deg)`;
  updateUI();
}

export function doRate(isCorrect) {
  if (animating || reviewQueue.length === 0) return;
  animating = true;

  const activeId = reviewQueue.shift();
  if (isCorrect) {
    if (settings.masteryThreshold === 1) {
      correctPile.push(activeId);
    } else {
      const hits = (masteryHits[activeId] || 0) + 1;
      masteryHits[activeId] = hits;
      if (hits >= settings.masteryThreshold) {
        correctPile.push(activeId);
        delete masteryHits[activeId];
      } else {
        reviewQueue.push(activeId);
      }
    }
  } else {
    delete masteryHits[activeId];
    retryPile.push(activeId);
  }

  storageSaveSession(reviewQueue, correctPile, retryPile, masteryHits);
  updateUI();

  const active = scene.querySelector('.card-wrap.active');
  const b1     = scene.querySelector('.card-wrap.below-1');
  const b2     = scene.querySelector('.card-wrap.below-2');

  if (active) {
    active.style.setProperty('--exit-x',        isCorrect ? '500px'   : '-500px');
    active.style.setProperty('--exit-y',        isCorrect ? '-400px'  : '400px');
    active.style.setProperty('--exit-rot',      isCorrect ? '20deg'   : '-20deg');
    active.style.setProperty('--exit-start-ry', flipped   ? '180deg'  : '0deg');
    active.style.transition = 'none';
    void active.offsetWidth;
    active.classList.replace('active', 'exiting');
    active.addEventListener('animationend', () => active.remove(), { once: true });
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
    }, { once: true });
  } else {
    animating = false; flipped = false;
    updateUI(); checkCompletion();
  }

  if (b2) {
    b2.classList.replace('below-2', 'below-1');
    b2.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1) 0.15s';
    b2.style.transform  = '';
  }

  if (reviewQueue.length >= 3) {
    const nc = buildCardWrap(reviewQueue[2], 'below-2');
    nc.style.opacity = '0';
    scene.appendChild(nc);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      nc.style.transition = 'opacity 0.3s ease 0.2s';
      nc.style.opacity    = '';
    }));
  }
}

function checkCompletion() {
  if (reviewQueue.length > 0) return;
  scene.style.display = 'none';
  document.getElementById('controls').style.display = 'none';
  correctPileInd.style.opacity = '0';
  retryPileInd.style.opacity   = '0';

  const doneStats  = document.getElementById('doneStats');
  const continueBtn = document.getElementById('continueReviewBtn');
  if (retryPile.length > 0) {
    doneStats.innerHTML = `<span class="green">${correctPile.length} mastered</span> &middot; <span class="red">${retryPile.length} to review</span>`;
    continueBtn.textContent   = 'Review incorrect cards →';
    continueBtn.style.display = 'block';
  } else {
    doneStats.innerHTML       = `<span class="green">100% Mastered</span> &middot; Great job!`;
    continueBtn.style.display = 'none';
  }
  doneMsg.classList.add('visible');
}

export function startRetryRound() {
  reviewQueue = settings.shuffle ? shuffleArray(retryPile) : [...retryPile];
  retryPile   = [];
  masteryHits = {};
  storageSaveSession(reviewQueue, correctPile, retryPile, masteryHits);
  doneMsg.classList.remove('visible');
  scene.style.display = '';
  document.getElementById('controls').style.display = 'flex';
  render();
}
