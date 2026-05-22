// Canvas viewport: pan/drag, scroll/zoom, mobile clamping, minimap, and the
// hero wordmark verb rotator. Loaded once from src/pages/index.astro as a
// side-effecting module — top-level code wires up all DOM listeners on parse.
//
// VIEW coords are computed JIT from each module's data-* attrs + offsetHeight,
// so the editor's move/resize changes flow through to nav-button targeting
// without extra plumbing.

import { site } from '../config/site';

const verbs: string[] = [...site.hero.verbs];
const strikes: string[] = [...site.hero.strikes];

const viewport = document.getElementById('viewport')!;
const world = document.getElementById('world')!;
const zoomLabel = document.getElementById('zoom-label')!;
const coordLabel = document.getElementById('coord')!;

const WORLD_W = 8000, WORLD_H = 5400;

// Mobile: a constrained corner of the same world. The canvas metaphor stays,
// but zoom is locked and pan is clamped to a small box around the modules.
const MOBILE_BP = 700;
const MOBILE_WORLD = { w: 400, h: 4350 };
const MOBILE_ZOOM = 1.0;
const isMobile = () => window.innerWidth <= MOBILE_BP;

function applyMobileLayout() {
  // Modules + READMEs both opt into mobile layout via `data-mobile-*` attrs.
  // Whatever has the trio gets repositioned + has its active coords rewritten
  // so getView / panToProject read the mobile layout.
  const selector =
    '[data-editable-type="module"][data-mobile-x],' +
    '[data-editable-type="readme"][data-mobile-x]';
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const mx = el.dataset.mobileX, my = el.dataset.mobileY, mw = el.dataset.mobileWidth;
    if (!mx || !my || !mw) return;
    el.style.left = mx + 'px';
    el.style.top = my + 'px';
    el.style.width = mw + 'px';
    el.dataset.x = mx;
    el.dataset.y = my;
    el.dataset.width = mw;
    el.dataset.viewZoom = String(MOBILE_ZOOM);
  });
}

function getView(section: string): { x: number; y: number; z: number } | null {
  const m = document.querySelector<HTMLElement>(
    `[data-editable-type="module"][data-id="${section}"]`,
  );
  if (!m) return null;
  const x = parseFloat(m.dataset.x || '0') + parseFloat(m.dataset.width || '0') / 2;
  const y = parseFloat(m.dataset.y || '0') + m.offsetHeight / 2;
  const z = parseFloat(m.dataset.viewZoom || '1') || 1;
  return { x, y, z };
}

let zoom = 0.55, panX = 0, panY = 0;
let frame: HTMLDivElement | null = null;

function fitToCenter(wx: number, wy: number, z: number) {
  const vw = window.innerWidth, vh = window.innerHeight;
  panX = vw/2 - wx * z;
  panY = vh/2 - wy * z;
  zoom = z;
}

function clampPan() {
  if (!isMobile()) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const worldW = MOBILE_WORLD.w * zoom;
  const worldH = MOBILE_WORLD.h * zoom;
  panX = worldW <= vw ? (vw - worldW) / 2 : Math.min(0, Math.max(vw - worldW, panX));
  panY = worldH <= vh ? (vh - worldH) / 2 : Math.min(0, Math.max(vh - worldH, panY));
}

function applyTransform(animate = true) {
  clampPan();
  world.style.transition = animate ? '' : 'none';
  world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLabel.textContent = Math.round(zoom * 100) + '%';
  updateMinimap();
}

function jumpTo(section: string) {
  const v = getView(section);
  if (!v) return;
  cancelMomentum();
  fitToCenter(v.x, v.y, v.z);
  applyTransform(true);
  document.querySelectorAll<HTMLButtonElement>('#nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.jump === section);
  });
  // Keep the URL in sync so deep links survive sharing + back/forward.
  // `hero` is the canonical root (`/`); every other section gets its own path.
  const targetPath = section === 'hero' ? '/' : `/${section}`;
  if (location.pathname.replace(/\/$/, '') !== targetPath.replace(/\/$/, '')) {
    history.pushState({ section }, '', targetPath);
  }
  // Let the PostOverlay close itself if it was open (e.g. user clicked
  // Writing nav button while reading a post). Dispatch instead of calling
  // directly to keep viewport.ts unaware of overlay internals.
  window.dispatchEvent(new CustomEvent('navigate-section', { detail: { section } }));
  syncTitle(section);
}

