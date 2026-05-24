// Canvas WYSIWYG editor — dev-only.
// Bootstrapped from src/pages/index.astro when ?edit=1 in dev mode.
// Mutates the live DOM as the user drags / inspects, and POSTs the
// resulting state to a Vite middleware that writes the YAML to disk.
//
// Adding a new editable type:
//   1. Tag DOM nodes with data-editable-type="<type>" and data-id="<id>".
//   2. Write an Adapter (below) and register it in `adapters`.
//   3. Add the collection to `dev-tools/editor-plugin.mjs`.

type FieldControl = 'text' | 'textarea' | 'color' | 'number' | 'select' | 'tags' | 'links';
type SelectOption = { value: string; label: string };
type AdapterField = {
  key: string;
  label: string;
  control: FieldControl;
  step?: number;
  options?: () => SelectOption[];
  presets?: string[];
};

type Item = { id: string; data: Record<string, unknown> };

type Resizable = 'none' | 'width' | 'both';

type Adapter = {
  type: string;
  collection: string;
  selector: string;
  fields: AdapterField[] | (() => AdapterField[]);
  resizable: Resizable;
  addLabel?: string; // toolbar button text; absent → no add button
  // Which keys inside item.data hold the x/y/width for drag + resize. Keys may
  // be dotted paths (e.g. 'mobile.x') so an adapter can target a nested object
  // depending on viewport. Defaults to { x: 'x', y: 'y', width: 'width' }.
  positionKeys?: () => { x: string; y: string; width: string };
  create: (at: { x: number; y: number }) => Item;
  read: (el: HTMLElement) => Item;
  write: (el: HTMLElement, item: Item) => void;
  spawn?: (item: Item) => HTMLElement;
};

// Below 700px the module adapter targets the `mobile` sub-object on each entry,
// matching the page runtime's mobile layout.
const MOBILE_BP = 700;
function isMobileEditor(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches;
}

function getFields(adapter: Adapter): AdapterField[] {
  return typeof adapter.fields === 'function' ? adapter.fields() : adapter.fields;
}

function positionKeysFor(adapter: Adapter): { x: string; y: string; width: string } {
  return adapter.positionKeys ? adapter.positionKeys() : { x: 'x', y: 'y', width: 'width' };
}

function getField(item: Item, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    item.data,
  );
}

function setField(item: Item, key: string, value: unknown): void {
  const parts = key.split('.');
  let o: Record<string, unknown> = item.data as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = o[parts[i]];
    if (!next || typeof next !== 'object') o[parts[i]] = {};
    o = o[parts[i]] as Record<string, unknown>;
  }
  o[parts[parts.length - 1]] = value;
}

// ─────────────────────────────  adapters  ─────────────────────────────

type StickyMobile = { x?: number; y?: number; rotation?: number; scale?: number; hide?: boolean };
type StickyData = {
  x: number; y: number; rotation: number; color: string; body: string; z: number;
  mobile?: StickyMobile;
};

const STICKY_BASE_FIELDS: AdapterField[] = [
  { key: 'body', label: 'Body (HTML)', control: 'textarea' },
  {
    key: 'color',
    label: 'Color',
    control: 'color',
    presets: [
      '#f3c40c', // classic yellow
      '#f4a8b8', // pink
      '#a8c8e8', // sky blue
      '#b8d8a8', // mint green
      '#d97947', // orange
      '#d4a8e8', // lavender
      '#fffdf6', // cream
    ],
  },
  { key: 'z', label: 'Z (stack)', control: 'number', step: 1 },
];

const stickyAdapter: Adapter = {
  type: 'sticky',
  collection: 'stickies',
  selector: '[data-editable-type="sticky"]',
  resizable: 'none',
  addLabel: '+ Sticky',
  fields: () =>
    isMobileEditor()
      ? [
          ...STICKY_BASE_FIELDS,
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
        ]
      : [
          ...STICKY_BASE_FIELDS,
          { key: 'rotation', label: 'Rotation (°)', control: 'number', step: 1 },
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
        ],
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: ({ x, y }) => ({
    id: 'sticky-' + Date.now().toString(36),
    data: { x: Math.round(x), y: Math.round(y), rotation: 0, color: '#f3c40c', body: 'New sticky.', z: 2 },
  }),
  read: (el) => {
    const w = window as unknown as { __stickyData?: Record<string, StickyData> };
    const id = el.dataset.id!;
    const rec = w.__stickyData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        color: el.dataset.color || '#f3c40c',
        body: el.innerHTML.replace(/<div class="edit-handle"[^>]*>.*?<\/div>/g, ''),
        z: parseFloat(el.dataset.z || '2'),
      },
    };
  },
  write: (el, item) => {
    const d = item.data as StickyData;
    const useMobile = isMobileEditor() && d.mobile && d.mobile.x != null && d.mobile.y != null;
    const rot = useMobile && d.mobile?.rotation != null ? d.mobile.rotation : d.rotation;
    if (useMobile) {
      el.style.left = d.mobile!.x + 'px';
      el.style.top = d.mobile!.y + 'px';
      el.dataset.x = String(d.mobile!.x);
      el.dataset.y = String(d.mobile!.y);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
    }
    el.style.transform = `rotate(${rot}deg)`;
    el.style.background = d.color;
    el.style.zIndex = String(d.z);
    setBodyHTML(el, d.body);
    el.dataset.rotation = String(d.rotation);
    el.dataset.color = d.color;
    el.dataset.z = String(d.z);
    if (d.mobile?.x != null) el.dataset.mobileX = String(d.mobile.x);
    if (d.mobile?.y != null) el.dataset.mobileY = String(d.mobile.y);
    if (d.mobile?.rotation != null) el.dataset.mobileRotation = String(d.mobile.rotation);
    if (d.mobile?.scale != null) el.dataset.mobileScale = String(d.mobile.scale);
    // Keep the injected record in sync so subsequent reads see the latest data.
    const w = window as unknown as { __stickyData?: Record<string, StickyData> };
    if (w.__stickyData) w.__stickyData[item.id] = structuredClone(d);
  },
  spawn: (item) => {
    const el = document.createElement('div');
    el.className = 'sticky';
    el.dataset.editableType = 'sticky';
    el.dataset.id = item.id;
    document.getElementById('world')!.appendChild(el);
    stickyAdapter.write(el, item);
    return el;
  },
};

type ModuleData = {
  x: number; y: number; width: number; viewZoom: number;
  mobile: { x: number; y: number; width: number };
};

