import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import yaml from 'js-yaml';

const yamlParser = (text: string): Record<string, unknown>[] => {
  const loaded = yaml.load(text);
  if (Array.isArray(loaded)) return loaded as Record<string, unknown>[];
  if (loaded && typeof loaded === 'object') {
    return Object.entries(loaded as Record<string, Record<string, unknown>>).map(
      ([id, data]) => ({ id, ...data }),
    );
  }
  return [];
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    crumb: z.string().optional(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      caption: z.string(),
      date: z.coerce.date(),
      location: z.string().optional(),
      image: image().optional(),
      featured: z.boolean().default(false),
    }),
});

const projects = defineCollection({
  loader: file('./src/data/projects.yml', { parser: yamlParser }),
  schema: z.object({
    name: z.string(),
    status: z.enum(['active', 'shelved', 'retired', 'archived', 'live']),
    period: z.string(),
    description: z.string(),
    order: z.number().default(0),
  }),
});

const now = defineCollection({
  loader: file('./src/data/now.yml', { parser: yamlParser }),
  schema: z.object({
    label: z.string(),
    text: z.string(),
    order: z.number().default(0),
  }),
});

const mobilePos = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    rotation: z.number().optional(),
    scale: z.number().optional(),
    hide: z.boolean().optional(),
  })
  .optional();

const stickies = defineCollection({
  loader: file('./src/data/stickies.yml', { parser: yamlParser }),
  schema: z.object({
    x: z.number(),
    y: z.number(),
    rotation: z.number().default(0),
    color: z.string().default('#f3c40c'),
    body: z.string(),
    z: z.number().default(2),
    mobile: mobilePos,
  }),
});

const modules = defineCollection({
  loader: file('./src/data/modules.yml', { parser: yamlParser }),
  schema: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    viewZoom: z.number().default(1.0),
    mobile: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
    }),
  }),
});

const boxes = defineCollection({
  loader: file('./src/data/boxes.yml', { parser: yamlParser }),
  schema: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().default(320),
    height: z.number().default(180),
    rotation: z.number().default(0),
    variant: z.enum(['paper', 'plain', 'dark', 'accent']).default('paper'),
    pin: z.string().optional(),
    title: z.string().optional(),
    body: z.string().default(''),
    z: z.number().default(2),
    mobile: mobilePos,
  }),
});

const canvasPhotos = defineCollection({
  loader: file('./src/data/canvas-photos.yml', { parser: yamlParser }),
  schema: z.object({
    photoId: z.string(),
    x: z.number(),
    y: z.number(),
    rotation: z.number().default(0),
    scale: z.number().default(1),
    variant: z.enum(['polaroid', 'polaroid-fit', 'framed', 'unframed']).default('polaroid'),
    pinLabel: z.string().optional(),
    z: z.number().default(2),
    mobile: mobilePos,
  }),
});

const readmes = defineCollection({
  loader: file('./src/data/readmes.yml', { parser: yamlParser }),
  schema: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().default(380),
    rotation: z.number().default(0),
    projectId: z.string().optional(),
    viewZoom: z.number().default(0.85),
    pin: z.string().optional(),
    title: z.string().optional(),
    body: z.string().default(''),
    status: z.string().optional(),
    tags: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    z: z.number().default(2),
    mobile: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
    }).optional(),
  }),
});

const codeblocks = defineCollection({
  loader: file('./src/data/codeblocks.yml', { parser: yamlParser }),
  schema: z.object({
    x: z.number(),
    y: z.number(),
    rotation: z.number().default(0),
    z: z.number().default(3),
    label: z.string().optional(),
    language: z.string().default('text'),
    title: z.string().optional(),
    dek: z.string().optional(),
    code: z.string().default(''),
    mobile: mobilePos,
  }),
});

const arrows = defineCollection({
  loader: file('./src/data/arrows.yml', { parser: yamlParser }),
  schema: z.object({
    kind: z.string().default('curly-arrow'),
    x: z.number(),
    y: z.number(),
    width: z.number().default(300),
    height: z.number().default(315),
    rotation: z.number().default(0),
    z: z.number().default(1),
    mobile: mobilePos,
  }),
});

export const collections = { blog, photos, projects, now, stickies, modules, boxes, canvasPhotos, arrows, readmes, codeblocks };
