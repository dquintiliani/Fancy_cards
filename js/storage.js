export const STORAGE_KEY = 'flashcard_deck';
export const SETTINGS_KEY = 'flashcard_settings';
export const THEME_KEY = 'flashcard_theme';

export function storageSaveInitial(cards) {
  const data = {
    uploadedAt: new Date().toISOString(),
    cards,
    reviewQueue: cards.map((_, i) => i),
    correctPile: [],
    retryPile: [],
    masteryHits: {}
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

export function storageSaveSession(reviewQueue, correctPile, retryPile, masteryHits) {
  const saved = storageLoad();
  if (saved) {
    saved.reviewQueue = reviewQueue;
    saved.correctPile = correctPile;
    saved.retryPile = retryPile;
    saved.masteryHits = masteryHits;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch(e) {}
  }
}

export function storageLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.cards || !Array.isArray(p.cards) || !p.cards.length) return null;
    return p;
  } catch(e) { return null; }
}

export function storageClear() {
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
}

export function themeLoad() {
  try { return localStorage.getItem(THEME_KEY) || 'classic'; } catch(e) { return 'classic'; }
}

export function themeSave(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch(e) {}
}

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    return 'Uploaded ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      + ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch(e) { return ''; }
}