const moduleAdapter: Adapter = {
  type: 'module',
  collection: 'modules',
  selector: '[data-editable-type="module"]',
  resizable: 'width',
  fields: () =>
    isMobileEditor()
      ? [
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
          { key: 'mobile.width', label: 'Mobile Width', control: 'number', step: 10 },
        ]
      : [
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
          { key: 'width', label: 'Width', control: 'number', step: 10 },
          { key: 'viewZoom', label: 'Nav zoom (0.25–2.5)', control: 'number', step: 0.05 },
        ],
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'mobile.width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: () => {
    throw new Error('Modules are predefined; cannot create new ones from the editor.');
  },
  read: (el) => {
    // Source of truth is the dev-only injected record — preserves the fields
    // (viewZoom on mobile, mobile.* on desktop) the runtime layout doesn't
    // surface on data-* attrs.
    const w = window as unknown as { __moduleData?: Record<string, ModuleData> };
    const id = el.dataset.id!;
    const rec = w.__moduleData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        width: parseFloat(el.dataset.width || '400'),
        viewZoom: parseFloat(el.dataset.viewZoom || '1') || 1,
        mobile: {
          x: parseFloat(el.dataset.mobileX || '0'),
          y: parseFloat(el.dataset.mobileY || '0'),
          width: parseFloat(el.dataset.mobileWidth || '320'),
        },
      },
    };
  },
  write: (el, item) => {
    const d = item.data as ModuleData;
    if (isMobileEditor()) {
      el.style.left = d.mobile.x + 'px';
      el.style.top = d.mobile.y + 'px';
      el.style.width = d.mobile.width + 'px';
      el.dataset.x = String(d.mobile.x);
      el.dataset.y = String(d.mobile.y);
      el.dataset.width = String(d.mobile.width);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.style.width = d.width + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
      el.dataset.width = String(d.width);
      el.dataset.viewZoom = String(d.viewZoom);
    }
    el.dataset.mobileX = String(d.mobile.x);
    el.dataset.mobileY = String(d.mobile.y);
    el.dataset.mobileWidth = String(d.mobile.width);
  },
};

type BoxMobile = { x?: number; y?: number; rotation?: number; scale?: number; hide?: boolean };
type BoxData = {
  x: number; y: number; width: number; height: number; rotation: number;
  variant: string; pin: string; title: string; body: string; z: number;
  mobile?: BoxMobile;
};

const BOX_BASE_FIELDS: AdapterField[] = [
  { key: 'pin', label: 'Pin (optional)', control: 'text' },
  { key: 'title', label: 'Title (HTML)', control: 'text' },
  { key: 'body', label: 'Body (HTML)', control: 'textarea' },
  {
    key: 'variant',
    label: 'Variant',
    control: 'select',
    options: () => [
      { value: 'paper', label: 'paper' },
      { value: 'plain', label: 'plain' },
      { value: 'dark', label: 'dark' },
      { value: 'accent', label: 'accent' },
    ],
  },
  { key: 'z', label: 'Z (stack)', control: 'number', step: 1 },
];

const boxAdapter: Adapter = {
  type: 'box',
  collection: 'boxes',
  selector: '[data-editable-type="box"]',
  resizable: 'both',
  addLabel: '+ Box',
  fields: () =>
    isMobileEditor()
      ? [
          ...BOX_BASE_FIELDS,
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
        ]
      : [
          ...BOX_BASE_FIELDS,
          { key: 'rotation', label: 'Rotation (°)', control: 'number', step: 1 },
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
          { key: 'width', label: 'Width', control: 'number', step: 10 },
          { key: 'height', label: 'Height', control: 'number', step: 10 },
        ],
  // Width/height stay desktop-only — the mobile schema has no width/height,
  // so a resize on mobile would update the desktop dimensions.
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: ({ x, y }) => ({
    id: 'box-' + Date.now().toString(36),
    data: {
      x: Math.round(x - 160),
      y: Math.round(y - 80),
      width: 320,
      height: 160,
      rotation: 0,
      variant: 'paper',
      pin: '',
      title: '',
      body: 'New box. Edit me in the inspector.',
      z: 2,
    },
  }),
  read: (el) => {
    const w = window as unknown as { __boxData?: Record<string, BoxData> };
    const id = el.dataset.id!;
    const rec = w.__boxData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        width: parseFloat(el.dataset.width || '320'),
        height: parseFloat(el.dataset.height || '160'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        variant: el.dataset.variant || 'paper',
        pin: el.dataset.pin || '',
        title: el.dataset.title || '',
        body: el.querySelector('.body')?.innerHTML ?? '',
        z: parseFloat(el.dataset.z || '2'),
      },
    };
  },
  write: (el, item) => {
    const d = item.data as BoxData;
    const useMobile = isMobileEditor() && d.mobile && d.mobile.x != null && d.mobile.y != null;
    const rot = useMobile && d.mobile?.rotation != null ? d.mobile.rotation : d.rotation;
    if (useMobile) {
      el.style.left = d.mobile!.x + 'px';
      el.style.top = d.mobile!.y + 'px';
      el.dataset.x = String(d.mobile!.x);
      el.dataset.y = String(d.mobile!.y);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
    }
    el.style.width = d.width + 'px';
    el.style.height = d.height + 'px';
    el.style.transform = `rotate(${rot}deg)`;
    el.style.zIndex = String(d.z);
    el.className = `box ${d.variant}`;
    el.dataset.width = String(d.width);
    el.dataset.height = String(d.height);
    el.dataset.rotation = String(d.rotation);
    el.dataset.variant = d.variant;
    el.dataset.pin = d.pin;
    el.dataset.title = d.title;
    el.dataset.z = String(d.z);
    if (d.mobile?.x != null) el.dataset.mobileX = String(d.mobile.x);
    if (d.mobile?.y != null) el.dataset.mobileY = String(d.mobile.y);
    if (d.mobile?.rotation != null) el.dataset.mobileRotation = String(d.mobile.rotation);
    if (d.mobile?.scale != null) el.dataset.mobileScale = String(d.mobile.scale);
    const w = window as unknown as { __boxData?: Record<string, BoxData> };
    if (w.__boxData) w.__boxData[item.id] = structuredClone(d);
    // Rebuild inner structure but preserve the resize handle (if any).
    const handle = el.querySelector('.edit-handle');
    const parts: string[] = [];
    if (d.pin) parts.push(`<span class="pin">${d.pin}</span>`);
    if (d.title) parts.push(`<h3>${d.title}</h3>`);
    parts.push(`<div class="body">${d.body}</div>`);
    el.innerHTML = parts.join('');
    if (handle) el.appendChild(handle);
  },
  spawn: (item) => {
    const el = document.createElement('div');
    el.dataset.editableType = 'box';
    el.dataset.id = item.id;
    document.getElementById('world')!.appendChild(el);
    boxAdapter.write(el, item);
    return el;
  },
};

type PhotoVariant = 'polaroid' | 'polaroid-fit' | 'framed' | 'unframed';
type PhotoMobile = { x?: number; y?: number; rotation?: number; scale?: number; hide?: boolean };
type PhotoData = {
  x: number; y: number; rotation: number; scale: number;
  photoId: string; variant: PhotoVariant; pinLabel: string; z: number;
  mobile?: PhotoMobile;
};

const PHOTO_BASE_FIELDS: AdapterField[] = [
  {
    key: 'photoId',
    label: 'Photo',
    control: 'select',
    options: () => {
      const w = window as unknown as { __photoOptions?: { id: string; caption: string }[] };
      return (w.__photoOptions || []).map((p) => ({ value: p.id, label: `${p.caption} (${p.id})` }));
    },
  },
  {
    key: 'variant',
    label: 'Variant',
    control: 'select',
    options: () => [
      { value: 'polaroid', label: 'polaroid (4:5 crop)' },
      { value: 'polaroid-fit', label: 'polaroid (hug photo)' },
      { value: 'framed', label: 'framed (screenshot)' },
      { value: 'unframed', label: 'unframed (bare image)' },
    ],
  },
  { key: 'pinLabel', label: 'Pin label (framed only)', control: 'text' },
  { key: 'z', label: 'Z (stack)', control: 'number', step: 1 },
];

