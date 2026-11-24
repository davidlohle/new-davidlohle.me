# davidlohle.me

The personal site, built with Astro (`output: static`): `npm ci && npm run build` writes `dist/`. How it's put together: [ARCHITECTURE.md](ARCHITECTURE.md).

## How it's hosted
Served from the homelab cluster (homelab D70, `docs/static-sites.md`):
- The build's `dist/` is the site. homelab-images' site recipe runs `npm ci && npm run build` because this repo has a `package.json` at its root.
- `site/nginx.conf`: this site's nginx config, included inside the image's one `server {}` block. The base owns `listen`, the document root, logging and `/healthz`; this file sets paths, headers, redirects and error pages. It may not contain `listen`, `server`, `user`, `load_module` or `include`.
- A push to `main` is picked up within about 5 minutes by homelab's scheduler, built into a signed image (`ghcr.io/davidlohle/site-davidlohle`) and rolled out at once. `www.` redirects to the bare domain at the cluster's Gateway.
