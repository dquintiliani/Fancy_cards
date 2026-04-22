import { SETTINGS_KEY } from './storage.js';

export const settings = { shuffle: false, subsetSize: 0, reverseMode: false, masteryThreshold: 1 };

export function settingsSave() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
}

export function settingsLoad() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.shuffle === 'boolean') settings.shuffle = p.shuffle;
    if (typeof p.subsetSize === 'number') settings.subsetSize = p.subsetSize;
    if (typeof p.reverseMode === 'boolean') settings.reverseMode = p.reverseMode;
    if ([1, 2, 3].includes(p.masteryThreshold)) settings.masteryThreshold = p.masteryThreshold;
  } catch(e) {}
}

export function buildSettingsPanel(cards, locked) {
  const panel = document.getElementById('settingsPanel');
  panel.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'settings-panel-title';
  title.textContent = 'Study options';
  panel.appendChild(title);

  panel.appendChild(makeRow({
    id: 'settingsShuffle',
    type: 'toggle',
    label: 'Shuffle cards',
    sub: 'Randomise order each session',
    checked: settings.shuffle,
    locked,
    onChange: val => { settings.shuffle = val; settingsSave(); }
  }));

  const subsetValues = [0, 5, 10, 15, 20, 25].filter(v => v === 0 || v <= cards.length);
  panel.appendChild(makeRow({
    id: 'settingsSubset',
    type: 'select',
    label: 'Cards per session',
    sub: 'Study a portion of your deck',
    options: subsetValues.map(v => ({ value: v, label: v === 0 ? 'All cards' : `${v} cards` })),
    value: settings.subsetSize,
    locked,
    onChange: val => { settings.subsetSize = parseInt(val, 10); settingsSave(); }
  }));

  panel.appendChild(makeRow({
    id: 'settingsReverse',
    type: 'toggle',
    label: 'Reverse mode',
    sub: 'Show answer first, recall the question',
    checked: settings.reverseMode,
    locked: false,
    onChange: val => { settings.reverseMode = val; settingsSave(); }
  }));

  panel.appendChild(makeRow({
    id: 'settingsMastery',
    type: 'select',
    label: 'Correct answers to master',
    sub: 'How many times must you get it right',
    options: [1, 2, 3].map(n => ({ value: n, label: n === 1 ? '1 time' : `${n} times` })),
    value: settings.masteryThreshold,
    locked: false,
    onChange: val => { settings.masteryThreshold = parseInt(val, 10); settingsSave(); }
  }));
}

function makeRow({ id, type, label, sub, checked, options, value, locked, onChange }) {
  const row = document.createElement('div');
  row.className = 'settings-row';

  const labelWrap = document.createElement('div');
  labelWrap.innerHTML = `<div class="settings-label">${label}</div><div class="settings-label-sub">${sub}</div>`;

  const controlWrap = document.createElement('div');
  controlWrap.className = 'settings-control-wrap';

  if (type === 'toggle') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'settings-toggle';
    input.id = id;
    input.checked = checked;
    if (locked) input.disabled = true;
    input.addEventListener('change', () => onChange(input.checked));
    controlWrap.appendChild(input);
  } else {
    const sel = document.createElement('select');
    sel.className = 'settings-select';
    sel.id = id;
    if (locked) sel.disabled = true;
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.value == value) el.selected = true;
      sel.appendChild(el);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    controlWrap.appendChild(sel);
  }

  if (locked) {
    const note = document.createElement('span');
    note.className = 'settings-locked-note';
    note.textContent = 'locked';
    controlWrap.appendChild(note);
  }

  row.appendChild(labelWrap);
  row.appendChild(controlWrap);
  return row;
}