const photoAdapter: Adapter = {
  type: 'canvas-photo',
  collection: 'canvasPhotos',
  selector: '[data-editable-type="canvas-photo"]',
  resizable: 'none',
  addLabel: '+ Photo',
  fields: () =>
    isMobileEditor()
      ? [
          ...PHOTO_BASE_FIELDS,
          { key: 'mobile.scale', label: 'Mobile Scale', control: 'number', step: 0.05 },
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
        ]
      : [
          ...PHOTO_BASE_FIELDS,
          { key: 'scale', label: 'Scale', control: 'number', step: 0.1 },
          { key: 'rotation', label: 'Rotation (°)', control: 'number', step: 1 },
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
        ],
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: ({ x, y }) => {
    const w = window as unknown as { __photoOptions?: { id: string; caption: string }[] };
    const first = w.__photoOptions?.[0];
    return {
      id: 'canvas-photo-' + Date.now().toString(36),
      data: {
        photoId: first?.id ?? '',
        x: Math.round(x - 110),
        y: Math.round(y - 140),
        rotation: 0,
        scale: 1,
        variant: 'polaroid',
        pinLabel: '',
        z: 2,
      },
    };
  },
  read: (el) => {
    const w = window as unknown as { __photoData?: Record<string, PhotoData> };
    const id = el.dataset.id!;
    const rec = w.__photoData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        scale: parseFloat(el.dataset.scale || '1'),
        photoId: el.dataset.photoId || '',
        variant: (el.dataset.variant as PhotoVariant) || 'polaroid',
        pinLabel: el.dataset.pinLabel || '',
        z: parseFloat(el.dataset.z || '2'),
      },
    };
  },
  write: (el, item) => {
    const d = item.data as PhotoData;
    const useMobile = isMobileEditor() && d.mobile && d.mobile.x != null && d.mobile.y != null;
    const rot = useMobile && d.mobile?.rotation != null ? d.mobile.rotation : d.rotation;
    const scale = useMobile && d.mobile?.scale != null ? d.mobile.scale : d.scale;
    if (useMobile) {
      el.style.left = d.mobile!.x + 'px';
      el.style.top = d.mobile!.y + 'px';
      el.dataset.x = String(d.mobile!.x);
      el.dataset.y = String(d.mobile!.y);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
    }
    el.style.transform = `rotate(${rot}deg) scale(${scale})`;
    el.style.zIndex = String(d.z);
    el.dataset.rotation = String(d.rotation);
    el.dataset.scale = String(d.scale);
    el.dataset.z = String(d.z);
    if (d.mobile?.x != null) el.dataset.mobileX = String(d.mobile.x);
    if (d.mobile?.y != null) el.dataset.mobileY = String(d.mobile.y);
    if (d.mobile?.rotation != null) el.dataset.mobileRotation = String(d.mobile.rotation);
    if (d.mobile?.scale != null) el.dataset.mobileScale = String(d.mobile.scale);
    const wpd = window as unknown as { __photoData?: Record<string, PhotoData> };
    if (wpd.__photoData) wpd.__photoData[item.id] = structuredClone(d);
    // Update variant class on the wrapper. Always remove both then add one,
    // so toggling in the inspector swaps the rendered style immediately.
    const variant = d.variant || 'polaroid';
    el.classList.remove('polaroid', 'polaroid-fit', 'framed', 'unframed');
    el.classList.add(variant);
    // Rebuild the inner only when something display-affecting changes —
    // avoids tearing down image elements on every drag tick.
    const needsRebuild =
      el.dataset.photoId !== d.photoId ||
      el.dataset.variant !== variant ||
      el.dataset.pinLabel !== d.pinLabel;
    if (needsRebuild) {
      el.dataset.photoId = d.photoId;
      el.dataset.variant = variant;
      el.dataset.pinLabel = d.pinLabel;
      const w = window as unknown as { __photoOptions?: { id: string; caption: string }[] };
      const opt = w.__photoOptions?.find((p) => p.id === d.photoId);
      const caption = opt?.caption ?? d.photoId;
      const handle = el.querySelector('.edit-handle');
      const captionHTML =
        variant === 'framed'
          ? (d.pinLabel ? `<div class="corner-cap"><span class="pin">${escapeText(d.pinLabel)}</span></div>` : '')
          : variant === 'unframed'
            ? ''
            : `<div class="cap">${escapeText(caption)}</div>`;
      el.innerHTML = `
        <div class="frame"><div class="placeholder">${escapeText(caption)}</div></div>
        ${captionHTML}
      `;
      if (handle) el.appendChild(handle);
    }
  },
  spawn: (item) => {
    const el = document.createElement('div');
    el.className = 'canvas-photo';
    el.dataset.editableType = 'canvas-photo';
    el.dataset.id = item.id;
    document.getElementById('world')!.appendChild(el);
    // Force write to render initial contents by clearing the photoId cache first.
    el.dataset.photoId = '';
    photoAdapter.write(el, item);
    return el;
  },
};

type ArrowMobile = { x?: number; y?: number; rotation?: number; scale?: number; hide?: boolean };
type ArrowData = {
  kind: string; x: number; y: number; width: number; height: number; rotation: number; z: number;
  mobile?: ArrowMobile;
};

const ARROW_BASE_FIELDS: AdapterField[] = [
  {
    key: 'kind',
    label: 'Kind',
    control: 'select',
    options: () => {
      const w = window as unknown as { __arrowKinds?: string[] };
      return (w.__arrowKinds || []).map((k) => ({ value: k, label: k }));
    },
  },
  { key: 'z', label: 'Z (stack)', control: 'number', step: 1 },
];

