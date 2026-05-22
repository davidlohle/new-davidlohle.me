// Live palette explorer — dev-only.
// Bootstrapped from src/pages/index.astro when ?palette is present in dev.
// Floating panel that swaps CSS custom properties on :root in real time.
// Selected values persist to localStorage so a reload keeps the look.

type Palette = Record<string, string>;

const STORAGE_KEY = 'palette-experiment';

const VARS: { name: string; label: string }[] = [
  { name: '--paper',    label: 'paper'    },
  { name: '--paper-2',  label: 'paper-2'  },
  { name: '--ink',      label: 'ink'      },
  { name: '--ink-soft', label: 'ink-soft' },
  { name: '--accent',   label: 'accent'   },
  { name: '--accent-2', label: 'accent-2' },
];

const PRESETS: Record<string, Palette> = {
  original: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#b73a2a', '--accent-2': '#d97947',
  },
  mulberry: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#6b2a3e', '--accent-2': '#a05468',
  },
  bordeaux: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#5a1f2e', '--accent-2': '#8c3a52',
  },
  plum: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#4a2440', '--accent-2': '#7a4868',
  },
  oxblood: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#3a1a22', '--accent-2': '#6e3242',
  },
  rose: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#8a3e52', '--accent-2': '#c08090',
  },
  claret: {
    '--paper':    '#f1ead7', '--paper-2':  '#ebe1c4',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#7a253c', '--accent-2': '#b04863',
  },
  aubergine: {
    '--paper':    '#f4ecd5', '--paper-2':  '#ede2c0',
    '--ink':      '#1a1612', '--ink-soft': '#4d4338',
    '--accent':   '#3e2538', '--accent-2': '#7a5470',
  },
};

function applyPalette(p: Palette) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(p)) root.style.setProperty(k, v);
  // --rule is derived from --ink at ~10% alpha; keep them in sync so borders
  // stay legible when the ink color shifts.
  if (p['--ink']) root.style.setProperty('--rule', p['--ink'] + '1a');
}

function readCurrent(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const out: Palette = {};
  for (const { name } of VARS) out[name] = cs.getPropertyValue(name).trim() || '#000000';
  return out;
}

function persist(p: Palette) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function loadPersisted(): Palette | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Palette) : null;
  } catch { return null; }
}

