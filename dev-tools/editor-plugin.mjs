import yaml from 'js-yaml';
import { writeFile, utimes } from 'node:fs/promises';
import { join } from 'node:path';

// Per-collection serializers. To support a new editable collection,
// add an entry: input shape from the client → on-disk YAML object.
// To support a new editable collection, add an entry below:
// `file` — destination path; `toDisk` — items from the client → YAML object.
const collections = {
  stickies: {
    file: 'src/data/stickies.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
  modules: {
    file: 'src/data/modules.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
  boxes: {
    file: 'src/data/boxes.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
  canvasPhotos: {
    file: 'src/data/canvas-photos.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
  arrows: {
    file: 'src/data/arrows.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
  readmes: {
    file: 'src/data/readmes.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
  codeblocks: {
    file: 'src/data/codeblocks.yml',
    toDisk: (items) => Object.fromEntries(items.map((it) => [it.id, it.data])),
  },
};

export function editorDevPlugin() {
  return {
    name: 'canvas-editor-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__editor/save')) return next();
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid json' }));
        }
        const spec = collections[payload.collection];
        if (!spec) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: `unknown collection: ${payload.collection}` }));
        }
        if (!Array.isArray(payload.items)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'items must be an array' }));
        }
        const obj = spec.toDisk(payload.items);
        const filepath = join(process.cwd(), spec.file);
        try {
          const dumped = yaml.dump(obj, {
            lineWidth: 120,
            noRefs: true,
            quotingType: '"',
            noCompatMode: true,
          });
          await writeFile(filepath, dumped, 'utf8');
          // Astro's file-loader evicts sibling YAML-backed collections from
          // its in-memory store when one of them reloads; only the changed
          // file gets re-read. Touch the others so each re-fires its loader
          // and the page sees a fully-hydrated store on the next request.
          const now = new Date();
          await Promise.all(
            Object.values(collections)
              .filter((c) => c.file !== spec.file)
              .map((c) => utimes(join(process.cwd(), c.file), now, now).catch(() => {})),
          );
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, written: spec.file, count: payload.items.length }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}