const arrowAdapter: Adapter = {
  type: 'arrow',
  collection: 'arrows',
  selector: '[data-editable-type="arrow"]',
  resizable: 'both',
  addLabel: '+ Arrow',
  fields: () =>
    isMobileEditor()
      ? [
          ...ARROW_BASE_FIELDS,
          { key: 'mobile.scale', label: 'Mobile Scale', control: 'number', step: 0.05 },
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
        ]
      : [
          ...ARROW_BASE_FIELDS,
          { key: 'rotation', label: 'Rotation (°)', control: 'number', step: 1 },
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
          { key: 'width', label: 'Width', control: 'number', step: 10 },
          { key: 'height', label: 'Height', control: 'number', step: 10 },
        ],
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: ({ x, y }) => {
    const w = window as unknown as { __arrowKinds?: string[] };
    const kind = w.__arrowKinds?.[0] ?? 'curly-arrow';
    return {
      id: 'arrow-' + Date.now().toString(36),
      data: {
        kind,
        x: Math.round(x - 150),
        y: Math.round(y - 160),
        width: 300,
        height: 315,
        rotation: 0,
        z: 1,
      },
    };
  },
  read: (el) => {
    const w = window as unknown as { __arrowData?: Record<string, ArrowData> };
    const id = el.dataset.id!;
    const rec = w.__arrowData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        kind: el.dataset.kind || 'curly-arrow',
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        width: parseFloat(el.dataset.width || '300'),
        height: parseFloat(el.dataset.height || '315'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        z: parseFloat(el.dataset.z || '1'),
      },
    };
  },
  write: (el, item) => {
    const d = item.data as ArrowData;
    const useMobile = isMobileEditor() && d.mobile && d.mobile.x != null && d.mobile.y != null;
    const rot = useMobile && d.mobile?.rotation != null ? d.mobile.rotation : d.rotation;
    const xform = useMobile && d.mobile?.scale != null
      ? `rotate(${rot}deg) scale(${d.mobile.scale})`
      : `rotate(${rot}deg)`;
    if (useMobile) {
      el.style.left = d.mobile!.x + 'px';
      el.style.top = d.mobile!.y + 'px';
      el.dataset.x = String(d.mobile!.x);
      el.dataset.y = String(d.mobile!.y);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
    }
    el.style.width = d.width + 'px';
    el.style.height = d.height + 'px';
    el.style.transform = xform;
    el.style.zIndex = String(d.z);
    el.dataset.width = String(d.width);
    el.dataset.height = String(d.height);
    el.dataset.rotation = String(d.rotation);
    el.dataset.z = String(d.z);
    if (d.mobile?.x != null) el.dataset.mobileX = String(d.mobile.x);
    if (d.mobile?.y != null) el.dataset.mobileY = String(d.mobile.y);
    if (d.mobile?.rotation != null) el.dataset.mobileRotation = String(d.mobile.rotation);
    if (d.mobile?.scale != null) el.dataset.mobileScale = String(d.mobile.scale);
    const wad = window as unknown as { __arrowData?: Record<string, ArrowData> };
    if (wad.__arrowData) wad.__arrowData[item.id] = structuredClone(d);
    // Only rebuild inner SVG when kind changes — preserves handle reattachment
    // and avoids repainting on every drag/resize tick.
    if (el.dataset.kind !== d.kind) {
      el.dataset.kind = d.kind;
      const w = window as unknown as { __arrowSvgs?: Record<string, string> };
      const svg = w.__arrowSvgs?.[d.kind] ?? '';
      const handle = el.querySelector('.edit-handle');
      el.innerHTML = svg;
      if (handle) el.appendChild(handle);
    }
  },
  spawn: (item) => {
    const el = document.createElement('div');
    el.className = 'arrow';
    el.dataset.editableType = 'arrow';
    el.dataset.id = item.id;
    document.getElementById('world')!.appendChild(el);
    // Force write() to populate inner SVG by clearing the kind cache first.
    el.dataset.kind = '';
    arrowAdapter.write(el, item);
    return el;
  },
};

type ReadmeLink = { label: string; url: string };
type ReadmeData = {
  x: number; y: number; width: number; rotation: number;
  projectId: string; viewZoom: number;
  pin: string; title: string; body: string; status: string;
  tags: string[]; links: ReadmeLink[];
  z: number;
  mobile?: { x: number; y: number; width: number };
};

function readReadmeArrayAttr<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

const readmeAdapter: Adapter = {
  type: 'readme',
  collection: 'readmes',
  selector: '[data-editable-type="readme"]',
  resizable: 'width',
  addLabel: '+ README',
  fields: () =>
    isMobileEditor()
      ? [
          { key: 'pin', label: 'Pin (optional)', control: 'text' },
          { key: 'title', label: 'Title (HTML)', control: 'text' },
          { key: 'body', label: 'Body (HTML)', control: 'textarea' },
          { key: 'status', label: 'Status (HTML, optional)', control: 'text' },
          { key: 'tags', label: 'Tags (one per line)', control: 'tags' },
          { key: 'links', label: 'Links (one per line: Label | URL)', control: 'links' },
          { key: 'projectId', label: 'Project ID (for tile-click link)', control: 'text' },
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
          { key: 'mobile.width', label: 'Mobile Width', control: 'number', step: 10 },
        ]
      : [
          { key: 'pin', label: 'Pin (optional)', control: 'text' },
          { key: 'title', label: 'Title (HTML)', control: 'text' },
          { key: 'body', label: 'Body (HTML)', control: 'textarea' },
          { key: 'status', label: 'Status (HTML, optional)', control: 'text' },
          { key: 'tags', label: 'Tags (one per line)', control: 'tags' },
          { key: 'links', label: 'Links (one per line: Label | URL)', control: 'links' },
          { key: 'projectId', label: 'Project ID (for tile-click link)', control: 'text' },
          { key: 'viewZoom', label: 'Pan zoom (0.25–2.5)', control: 'number', step: 0.05 },
          { key: 'rotation', label: 'Rotation (°)', control: 'number', step: 1 },
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
          { key: 'width', label: 'Width', control: 'number', step: 10 },
          { key: 'z', label: 'Z (stack)', control: 'number', step: 1 },
        ],
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'mobile.width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: ({ x, y }) => ({
    id: 'readme-' + Date.now().toString(36),
    data: {
      x: Math.round(x - 190),
      y: Math.round(y - 120),
      width: 380,
      rotation: 0,
      projectId: '',
      viewZoom: 0.85,
      pin: 'Recon',
      title: 'New <em>readme</em>.',
      body: '<p>What is it, and why does it exist?</p>',
      status: '',
      tags: [],
      links: [],
      z: 2,
    },
  }),
  read: (el) => {
    // Source of truth is the dev-only injected record — preserves the fields
    // (viewZoom, mobile.*) the runtime layout overwrites on data-* attrs.
    const w = window as unknown as { __readmeData?: Record<string, ReadmeData> };
    const id = el.dataset.id!;
    const rec = w.__readmeData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        width: parseFloat(el.dataset.width || '380'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        projectId: el.dataset.projectId || '',
        viewZoom: parseFloat(el.dataset.viewZoom || '0.85') || 0.85,
        pin: el.dataset.pin || '',
        title: el.dataset.title || '',
        status: el.dataset.status || '',
        body: el.querySelector('.body')?.innerHTML ?? '',
        tags: readReadmeArrayAttr<string>(el.dataset.tags, []),
        links: readReadmeArrayAttr<ReadmeLink>(el.dataset.links, []),
        z: parseFloat(el.dataset.z || '2'),
      },
    };
  },
  write: (el, item) => {
    const d = item.data as ReadmeData;
    if (isMobileEditor() && d.mobile) {
      el.style.left = d.mobile.x + 'px';
      el.style.top = d.mobile.y + 'px';
      el.style.width = d.mobile.width + 'px';
      el.dataset.x = String(d.mobile.x);
      el.dataset.y = String(d.mobile.y);
      el.dataset.width = String(d.mobile.width);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.style.width = d.width + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
      el.dataset.width = String(d.width);
      el.dataset.viewZoom = String(d.viewZoom);
    }
    if (d.mobile) {
      el.dataset.mobileX = String(d.mobile.x);
      el.dataset.mobileY = String(d.mobile.y);
      el.dataset.mobileWidth = String(d.mobile.width);
    }
    el.style.transform = `rotate(${d.rotation}deg)`;
    el.style.zIndex = String(d.z);
    el.dataset.rotation = String(d.rotation);
    el.dataset.projectId = d.projectId;
    el.dataset.pin = d.pin;
    el.dataset.title = d.title;
    el.dataset.status = d.status;
    el.dataset.tags = JSON.stringify(d.tags);
    el.dataset.links = JSON.stringify(d.links);
    el.dataset.z = String(d.z);
    // Keep the injected source-of-truth record in sync so subsequent reads
    // (after drags, inspector edits) reflect the latest data.
    const w = window as unknown as { __readmeData?: Record<string, ReadmeData> };
    if (w.__readmeData) w.__readmeData[item.id] = structuredClone(d);
    const handle = el.querySelector('.edit-handle');
    const parts: string[] = [];
    if (d.pin) parts.push(`<span class="pin">${d.pin}</span>`);
    if (d.title) parts.push(`<h3>${d.title}</h3>`);
    parts.push(`<div class="body">${d.body}</div>`);
    if (d.status) parts.push(`<div class="status">${d.status}</div>`);
    if (d.tags.length) {
      const lis = d.tags.map((t) => `<li>${escapeText(t)}</li>`).join('');
      parts.push(`<ul class="tags">${lis}</ul>`);
    }
    if (d.links.length) {
      const as = d.links.map((l) => `<a class="btn" href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeText(l.label)}</a>`).join('');
      parts.push(`<div class="links">${as}</div>`);
    }
    el.innerHTML = parts.join('');
    if (handle) el.appendChild(handle);
  },
  spawn: (item) => {
    const el = document.createElement('div');
    el.className = 'readme';
    el.dataset.editableType = 'readme';
    el.dataset.id = item.id;
    document.getElementById('world')!.appendChild(el);
    readmeAdapter.write(el, item);
    return el;
  },
};