window.addEventListener('popstate', () => {
  const target = sectionFromPath();
  const v = getView(target);
  if (!v) return;
  fitToCenter(v.x, v.y, v.z);
  applyTransform(true);
  document.querySelectorAll<HTMLButtonElement>('#nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.jump === target);
  });
  syncTitle(target);
});

if (isMobile()) applyMobileLayout();

// Deep links — /about, /now, /photo, /projects, /writing, /contact each
// render the canvas and let the script pan to the matching module on load.
// Anything else (including `/`) starts at the hero.
const SECTION_ROUTES = new Set(['about', 'now', 'photo', 'projects', 'writing', 'contact']);
const SECTION_TITLES: Record<string, string> = {
  about: `About · ${site.brand.name}`,
  now: `Now · ${site.brand.name}`,
  photo: `Photography · ${site.brand.name}`,
  projects: `Projects · ${site.brand.name}`,
  writing: `Writing · ${site.brand.name}`,
  contact: `Contact · ${site.brand.name}`,
};
function syncTitle(section: string) {
  // PostOverlay sets its own title from the post's metadata when a post URL
  // is active. Don't override here — the post title is more specific.
  if (location.pathname.startsWith('/writing/') && location.pathname !== '/writing/') return;
  document.title = SECTION_TITLES[section] ?? site.brand.name;
}
function sectionFromPath(): string {
  const path = location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
  if (path.startsWith('writing/')) return 'writing';
  return SECTION_ROUTES.has(path) ? path : 'hero';
}
const initialSection = sectionFromPath();
const initialView = getView(initialSection) ?? getView('hero') ?? { x: 3900, y: 2600, z: 0.55 };
fitToCenter(initialView.x, initialView.y, initialView.z);
applyTransform(false);
document.querySelectorAll<HTMLButtonElement>('#nav button').forEach((b) => {
  b.classList.toggle('active', b.dataset.jump === initialSection);
});

const welcome = document.getElementById('welcome')!;
setTimeout(() => welcome.classList.add('show'), 700);
let welcomeHideScheduled = false;
function scheduleWelcomeHide() {
  if (welcomeHideScheduled) return;
  welcomeHideScheduled = true;
  setTimeout(() => welcome.classList.remove('show'), 2500);
}

// drag pan + fling momentum
//
// On pointerup we kick off a friction-decayed pan animation seeded from the
// last ~80ms of motion. Velocity is tracked in px/ms so the fling feels the
// same regardless of frame timing; momentum is cancelled by the next
// pointerdown or a nav-button jump.
let dragging = false;
let lastX = 0, lastY = 0;
type Sample = { t: number; x: number; y: number };
let samples: Sample[] = [];
const SAMPLE_WINDOW_MS = 80;
let velX = 0, velY = 0;
let momentumRaf: number | null = null;

function cancelMomentum() {
  if (momentumRaf != null) {
    cancelAnimationFrame(momentumRaf);
    momentumRaf = null;
  }
}

function startMomentum() {
  cancelMomentum();
  let lastT = performance.now();
  const step = (now: number) => {
    const dt = Math.min(50, now - lastT);
    lastT = now;
    const targetX = panX + velX * dt;
    const targetY = panY + velY * dt;
    panX = targetX;
    panY = targetY;
    applyTransform(false);
    // clampPan inside applyTransform may have snapped us — if so, the axis
    // hit a wall and the rest of its velocity has nowhere to go.
    if (panX !== targetX) velX = 0;
    if (panY !== targetY) velY = 0;
    // Time-normalized decay (~0.95 per 16ms frame).
    const decay = Math.pow(0.95, dt / 16);
    velX *= decay;
    velY *= decay;
    if (Math.abs(velX) < 0.01 && Math.abs(velY) < 0.01) {
      momentumRaf = null;
      return;
    }
    momentumRaf = requestAnimationFrame(step);
  };
  momentumRaf = requestAnimationFrame(step);
}

