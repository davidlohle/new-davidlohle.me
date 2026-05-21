import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { editorDevPlugin } from './dev-tools/editor-plugin.mjs';

export default defineConfig({
  site: 'https://davidlohle.me',
  integrations: [sitemap()],
  vite: {
    plugins: [editorDevPlugin()],
  },
});