type CodeblockData = {
  x: number; y: number; rotation: number; z: number;
  label: string; language: string;
  title: string; dek: string; code: string;
  mobile?: { x?: number; y?: number; rotation?: number; scale?: number; hide?: boolean };
};

const TERMINAL_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><rect x="2.5" y="4" width="19" height="16"/><path d="M6 9 l3 3 -3 3"/><path d="M11 15 h6"/></svg>';

const CODE_LANGUAGES = [
  'text', 'python', 'javascript', 'typescript', 'tsx', 'jsx',
  'bash', 'shell', 'json', 'yaml', 'sql', 'go', 'rust', 'java',
  'css', 'html', 'markdown', 'ruby', 'c', 'cpp', 'php',
];

const CODEBLOCK_BASE_FIELDS: AdapterField[] = [
  { key: 'title', label: 'Title (HTML)', control: 'text' },
  { key: 'label', label: 'Label (optional)', control: 'text' },
  {
    key: 'language',
    label: 'Language',
    control: 'select',
    options: () => CODE_LANGUAGES.map((l) => ({ value: l, label: l })),
  },
  { key: 'dek', label: 'Dek (HTML, optional)', control: 'text' },
  { key: 'code', label: 'Code', control: 'textarea' },
  { key: 'z', label: 'Z (stack)', control: 'number', step: 1 },
];

const codeblockAdapter: Adapter = {
  type: 'codeblock',
  collection: 'codeblocks',
  selector: '[data-editable-type="codeblock"]',
  resizable: 'none',
  addLabel: '+ Code',
  fields: () =>
    isMobileEditor()
      ? [
          ...CODEBLOCK_BASE_FIELDS,
          { key: 'mobile.x', label: 'Mobile X', control: 'number', step: 10 },
          { key: 'mobile.y', label: 'Mobile Y', control: 'number', step: 10 },
        ]
      : [
          ...CODEBLOCK_BASE_FIELDS,
          { key: 'rotation', label: 'Rotation (°)', control: 'number', step: 1 },
          { key: 'x', label: 'X', control: 'number', step: 10 },
          { key: 'y', label: 'Y', control: 'number', step: 10 },
        ],
  positionKeys: () =>
    isMobileEditor()
      ? { x: 'mobile.x', y: 'mobile.y', width: 'width' }
      : { x: 'x', y: 'y', width: 'width' },
  create: ({ x, y }) => ({
    id: 'codeblock-' + Date.now().toString(36),
    data: {
      x: Math.round(x - 30),
      y: Math.round(y - 20),
      rotation: 0,
      z: 3,
      label: '',
      language: 'python',
      title: 'New <em>snippet</em>',
      dek: '',
      code: '# code here\n',
    },
  }),
  read: (el) => {
    // Source of truth is the dev-only injected record — the code body is
    // multi-line and survives the round-trip more cleanly than a data-* attr.
    const w = window as unknown as { __codeblockData?: Record<string, CodeblockData> };
    const id = el.dataset.id!;
    const rec = w.__codeblockData?.[id];
    if (rec) return { id, data: structuredClone(rec) };
    return {
      id,
      data: {
        x: parseFloat(el.dataset.x || '0'),
        y: parseFloat(el.dataset.y || '0'),
        rotation: parseFloat(el.dataset.rotation || '0'),
        z: parseFloat(el.dataset.z || '3'),
        label: el.dataset.label || '',
        language: el.dataset.language || 'text',
        title: el.dataset.title || '',
        dek: el.dataset.dek || '',
        code: el.dataset.code || '',
      },
    };
  },
  write: (el, item) => {
    const d = item.data as CodeblockData;
    const useMobile = isMobileEditor() && d.mobile && d.mobile.x != null && d.mobile.y != null;
    const rot = useMobile && d.mobile?.rotation != null ? d.mobile.rotation : d.rotation;
    if (useMobile) {
      el.style.left = d.mobile!.x + 'px';
      el.style.top = d.mobile!.y + 'px';
      el.dataset.x = String(d.mobile!.x);
      el.dataset.y = String(d.mobile!.y);
    } else {
      el.style.left = d.x + 'px';
      el.style.top = d.y + 'px';
      el.dataset.x = String(d.x);
      el.dataset.y = String(d.y);
    }
    el.style.transform = `rotate(${rot}deg)`;
    el.style.zIndex = String(d.z);
    el.dataset.rotation = String(d.rotation);
    el.dataset.z = String(d.z);
    el.dataset.label = d.label;
    el.dataset.language = d.language;
    el.dataset.title = d.title;
    el.dataset.dek = d.dek;
    el.dataset.code = d.code;
    if (d.mobile?.x != null) el.dataset.mobileX = String(d.mobile.x);
    if (d.mobile?.y != null) el.dataset.mobileY = String(d.mobile.y);
    if (d.mobile?.rotation != null) el.dataset.mobileRotation = String(d.mobile.rotation);
    if (d.mobile?.scale != null) el.dataset.mobileScale = String(d.mobile.scale);
    const handle = el.querySelector('.edit-handle');
    el.innerHTML =
      `<span class="cb-icon" aria-hidden="true">${TERMINAL_SVG}</span>` +
      (d.label ? `<span class="cb-label">${d.label}</span>` : '');
    if (handle) el.appendChild(handle);
    const w = window as unknown as { __codeblockData?: Record<string, CodeblockData> };
    if (w.__codeblockData) w.__codeblockData[item.id] = structuredClone(d);
  },
  spawn: (item) => {
    const el = document.createElement('div');
    el.className = 'codeblock';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.dataset.editableType = 'codeblock';
    el.dataset.id = item.id;
    document.getElementById('world')!.appendChild(el);
    codeblockAdapter.write(el, item);
    return el;
  },
};

