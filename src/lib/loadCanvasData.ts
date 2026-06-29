import { getCollection, render } from 'astro:content';
import { getImage } from 'astro:assets';
import { readdirSync, readFileSync } from 'node:fs';
import { join as pathJoin } from 'node:path';
import { fmtPhotoDate } from './format';

const PHOTO_MODAL_SIZES = '(max-width: 700px) 95vw, 80vw';

export type ModuleMobile = { x: number; y: number; width: number };
export type ModulePos = {
  x: number; y: number; width: number; viewZoom: number; mobile: ModuleMobile;
};

const defaultModulePos: ModulePos = {
  x: 0, y: 0, width: 400, viewZoom: 1,
  mobile: { x: 0, y: 0, width: 320 },
};

export async function loadCanvasData() {
  const allPosts = (await getCollection('blog', (p) => !p.data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  // Writing module displays the most recent 5 in the canvas. Every published
  // post still gets its own template (and route, in /writing/[slug].astro)
  // so deep links + SEO work for the entire archive.
  const posts = allPosts.slice(0, 5);

  // Post bodies are no longer inlined on every page. The overlay fetches each
  // one on demand from /writing/fragment/<slug>; deep-link pages inline just
  // their own post (see PostOverlay's activePost). We expose the raw entries
  // by id so the deep-link route can look up the active post for inlining and
  // <title>/OG metadata.
  const postById = new Map(allPosts.map((p) => [p.id, p]));

  const allPhotos = await getCollection('photos');
  const photos = [...allPhotos]
    .sort((a, b) => {
      if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
      return b.data.date.getTime() - a.data.date.getTime();
    })
    .slice(0, 4);

  const photoCount = allPhotos.length;
  const photoLatest = allPhotos.reduce<Date | null>(
    (acc, p) => (!acc || p.data.date > acc ? p.data.date : acc),
    null,
  );

  const boxes = await getCollection('boxes');
  const canvasPhotos = await getCollection('canvasPhotos');
  const readmes = await getCollection('readmes');
  const codeblocks = await getCollection('codeblocks');
  const photoById = new Map(allPhotos.map((p) => [p.id, p]));

  // The lightbox needs a <template> for every photo a user can open. That's
  // the strip's 4 photos plus any photo referenced by a framed canvas-photo
  // (framed = clickable; polaroids stay non-clickable).
  const stripIds = new Set(photos.map((p) => p.id));
  const framedPhotoIds = new Set(
    canvasPhotos
      .filter((cp) => cp.data.variant === 'framed')
      .map((cp) => cp.data.photoId),
  );
  const extraLightboxPhotos = allPhotos.filter(
    (p) => framedPhotoIds.has(p.id) && !stripIds.has(p.id),
  );
  const lightboxPhotos = [...photos, ...extraLightboxPhotos];

  const renderedPhotos = await Promise.all(
    lightboxPhotos.map(async (p) => {
      const { Content } = await render(p);
      const hasBody = (p.body ?? '').trim().length > 0;
      return { photo: p, Content, hasBody, fullDate: fmtPhotoDate(p.data.date) };
    }),
  );

  // Modal-size image URLs for <link rel="preload">. Images inside <template>
  // are inert and never fetched by the browser, so without this the high-res
  // version wouldn't start downloading until the user clicked.
  const modalImagePreloads = (
    await Promise.all(
      photos.map(async (p) => {
        if (!p.data.image) return null;
        const img = await getImage({
          src: p.data.image,
          widths: [800, 1200, 1800],
          sizes: PHOTO_MODAL_SIZES,
        });
        return {
          src: img.src,
          srcset: img.srcSet?.attribute ?? '',
          sizes: PHOTO_MODAL_SIZES,
        };
      }),
    )
  ).filter((x): x is { src: string; srcset: string; sizes: string } => x !== null);

  const projects = [...(await getCollection('projects'))].sort(
    (a, b) => a.data.order - b.data.order,
  );

  const nowItems = [...(await getCollection('now'))].sort(
    (a, b) => a.data.order - b.data.order,
  );

  const stickies = await getCollection('stickies');

  const moduleData = await getCollection('modules');
  const moduleById = new Map(moduleData.map((m) => [m.id, m]));

  function mod(id: string) {
    const m = moduleById.get(id);
    const d = (m?.data ?? defaultModulePos) as ModulePos;
    return {
      'data-editable-type': 'module',
      'data-id': id,
      'data-section': id,
      'data-x': d.x,
      'data-y': d.y,
      'data-width': d.width,
      'data-view-zoom': d.viewZoom,
      'data-mobile-x': d.mobile.x,
      'data-mobile-y': d.mobile.y,
      'data-mobile-width': d.mobile.width,
      style: `left:${d.x}px;top:${d.y}px;width:${d.width}px;`,
    };
  }

  // Editor needs the full module record (including viewZoom + mobile sub-object)
  // so saves don't lose fields the runtime might overwrite on data-* attrs.
  const moduleDataForEditor = Object.fromEntries(moduleData.map((m) => [m.id, m.data]));

  // Same idea for READMEs — viewZoom + mobile sub-object would otherwise be
  // overwritten on mobile, then re-serialized as garbage on save.
  const readmeDataForEditor = Object.fromEntries(readmes.map((r) => [r.id, r.data]));

  // Codeblocks store their `code` body in a data-* attribute, but multi-line
  // YAML survives the round-trip more cleanly when the editor reads from the
  // injected record (newlines & quoting intact).
  const codeblockDataForEditor = Object.fromEntries(codeblocks.map((c) => [c.id, c.data]));

  // Same idea for the remaining annotation types: the mobile sub-object would
  // otherwise be lost on save because the editor's read() path can't recover
  // it from data-* attrs (applyMobileLayout overwrites x/y with mobile coords).
  // Injecting the full record means write() can preserve the un-edited side.
  const stickyDataForEditor = Object.fromEntries(stickies.map((s) => [s.id, s.data]));
  const boxDataForEditor = Object.fromEntries(boxes.map((b) => [b.id, b.data]));
  const photoDataForEditor = Object.fromEntries(canvasPhotos.map((cp) => [cp.id, cp.data]));

  // Arrow SVGs are loaded once at build time from src/data/arrows/. Each .svg
  // file becomes an available "kind" the user can pick from. The arrows
  // collection (positions/sizes/rotation) references kinds by filename stem.
  const arrowDir = pathJoin(process.cwd(), 'src/data/arrows');
  const arrowKinds = readdirSync(arrowDir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace(/\.svg$/, ''));
  const arrowSvgs: Record<string, string> = Object.fromEntries(
    arrowKinds.map((k) => [k, readFileSync(pathJoin(arrowDir, `${k}.svg`), 'utf-8')]),
  );
  const arrows = await getCollection('arrows');
  const arrowDataForEditor = Object.fromEntries(arrows.map((a) => [a.id, a.data]));

  // Editor needs a list of available photo entries to populate its picker.
  // Kept tiny — just id + caption — so it's cheap to include unconditionally.
  const photoOptions = allPhotos.map((p) => ({ id: p.id, caption: p.data.caption }));

  return {
    posts,
    postById,
    photos,
    renderedPhotos,
    photoCount,
    photoLatest,
    modalImagePreloads,
    projects,
    nowItems,
    stickies,
    boxes,
    canvasPhotos,
    readmes,
    codeblocks,
    photoById,
    arrows,
    arrowKinds,
    arrowSvgs,
    photoOptions,
    moduleDataForEditor,
    readmeDataForEditor,
    codeblockDataForEditor,
    stickyDataForEditor,
    boxDataForEditor,
    photoDataForEditor,
    arrowDataForEditor,
    mod,
  };
}