viewport.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('button, a, .nav, .controls, .minimap, .topbar, .canvas-photo.framed, .codeblock')) return;
  cancelMomentum();
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
  viewport.classList.add('grabbing');
  world.classList.add('grabbing');
  viewport.setPointerCapture(e.pointerId);
});
viewport.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  panX += dx; panY += dy;
  lastX = e.clientX; lastY = e.clientY;
  const now = performance.now();
  samples.push({ t: now, x: e.clientX, y: e.clientY });
  const cutoff = now - SAMPLE_WINDOW_MS;
  while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
  applyTransform(false);
  // First real pan movement → start the fade-out countdown.
  scheduleWelcomeHide();
});
viewport.addEventListener('pointerup', () => {
  if (!dragging) return;
  dragging = false;
  viewport.classList.remove('grabbing');
  world.classList.remove('grabbing');
  if (samples.length >= 2) {
    const oldest = samples[0];
    const newest = samples[samples.length - 1];
    const dt = newest.t - oldest.t;
    // Stale last-sample (finger paused before lift) → no fling.
    if (dt > 0 && performance.now() - newest.t < 50) {
      velX = (newest.x - oldest.x) / dt;
      velY = (newest.y - oldest.y) / dt;
      const speed = Math.hypot(velX, velY);
      if (speed > 0.05) startMomentum();
    }
  }
  samples = [];
});

// wheel zoom
viewport.addEventListener('wheel', (e) => {
  if (isMobile()) return;
  e.preventDefault();
  const dz = -e.deltaY * 0.0015;
  const newZoom = Math.max(0.25, Math.min(2.5, zoom * (1 + dz)));
  const rect = viewport.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
  zoom = newZoom;
  panX = cx - wx * zoom;
  panY = cy - wy * zoom;
  applyTransform(false);
}, { passive: false });

function zoomBy(f: number) {
  if (isMobile()) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const wx = (vw/2 - panX) / zoom, wy = (vh/2 - panY) / zoom;
  zoom = Math.max(0.25, Math.min(2.5, zoom * f));
  panX = vw/2 - wx * zoom; panY = vh/2 - wy * zoom;
  applyTransform(true);
}
document.getElementById('zoom-in')!.addEventListener('click', () => zoomBy(1.2));
document.getElementById('zoom-out')!.addEventListener('click', () => zoomBy(1/1.2));
document.getElementById('reset')!.addEventListener('click', () => jumpTo('hero'));

document.querySelectorAll<HTMLButtonElement>('#nav button').forEach((btn) => {
  btn.addEventListener('click', () => jumpTo(btn.dataset.jump!));
});

// Project tiles in #m-projects pan to the matching README's detail area.
// The link is by projectId — a README without a projectId is just a free
// card, and a project without a corresponding README does nothing on click.
function panToProject(projectId: string) {
  const readme = document.querySelector<HTMLElement>(
    `[data-editable-type="readme"][data-project-id="${CSS.escape(projectId)}"]`,
  );
  if (!readme) return;
  const x = parseFloat(readme.dataset.x || '0') + parseFloat(readme.dataset.width || '0') / 2;
  const y = parseFloat(readme.dataset.y || '0') + readme.offsetHeight / 2;
  const z = parseFloat(readme.dataset.viewZoom || '0.85') || 0.85;
  fitToCenter(x, y, z);
  applyTransform(true);
}
document.querySelectorAll<HTMLButtonElement>('#m-projects .proj[data-project-id]').forEach((btn) => {
  btn.addEventListener('click', () => panToProject(btn.dataset.projectId!));
});

window.addEventListener('keydown', (e) => {
  if (e.key === '0') jumpTo('hero');
  else if (e.key === 'ArrowUp')    { panY += 80; applyTransform(true); }
  else if (e.key === 'ArrowDown')  { panY -= 80; applyTransform(true); }
  else if (e.key === 'ArrowLeft')  { panX += 80; applyTransform(true); }
  else if (e.key === 'ArrowRight') { panX -= 80; applyTransform(true); }
  else if (e.key === '+' || e.key === '=') zoomBy(1.2);
  else if (e.key === '-') zoomBy(1/1.2);
});