const adapters: Record<string, Adapter> = {
  sticky: stickyAdapter,
  module: moduleAdapter,
  box: boxAdapter,
  'canvas-photo': photoAdapter,
  arrow: arrowAdapter,
  readme: readmeAdapter,
  codeblock: codeblockAdapter,
};

// ───────────────────────────────  state  ───────────────────────────────

type Selection = { type: string; id: string } | null;

const state = {
  items: new Map<string, Map<string, Item>>(),
  dirty: new Set<string>(),
  selection: null as Selection,
};

let toolbarEl: HTMLElement | null = null;
let inspectorEl: HTMLElement | null = null;

export function init() {
  document.body.classList.add('canvas-edit');
  injectStyles();
  hydrateFromDOM();
  buildToolbar();
  buildInspector();
  wireGlobalInteractions();
  refreshUI();
  console.log('[editor] ready —', countItems(), 'editable items across', state.items.size, 'types');
}

function countItems() {
  let n = 0;
  for (const m of state.items.values()) n += m.size;
  return n;
}

function hydrateFromDOM() {
  for (const adapter of Object.values(adapters)) {
    const map = new Map<string, Item>();
    document.querySelectorAll<HTMLElement>(adapter.selector).forEach((el) => {
      const item = adapter.read(el);
      map.set(item.id, item);
    });
    state.items.set(adapter.type, map);
  }
}

function getEl(type: string, id: string): HTMLElement | null {
  const adapter = adapters[type];
  if (!adapter) return null;
  return document.querySelector<HTMLElement>(
    `${adapter.selector}[data-id="${CSS.escape(id)}"]`,
  );
}

function getItem(type: string, id: string): Item | undefined {
  return state.items.get(type)?.get(id);
}

function markDirty(type: string) {
  state.dirty.add(type);
  refreshUI();
}

function refreshUI() {
  if (!toolbarEl) return;
  const dirtyCount = state.dirty.size;
  const status = toolbarEl.querySelector('.status');
  if (status) {
    status.textContent = dirtyCount === 0
      ? '✓ saved'
      : `● unsaved (${[...state.dirty].join(', ')})`;
  }
  const del = toolbarEl.querySelector<HTMLButtonElement>('[data-act="delete"]');
  if (del) del.disabled = !state.selection;
  const save = toolbarEl.querySelector<HTMLButtonElement>('[data-act="save"]');
  if (save) save.disabled = dirtyCount === 0;
}

function buildToolbar() {
  const t = document.createElement('div');
  t.id = 'edit-toolbar';
  const addButtons = Object.values(adapters)
    .filter((a) => a.addLabel)
    .map((a) => `<button data-act="add" data-type="${a.type}">${a.addLabel}</button>`)
    .join('');
  t.innerHTML = `
    <span class="badge">EDIT</span>
    ${addButtons}
    <button data-act="delete">Delete</button>
    <span class="status"></span>
    <button data-act="save" class="primary">Save</button>
    <a class="exit" href="?">Exit</a>
  `;
  document.body.appendChild(t);
  t.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-act]') as HTMLElement | null;
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'add') addItem(btn.dataset.type!);
    else if (act === 'delete') deleteSelected();
    else if (act === 'save') save();
  });
  toolbarEl = t;
}

function buildInspector() {
  const ins = document.createElement('div');
  ins.id = 'edit-inspector';
  ins.style.display = 'none';
  document.body.appendChild(ins);
  inspectorEl = ins;
}

function renderInspector() {
  if (!inspectorEl) return;
  if (!state.selection) {
    inspectorEl.style.display = 'none';
    return;
  }
  const { type, id } = state.selection;
  const adapter = adapters[type];
  const item = getItem(type, id);
  if (!adapter || !item) {
    inspectorEl.style.display = 'none';
    return;
  }
  inspectorEl.style.display = '';
  const rows = getFields(adapter).map((f) => renderField(f, getField(item, f.key))).join('');
  inspectorEl.innerHTML = `
    <div class="head">
      <strong>${escapeAttr(type)} · ${escapeAttr(id)}</strong>
      <button data-close>×</button>
    </div>
    ${rows}
  `;
  inspectorEl.querySelector('[data-close]')?.addEventListener('click', () => select(null));
  inspectorEl.addEventListener('input', onInspectorInput);
  inspectorEl.addEventListener('change', onInspectorInput);
  inspectorEl.addEventListener('click', onSwatchClick);
}

function onSwatchClick(e: Event) {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-swatch-for]');
  if (!btn || !inspectorEl) return;
  const key = btn.dataset.swatchFor!;
  const color = btn.dataset.color!;
  const input = inspectorEl.querySelector<HTMLInputElement>(`input[type="color"][data-field="${key}"]`);
  if (!input) return;
  input.value = color;
  // Drive the same path as a normal color-wheel change, which writes to state
  // and updates the live DOM. 'input' also triggers the inspector listener.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  inspectorEl.querySelectorAll(`[data-swatch-for="${key}"]`).forEach((s) => s.classList.remove('active'));
  btn.classList.add('active');
}

function renderField(f: AdapterField, value: unknown): string {
  const str = String(value ?? '');
  switch (f.control) {
    case 'textarea':
      return `<label>${f.label}<textarea data-field="${f.key}" rows="4">${escapeText(str)}</textarea></label>`;
    case 'tags': {
      const tags = Array.isArray(value) ? (value as string[]) : [];
      return `<label>${f.label}<textarea data-field="${f.key}" data-control="tags" rows="3">${escapeText(tags.join('\n'))}</textarea></label>`;
    }
    case 'links': {
      const links = Array.isArray(value) ? (value as { label: string; url: string }[]) : [];
      const text = links.map((l) => `${l.label} | ${l.url}`).join('\n');
      return `<label>${f.label}<textarea data-field="${f.key}" data-control="links" rows="3">${escapeText(text)}</textarea></label>`;
    }
    case 'color': {
      const presets = f.presets ?? [];
      const swatches = presets
        .map((p) => {
          const active = p.toLowerCase() === str.toLowerCase() ? ' active' : '';
          return `<button type="button" class="swatch${active}" data-swatch-for="${f.key}" data-color="${escapeAttr(p)}" style="background:${escapeAttr(p)}" title="${escapeAttr(p)}"></button>`;
        })
        .join('');
      const presetRow = presets.length
        ? `<div class="swatches">${swatches}</div>`
        : '';
      return `<label>${f.label}${presetRow}<input type="color" data-field="${f.key}" value="${escapeAttr(str)}"></label>`;
    }
    case 'number':
      return `<label>${f.label}<input type="number" data-field="${f.key}" value="${escapeAttr(str)}" step="${f.step ?? 1}"></label>`;
    case 'select': {
      const opts = (f.options?.() ?? [])
        .map((o) => `<option value="${escapeAttr(o.value)}"${o.value === str ? ' selected' : ''}>${escapeText(o.label)}</option>`)
        .join('');
      return `<label>${f.label}<select data-field="${f.key}">${opts || '<option value="">(none)</option>'}</select></label>`;
    }
    default:
      return `<label>${f.label}<input type="text" data-field="${f.key}" value="${escapeAttr(str)}"></label>`;
  }
}

