import { storageSaveInitial, storageClear } from './storage.js';
import { settingsLoad, buildSettingsPanel } from './settings.js';
import { themeState, buildThemeGrid, saveActiveTheme } from './themes.js';
import { CARDS, checkSavedDeck, resetUploadUI, initUploadListeners } from './upload.js';
import { initStudy, render, doFlip, doRate, startRetryRound, flipped, animating } from './study.js';

// Track whether we're starting fresh (new upload) vs resuming a saved session
let startedFresh = false;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// Re-render the study scene with the newly selected theme (mid-session use)
function applyThemeToStudy() {
  if (!document.getElementById('studyScreen').classList.contains('hidden') && CARDS.length) render();
}

function defaultConfirmHandler() {
  saveActiveTheme();
  showScreen('studyScreen');
  initStudy(startedFresh);
}

// ── Upload screen ─────────────────────────────────────────────────────────────

initUploadListeners();

document.getElementById('startBtn').addEventListener('click', () => {
  startedFresh = true;
  storageSaveInitial(CARDS);
  buildThemeGrid();
  buildSettingsPanel(CARDS, false);
  document.getElementById('themeSavedNote').textContent = '';
  showScreen('themeScreen');
});

document.getElementById('resumeBtn').addEventListener('click', () => {
  startedFresh = false;
  buildThemeGrid();
  buildSettingsPanel(CARDS, false);
  const existing = themeState.themes && themeState.themes.find(t => t.id === themeState.active);
  document.getElementById('themeSavedNote').textContent = existing ? 'Current: ' + existing.name : '';
  showScreen('themeScreen');
});

document.getElementById('discardBtn').addEventListener('click', () => {
  storageClear();
  document.getElementById('savedBanner').style.display = 'none';
  resetUploadUI();
});

// ── Theme screen ──────────────────────────────────────────────────────────────

document.getElementById('themeBackBtn').addEventListener('click', () => showScreen('uploadScreen'));
document.getElementById('themeConfirmBtn').addEventListener('click', defaultConfirmHandler);

// ── Study screen ──────────────────────────────────────────────────────────────

document.getElementById('changeThemeBtn').addEventListener('click', () => {
  buildThemeGrid();
  buildSettingsPanel(CARDS, true); // shuffle/subset locked mid-session
  const existing = themeState.themes && themeState.themes.find(t => t.id === themeState.active);
  document.getElementById('themeSavedNote').textContent = existing ? 'Current: ' + existing.name : '';
  showScreen('themeScreen');
  const confirmBtn = document.getElementById('themeConfirmBtn');
  confirmBtn.onclick = () => {
    saveActiveTheme();
    applyThemeToStudy();
    showScreen('studyScreen');
    confirmBtn.onclick = null;
    confirmBtn.addEventListener('click', defaultConfirmHandler);
  };
});

document.getElementById('restartBtn').addEventListener('click', () => {
  storageClear();
  showScreen('uploadScreen');
  resetUploadUI();
});

document.getElementById('continueReviewBtn').addEventListener('click', startRetryRound);
document.getElementById('gotItBtn').addEventListener('click', () => doRate(true));
document.getElementById('reviewBtn').addEventListener('click', () => doRate(false));
document.getElementById('flipBtn').addEventListener('click', doFlip);

// ── Mouse tilt ────────────────────────────────────────────────────────────────

const scene = document.getElementById('scene');

document.addEventListener('mousemove', e => {
  const active = scene.querySelector('.card-wrap.active');
  if (!active || animating) return;
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const tx = ((e.clientY - cy) / cy) * -4;
  const ty = ((e.clientX - cx) / cx) * 5;
  active.style.transition = 'transform 0.08s linear';
  active.style.transform  = `rotateY(${(flipped ? 180 : 0) + ty}deg) rotateX(${2 + tx}deg)`;
});

document.addEventListener('mouseleave', () => {
  const active = scene.querySelector('.card-wrap.active');
  if (!active || animating) return;
  active.style.transition = 'transform 0.4s ease-out';
  active.style.transform  = `rotateY(${flipped ? 180 : 0}deg) rotateX(2deg)`;
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (document.getElementById('studyScreen').classList.contains('hidden')) return;
  if (!flipped && (e.key === 'f' || e.key === 'F' || e.key === ' ')) { e.preventDefault(); doFlip(); return; }
  if (flipped) {
    if (e.key === '1') { doRate(false); }
    if (e.key === '2' || e.key === ' ') { e.preventDefault(); doRate(true); }
  }
});

// ── Hero animation ────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  const heading = document.querySelector('.hero-heading');
  if (heading) requestAnimationFrame(() => heading.classList.add('hero-heading--animated'));
});

// ── Boot ──────────────────────────────────────────────────────────────────────

settingsLoad();
checkSavedDeck();