function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #palette-panel {
      position: fixed; top: 72px; right: 16px;
      z-index: 200;
      background: #1a1612; color: #f1ead7;
      font-family: "Geist Mono", ui-monospace, monospace;
      font-size: 11px;
      padding: 14px;
      border: 1px solid #f1ead7;
      box-shadow: 0 12px 30px rgba(0,0,0,.3);
      width: 248px;
      user-select: none;
    }
    #palette-panel.collapsed .pp-body { display: none; }
    #palette-panel header {
      display: flex; justify-content: space-between; align-items: center;
      letter-spacing: .15em; text-transform: uppercase;
      margin-bottom: 12px;
    }
    #palette-panel header button {
      background: transparent; color: inherit;
      border: 1px solid #f1ead744;
      font: inherit; padding: 2px 8px; cursor: pointer;
      line-height: 1;
    }
    #palette-panel header button:hover { border-color: #f1ead7; }
    #palette-panel .pp-section {
      margin-bottom: 12px; padding-bottom: 10px;
      border-bottom: 1px solid #f1ead722;
    }
    #palette-panel .pp-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    #palette-panel .pp-label {
      letter-spacing: .15em; text-transform: uppercase;
      color: #f1ead788; margin-bottom: 6px;
    }
    #palette-panel .pp-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    #palette-panel .pp-presets button {
      background: transparent; color: inherit;
      border: 1px solid #f1ead744;
      font: inherit; padding: 6px 4px; cursor: pointer;
      letter-spacing: .1em; text-transform: uppercase;
    }
    #palette-panel .pp-presets button:hover { border-color: #f1ead7; background: #f1ead722; }
    #palette-panel .pp-row {
      display: grid; grid-template-columns: 26px 70px 1fr;
      align-items: center; gap: 8px; margin-bottom: 4px;
    }
    #palette-panel .pp-row input[type=color] {
      -webkit-appearance: none; appearance: none;
      width: 26px; height: 22px; padding: 0;
      border: 1px solid #f1ead744; cursor: pointer;
      background: transparent;
    }
    #palette-panel .pp-row input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
    #palette-panel .pp-row input[type=color]::-webkit-color-swatch { border: none; }
    #palette-panel .pp-row label { color: #f1ead7cc; }
    #palette-panel .pp-row input[type=text] {
      background: #f1ead711; color: inherit;
      border: 1px solid #f1ead722;
      font: inherit; padding: 4px 6px; width: 100%;
    }
    #palette-panel .pp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    #palette-panel .pp-actions button {
      background: #f1ead7; color: #1a1612;
      border: none; font: inherit;
      padding: 8px 4px; cursor: pointer;
      letter-spacing: .12em; text-transform: uppercase;
    }
    #palette-panel .pp-actions button.secondary {
      background: transparent; color: inherit;
      border: 1px solid #f1ead744;
    }
    #palette-panel .pp-actions button:hover { opacity: .85; }
    #palette-panel .pp-toast {
      position: absolute; left: 0; right: 0; bottom: -28px;
      text-align: center;
      background: #f1ead7; color: #1a1612;
      padding: 4px;
      letter-spacing: .12em; text-transform: uppercase;
      opacity: 0; transition: opacity .25s;
      pointer-events: none;
    }
    #palette-panel .pp-toast.show { opacity: 1; }
  `;
  document.head.appendChild(s);
}

function buildPanel() {
  const panel = document.createElement('div');
  panel.id = 'palette-panel';
  panel.innerHTML = `
    <header>
      <span>Palette · live</span>
      <button id="pp-collapse" type="button" aria-label="Collapse">−</button>
    </header>
    <div class="pp-body">
      <div class="pp-section">
        <div class="pp-label">Presets</div>
        <div class="pp-presets" id="pp-presets"></div>
      </div>
      <div class="pp-section">
        <div class="pp-label">Variables</div>
        <div id="pp-rows"></div>
      </div>
      <div class="pp-section">
        <div class="pp-actions">
          <button id="pp-copy" type="button">Copy CSS</button>
          <button id="pp-reset" class="secondary" type="button">Reset</button>
        </div>
      </div>
    </div>
    <div class="pp-toast" id="pp-toast">copied</div>
  `;
  document.body.appendChild(panel);

  const inputs: Record<string, { color: HTMLInputElement; text: HTMLInputElement }> = {};

  function syncInputs(p: Palette) {
    for (const [k, v] of Object.entries(p)) {
      if (!inputs[k]) continue;
      inputs[k].color.value = v;
      inputs[k].text.value = v;
    }
  }

  function applyAndSave() {
    const p: Palette = {};
    for (const { name } of VARS) p[name] = inputs[name].text.value;
    applyPalette(p);
    persist(p);
  }

  // Presets
  const presetsEl = panel.querySelector('#pp-presets') as HTMLElement;
  for (const name of Object.keys(PRESETS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      applyPalette(PRESETS[name]);
      persist(PRESETS[name]);
      syncInputs(PRESETS[name]);
    });
    presetsEl.appendChild(btn);
  }

  // Variable rows
  const rowsEl = panel.querySelector('#pp-rows') as HTMLElement;
  const current = readCurrent();
  for (const { name, label } of VARS) {
    const value = current[name];
    const row = document.createElement('div');
    row.className = 'pp-row';
    row.innerHTML = `
      <input type="color" value="${value}">
      <label>${label}</label>
      <input type="text" value="${value}" spellcheck="false">
    `;
    rowsEl.appendChild(row);

    const colorInput = row.querySelector('input[type=color]') as HTMLInputElement;
    const textInput  = row.querySelector('input[type=text]') as HTMLInputElement;
    inputs[name] = { color: colorInput, text: textInput };

    colorInput.addEventListener('input', () => {
      textInput.value = colorInput.value;
      applyAndSave();
    });
    textInput.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) {
        colorInput.value = textInput.value;
        applyAndSave();
      }
    });
  }

  // Collapse
  const collapseBtn = panel.querySelector('#pp-collapse') as HTMLButtonElement;
  collapseBtn.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    collapseBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
  });

  // Copy / Reset
  const toast = panel.querySelector('#pp-toast') as HTMLElement;
  function flashToast(msg: string) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1200);
  }
  (panel.querySelector('#pp-copy') as HTMLButtonElement).addEventListener('click', async () => {
    const p: Palette = {};
    for (const { name } of VARS) p[name] = inputs[name].text.value;
    const css = ':root {\n' + Object.entries(p).map(([k, v]) => `  ${k}: ${v};`).join('\n') + '\n}';
    try {
      await navigator.clipboard.writeText(css);
      flashToast('copied');
    } catch {
      flashToast('copy failed');
    }
  });
  (panel.querySelector('#pp-reset') as HTMLButtonElement).addEventListener('click', () => {
    applyPalette(PRESETS.original);
    persist(PRESETS.original);
    syncInputs(PRESETS.original);
  });
}

export function init() {
  // Re-apply persisted palette first so the panel's inputs read the actual
  // current values via getComputedStyle instead of the page defaults.
  const persisted = loadPersisted();
  if (persisted) applyPalette(persisted);

  injectStyles();
  buildPanel();
}