function onInspectorInput(e: Event) {
  if (!state.selection) return;
  const f = (e.target as HTMLElement).closest('[data-field]') as
    | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (!f) return;
  const { type, id } = state.selection;
  const item = getItem(type, id);
  const adapter = adapters[type];
  if (!item || !adapter) return;
  const key = f.dataset.field!;
  const fieldDef = getFields(adapter).find((x) => x.key === key);
  let value: string | number | string[] | { label: string; url: string }[] = f.value;
  if (fieldDef?.control === 'number') value = parseFloat(f.value) || 0;
  else if (fieldDef?.control === 'tags') {
    value = f.value.split('\n').map((s) => s.trim()).filter(Boolean);
  } else if (fieldDef?.control === 'links') {
    value = f.value
      .split('\n')
      .map((line) => {
        const [label, url] = line.split('|').map((s) => s.trim());
        return label && url ? { label, url } : null;
      })
      .filter((x): x is { label: string; url: string } => x !== null);
  }
  setField(item, key, value);
  const el = getEl(type, id);
  if (el) {
    adapter.write(el, item);
    if (state.selection?.id === id) attachHandleIfNeeded(el, adapter);
  }
  markDirty(type);
}

function select(sel: Selection) {
  document.querySelectorAll('.edit-handle').forEach((h) => h.remove());
  state.selection = sel;
  document.querySelectorAll('[data-editable-type].selected').forEach((el) => {
    el.classList.remove('selected');
  });
  if (sel) {
    const adapter = adapters[sel.type];
    const el = getEl(sel.type, sel.id);
    if (el && adapter) {
      el.classList.add('selected');
      attachHandleIfNeeded(el, adapter);
    }
  }
  renderInspector();
  refreshUI();
}

function attachHandleIfNeeded(el: HTMLElement, adapter: Adapter) {
  if (adapter.resizable === 'none') return;
  if (el.querySelector('.edit-handle')) return;
  const handle = document.createElement('div');
  handle.className = 'edit-handle';
  handle.dataset.mode = adapter.resizable;
  el.appendChild(handle);
}

