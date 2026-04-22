import { themeLoad, themeSave } from './storage.js';

export const themeState = {
  themes: null,
  active: themeLoad()
};

fetch('theme.json')
  .then(res => res.json())
  .then(data => { themeState.themes = data; })
  .catch(err => console.error('Failed to load theme.json', err));

export function buildPreviewStyle(t) {
  const filterMap = {
    classic: 'url(#filter-classic)',
    watercolour: 'url(#filter-watercolour)',
    newsprint: 'url(#filter-newsprint)',
    vellum: 'url(#filter-vellum)',
    kraft: 'url(#filter-kraft)'
  };
  const linenOverlay = t.id === 'linen'
    ? `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(180,160,120,0.07) 2px, rgba(180,160,120,0.07) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(180,160,120,0.05) 2px, rgba(180,160,120,0.05) 3px),`
    : '';
  const newsprintOverlay = t.id === 'newsprint'
    ? `repeating-linear-gradient(92deg, transparent, transparent 1px, rgba(160,140,90,0.06) 1px, rgba(160,140,90,0.06) 2px), repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(140,120,70,0.04) 14px, rgba(140,120,70,0.04) 15px),`
    : '';
  const wcoOverlay = t.id === 'watercolour'
    ? `radial-gradient(ellipse 60% 40% at 20% 30%, rgba(210,195,160,0.35) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(200,185,145,0.25) 0%, transparent 65%),`
    : '';
  const kraftOverlay = t.id === 'kraft'
    ? `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(100,70,30,0.04) 3px, rgba(100,70,30,0.04) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(80,55,20,0.03) 3px, rgba(80,55,20,0.03) 4px),`
    : '';
  const vellumExtra = t.id === 'vellum'
    ? 'box-shadow: inset 0 0 30px rgba(200,195,180,0.15), -1px -1px 0 rgba(255,255,255,0.85), 1px 1px 0 rgba(100,85,60,0.18), 0 4px 8px rgba(0,0,0,0.12), 0 12px 28px rgba(0,0,0,0.18);'
    : '';
  const bgImage = linenOverlay + newsprintOverlay + wcoOverlay + kraftOverlay + t.bg;
  const filter = filterMap[t.id] ? `filter: ${filterMap[t.id]};` : '';
  const edgeStyle = `border-right: 3px solid ${t.edgeRight};`;
  return { card: `background: ${bgImage}; ${filter} ${vellumExtra} ${edgeStyle}`, overlay: 'display:none' };
}

export function buildThemeGrid() {
  const grid = document.getElementById('themeGrid');
  grid.innerHTML = '';
  themeState.themes.forEach(t => {
    const opt = document.createElement('div');
    opt.className = 'theme-option' + (t.id === themeState.active ? ' selected' : '');
    opt.dataset.themeId = t.id;
    const s = buildPreviewStyle(t);
    opt.innerHTML = `<div class="theme-card-preview" style="${s.card}"><div style="${s.overlay}"></div><div class="theme-preview-label" style="color:${t.inkLabel}">Question</div><div class="theme-preview-text" style="color:${t.inkDark}; font-family:'Crimson Pro',serif; font-weight:300;">What is the powerhouse of the cell?</div><div class="theme-fold"></div></div><div class="theme-meta"><div class="theme-name-row"><div class="theme-name">${t.name}</div><div class="theme-tick">&#x2713;</div></div><div class="theme-desc">${t.desc}</div></div>`;
    opt.addEventListener('click', () => selectTheme(t.id));
    grid.appendChild(opt);
  });
}

export function selectTheme(id) {
  themeState.active = id;
  document.querySelectorAll('.theme-option').forEach(el =>
    el.classList.toggle('selected', el.dataset.themeId === id)
  );
  document.getElementById('themeSavedNote').textContent = '';
}

export function saveActiveTheme() {
  themeSave(themeState.active);
}