// minimap
const miniWorld = document.getElementById('mini-world')!;
const miniMap = document.getElementById('minimap')!;
const MINI_W = 240, MINI_H = 170;
const scaleMinX = MINI_W / WORLD_W;
const scaleMinY = MINI_H / WORLD_H;

// Minimap dots: the 7 named modules + content primitives (readme,
// canvas-photo, box). Stickies and arrows are skipped — they're annotations
// and connectors, not landmarks, and add clutter at minimap scale.
const MINIMAP_SELECTOR =
  '.mod, [data-editable-type="readme"], [data-editable-type="canvas-photo"], [data-editable-type="box"]';
document.querySelectorAll<HTMLElement>(MINIMAP_SELECTOR).forEach((el) => {
  const left = parseFloat(getComputedStyle(el).left);
  const top = parseFloat(getComputedStyle(el).top);
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const dot = document.createElement('div');
  const isHero = el.id === 'm-hero';
  const isModule = el.classList.contains('mod');
  const variant = isHero ? ' hero' : isModule ? '' : ' aux';
  dot.className = 'mini-mod' + variant;
  dot.style.left = (left * scaleMinX) + 'px';
  dot.style.top = (top * scaleMinY) + 'px';
  dot.style.width = Math.max(3, w * scaleMinX) + 'px';
  dot.style.height = Math.max(3, h * scaleMinY) + 'px';
  miniWorld.appendChild(dot);
});

frame = document.createElement('div');
frame.className = 'frame';
miniWorld.appendChild(frame);

function updateMinimap() {
  if (!frame) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const wx = -panX / zoom, wy = -panY / zoom;
  const ww = vw / zoom, wh = vh / zoom;
  frame.style.left = (wx * scaleMinX) + 'px';
  frame.style.top = (wy * scaleMinY) + 'px';
  frame.style.width = (ww * scaleMinX) + 'px';
  frame.style.height = (wh * scaleMinY) + 'px';
  coordLabel.textContent = `x: ${Math.round(wx + ww/2)} · y: ${Math.round(wy + wh/2)}`;
}

miniMap.addEventListener('click', (e) => {
  const rect = miniMap.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const wx = mx / scaleMinX, wy = my / scaleMinY;
  fitToCenter(wx, wy, zoom);
  applyTransform(true);
});

// wordmark rotator
function pick3(arr: string[]): string[] {
  const a = [...arr];
  const out: string[] = [];
  for (let i = 0; i < 3; i++) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}
function pickOne<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function setInitial() {
  const v = pick3(verbs);
  document.querySelectorAll<HTMLElement>('.verb').forEach((el, i) => {
    el.textContent = v[i];
    el.dataset.current = v[i];
  });
  const s = pickOne(strikes);
  const strikeEl = document.querySelector<HTMLElement>('.strike')!;
  strikeEl.textContent = s;
  strikeEl.dataset.current = s;
}
setInitial();

let tick = 0;
setInterval(() => {
  tick++;
  const slot = tick % 3;
  const els = document.querySelectorAll<HTMLElement>('.verb');
  const el = els[slot];
  const taken = [...els].map((x) => x.dataset.current);
  const pool = verbs.filter((v) => !taken.includes(v));
  if (pool.length) swap(el, pool[Math.floor(Math.random() * pool.length)]);
}, 16000);

function swap(el: HTMLElement, next: string) {
  el.style.transition = 'transform .25s, opacity .25s';
  el.style.opacity = '0';
  el.style.transform = 'translateY(10px)';
  setTimeout(() => {
    el.textContent = next; el.dataset.current = next;
    el.style.transform = 'translateY(-10px)';
    requestAnimationFrame(() => {
      el.style.transition = 'transform .45s cubic-bezier(.2,.7,.2,1), opacity .45s';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, 230);
}

window.addEventListener('resize', () => updateMinimap());

// Dev-only canvas editor. Loaded lazily when ?edit=1 is present.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('edit')) {
  import('../editor/editor').then((m) => m.init()).catch((err) => {
    console.error('[editor] failed to load:', err);
  });
}

// Dev-only live palette explorer. Loaded lazily when ?palette is present.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('palette')) {
  import('../palette/palette').then((m) => m.init()).catch((err) => {
    console.error('[palette] failed to load:', err);
  });
}