function syncInspectorField(key: string, value: number | string) {
  if (!inspectorEl) return;
  const f = inspectorEl.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[data-field="${key}"]`,
  );
  if (f && f.value !== String(value)) f.value = String(value);
}

// ──────────────────────────  interactions  ──────────────────────────

function wireGlobalInteractions() {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement;
      const editable = target.closest('[data-editable-type]') as HTMLElement | null;
      const inEditorUI = target.closest('#edit-toolbar, #edit-inspector');
      if (target.closest('.edit-handle')) return; // handle clicks fall through
      if (editable) {
        e.stopPropagation();
        select({ type: editable.dataset.editableType!, id: editable.dataset.id! });
      } else if (!inEditorUI) {
        select(null);
      }
    },
    true,
  );

  document.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, button, a, #edit-toolbar, #edit-inspector')) return;

      // Resize handle takes priority over drag.
      const handle = target.closest('.edit-handle') as HTMLElement | null;
      if (handle) {
        const editable = handle.closest('[data-editable-type]') as HTMLElement | null;
        if (!editable) return;
        e.stopPropagation();
        beginResize(editable, e, handle.dataset.mode as 'width' | 'both');
        return;
      }

      const editable = target.closest('[data-editable-type]') as HTMLElement | null;
      if (!editable) return;
      e.stopPropagation();
      const type = editable.dataset.editableType!;
      const id = editable.dataset.id!;
      select({ type, id });
      beginDrag(editable, e, type, id);
    },
    true,
  );

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const inField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    if (inField) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection) {
      // Modules can't be deleted; the schema defines a fixed set.
      if (state.selection.type === 'module') return;
      deleteSelected();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      select(null);
    }
  });

  // Re-render inspector when the viewport crosses the mobile breakpoint —
  // the module adapter swaps its field set (desktop coords ↔ mobile coords).
  let wasMobile = isMobileEditor();
  window.addEventListener('resize', () => {
    const nowMobile = isMobileEditor();
    if (nowMobile === wasMobile) return;
    wasMobile = nowMobile;
    if (state.selection?.type === 'module') renderInspector();
  });
}

function beginDrag(el: HTMLElement, e: PointerEvent, type: string, id: string) {
  const adapter = adapters[type];
  const item = getItem(type, id);
  if (!adapter || !item) return;
  const pk = positionKeysFor(adapter);
  const zoom = currentZoom();
  const startX = e.clientX, startY = e.clientY;
  const origX = Number(getField(item, pk.x) ?? 0);
  const origY = Number(getField(item, pk.y) ?? 0);
  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / zoom;
    const dy = (ev.clientY - startY) / zoom;
    const nx = Math.round(origX + dx);
    const ny = Math.round(origY + dy);
    setField(item, pk.x, nx);
    setField(item, pk.y, ny);
    adapter.write(el, item);
    attachHandleIfNeeded(el, adapter);
    syncInspectorField(pk.x, nx);
    syncInspectorField(pk.y, ny);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (getField(item, pk.x) !== origX || getField(item, pk.y) !== origY) markDirty(type);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function beginResize(el: HTMLElement, e: PointerEvent, mode: 'width' | 'both') {
  const type = el.dataset.editableType!;
  const id = el.dataset.id!;
  const adapter = adapters[type];
  const item = getItem(type, id);
  if (!adapter || !item) return;
  const pk = positionKeysFor(adapter);
  const zoom = currentZoom();
  const startX = e.clientX, startY = e.clientY;
  const origW = Number(getField(item, pk.width) ?? el.offsetWidth);
  const origH = Number((item.data as { height?: number }).height ?? el.offsetHeight);
  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / zoom;
    const dy = (ev.clientY - startY) / zoom;
    const nw = Math.max(80, Math.round(origW + dx));
    setField(item, pk.width, nw);
    if (mode === 'both') (item.data as { height: number }).height = Math.max(60, Math.round(origH + dy));
    adapter.write(el, item);
    attachHandleIfNeeded(el, adapter);
    syncInspectorField(pk.width, nw);
    if (mode === 'both') syncInspectorField('height', (item.data as { height: number }).height);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    const newW = getField(item, pk.width);
    const newH = (item.data as { height?: number }).height;
    if (newW !== origW || newH !== origH) markDirty(type);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function currentZoom(): number {
  const world = document.getElementById('world');
  if (!world) return 1;
  const matrix = new DOMMatrixReadOnly(getComputedStyle(world).transform);
  return matrix.a || 1;
}

function viewportCenterInWorld(): { x: number; y: number } {
  const world = document.getElementById('world');
  if (!world) return { x: 0, y: 0 };
  const matrix = new DOMMatrixReadOnly(getComputedStyle(world).transform);
  const zoom = matrix.a || 1;
  return {
    x: (window.innerWidth / 2 - matrix.e) / zoom,
    y: (window.innerHeight / 2 - matrix.f) / zoom,
  };
}

function addItem(type: string) {
  const adapter = adapters[type];
  if (!adapter || !adapter.spawn) return;
  const item = adapter.create(viewportCenterInWorld());
  state.items.get(type)!.set(item.id, item);
  adapter.spawn(item);
  markDirty(type);
  select({ type, id: item.id });
}

function deleteSelected() {
  if (!state.selection) return;
  const { type, id } = state.selection;
  if (type === 'module') return; // protected
  state.items.get(type)?.delete(id);
  getEl(type, id)?.remove();
  markDirty(type);
  select(null);
}

// ─────────────────────────────  persistence  ─────────────────────────────

async function save() {
  const dirtyTypes = [...state.dirty];
  if (dirtyTypes.length === 0) return;
  const btn = toolbarEl?.querySelector<HTMLButtonElement>('[data-act="save"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving…';
  }
  try {
    for (const type of dirtyTypes) {
      const adapter = adapters[type];
      const map = state.items.get(type);
      if (!adapter || !map) continue;
      const items = [...map.values()];
      const res = await fetch('/__editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: adapter.collection, items }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'unknown error');
      console.log(`[editor] saved ${adapter.collection} → ${data.written} (${data.count})`);
      state.dirty.delete(type);
    }
  } catch (err) {
    alert('Save failed: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    if (btn) btn.textContent = 'Save';
    refreshUI();
  }
}

// ──────────────────────────────  helpers  ──────────────────────────────

function setBodyHTML(el: HTMLElement, html: string) {
  const handle = el.querySelector('.edit-handle');
  if (el.innerHTML !== html) el.innerHTML = html;
  if (handle && !el.contains(handle)) el.appendChild(handle);
  else if (handle === null) {
    // nothing to restore
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function injectStyles() {
  const css = `
    body.canvas-edit [data-editable-type] {
      cursor: move;
      outline: 1px dashed rgba(183, 58, 42, .35);
      outline-offset: 4px;
      transition: outline-color .15s;
    }
    body.canvas-edit [data-editable-type]:hover {
      outline-color: rgba(183, 58, 42, .7);
    }
    body.canvas-edit [data-editable-type].selected {
      outline: 2px solid #b73a2a;
      outline-offset: 4px;
    }
    body.canvas-edit [data-editable-type="module"] {
      outline-color: rgba(183, 58, 42, .25);
    }
    .edit-handle {
      position: absolute;
      right: -8px; bottom: -8px;
      width: 16px; height: 16px;
      background: #b73a2a;
      border: 2px solid #fffdf6;
      cursor: nwse-resize;
      z-index: 50;
      box-shadow: 0 2px 6px rgba(0,0,0,.2);
    }
    .edit-handle[data-mode="width"] { cursor: ew-resize; }

    #edit-toolbar {
      position: fixed; top: 80px; left: 50%;
      transform: translateX(-50%);
      display: flex; gap: 8px; align-items: center;
      background: #1a1612;
      color: #f1ead7;
      border: 1px solid #1a1612;
      padding: 6px 10px;
      font-family: "Geist Mono", monospace;
      font-size: 11px;
      letter-spacing: .1em;
      z-index: 100;
      box-shadow: 0 12px 30px rgba(40, 30, 20, .25);
      max-width: calc(100vw - 32px);
      flex-wrap: wrap;
    }
    #edit-toolbar .badge {
      background: #b73a2a;
      color: #f1ead7;
      padding: 4px 10px;
      letter-spacing: .2em;
    }
    #edit-toolbar button, #edit-toolbar .exit {
      background: transparent;
      color: #f1ead7;
      border: 1px solid rgba(241, 234, 215, .25);
      padding: 6px 10px;
      font-family: inherit;
      font-size: 11px;
      letter-spacing: .1em;
      text-transform: uppercase;
      cursor: pointer;
      text-decoration: none;
      transition: background .15s;
    }
    #edit-toolbar button:hover:not(:disabled),
    #edit-toolbar .exit:hover {
      background: rgba(241, 234, 215, .1);
    }
    #edit-toolbar button.primary {
      background: #b73a2a;
      border-color: #b73a2a;
    }
    #edit-toolbar button.primary:hover:not(:disabled) {
      background: #d97947;
      border-color: #d97947;
    }
    #edit-toolbar button:disabled {
      opacity: .35;
      cursor: not-allowed;
    }
    #edit-toolbar .status {
      color: rgba(241, 234, 215, .55);
      padding: 0 8px;
      min-width: 90px;
      text-align: center;
    }
    #edit-inspector {
      position: fixed; top: 80px; right: 16px;
      width: 280px;
      background: #fffdf6;
      border: 1px solid #1a1612;
      box-shadow: 0 12px 30px rgba(40, 30, 20, .2);
      padding: 14px 16px;
      font-family: "Geist Mono", monospace;
      font-size: 11px;
      z-index: 100;
      max-height: 80vh;
      overflow-y: auto;
    }
    #edit-inspector .head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px; padding-bottom: 8px;
      border-bottom: 1px solid rgba(26, 22, 18, .1);
    }
    #edit-inspector .head strong {
      font-family: "Geist Mono", monospace;
      font-size: 10px;
      letter-spacing: .15em;
      text-transform: uppercase;
      color: #4d4338;
      font-weight: 500;
    }
    #edit-inspector .head button {
      background: transparent;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #4d4338;
      line-height: 1;
      padding: 0 4px;
    }
    #edit-inspector label {
      display: block;
      font-family: "Geist Mono", monospace;
      font-size: 9px;
      letter-spacing: .15em;
      text-transform: uppercase;
      color: #4d4338;
      margin-bottom: 10px;
    }
    #edit-inspector input,
    #edit-inspector textarea,
    #edit-inspector select {
      display: block;
      width: 100%;
      margin-top: 4px;
      font-family: "Geist Mono", monospace;
      font-size: 12px;
      padding: 6px 8px;
      background: #f1ead7;
      border: 1px solid rgba(26, 22, 18, .15);
      color: #1a1612;
      letter-spacing: 0;
      text-transform: none;
      box-sizing: border-box;
    }
    #edit-inspector input[type="color"] {
      height: 32px;
      padding: 2px;
      cursor: pointer;
    }
    #edit-inspector .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 4px 0 6px;
    }
    #edit-inspector .swatch {
      width: 22px;
      height: 22px;
      border: 1px solid rgba(26, 22, 18, .25);
      cursor: pointer;
      padding: 0;
      box-shadow: 0 1px 2px rgba(40, 30, 20, .12);
      transition: transform .1s, border-color .1s;
    }
    #edit-inspector .swatch:hover { transform: translateY(-1px); }
    #edit-inspector .swatch.active {
      border: 2px solid #b73a2a;
      width: 22px; height: 22px;
    }
    #edit-inspector textarea {
      resize: vertical;
      line-height: 1.4;
      font-family: "Geist Mono", monospace;
    }
  `;
  const style = document.createElement('style');
  style.id = 'edit-styles';
  style.textContent = css;
  document.head.appendChild(style);
}
