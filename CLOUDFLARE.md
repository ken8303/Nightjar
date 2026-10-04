# Deploy Nightjar from GitHub to Cloudflare Workers

Connect `ken8303/Nightjar` to **Workers Builds**, not a static Pages project. The app includes server-rendered routes and `/api/weather`, `/api/locations`, and `/api/aurora`.

## Cloudflare dashboard settings

Create or select a Worker named **nightjar**, then connect the GitHub repository under Settings → Builds.

| Setting | Value |
| --- | --- |
| Repository | `ken8303/Nightjar` |
| Production branch | `main` |
| Root directory | Repository root (`/`) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Non-production branch deploy command, if enabled | `npx wrangler versions upload --config dist/server/wrangler.json` |
| Node version | `22.16.0` (also in `.node-version`) |

Cloudflare installs npm dependencies using the committed lockfile. The build uses Vinext and the Cloudflare Vite plugin to generate `dist/server/wrangler.json`, the server Worker, and client assets. Deploy the generated configuration, not just `dist/client`. The dashboard Worker name must match `name` in `wrangler.jsonc`; change both if choosing another name.

## Local verification

```sh
npm ci
npm run typecheck
npm run build
npm run deploy:check
```

`deploy:check` packages without publishing. `npm run deploy` publishes an already built version and requires Cloudflare credentials; Workers Builds provides deployment authentication. Do not commit API tokens or local `.dev.vars` files.

## Runtime requirements

No D1, R2, or API keys are needed for the current features. Weather/location search use Open-Meteo; aurora uses NOAA. Saved places and equipment stay in browser local storage and do not transfer between site origins.

The existing ChatGPT-hosted site's owner-only access does **not** transfer to a separate Cloudflare deployment. A normal Workers URL is public; configure Cloudflare Access if you need restricted access. This repository preparation does not create a Worker, connect GitHub, change sharing, or configure a domain.

After the first successful deployment, check the home page, API requests, `/manifest.webmanifest`, `/sw.js`, and `/offline`. PWA installation needs HTTPS. Install the PWA from the final Cloudflare URL. Full planner startup and live conditions require internet; the service worker provides a cached offline fallback page.

References: https://developers.cloudflare.com/workers/ci-cd/builds/ and https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

The compatibility date is pinned to `2026-05-15`, supported by the locked Wrangler runtime. Compatibility flags are declared only in `wrangler.jsonc` to avoid duplicate flags in generated builds.

`npm run build` stamps `dist/client/sw.js` with a deterministic release fingerprint. Client bundle changes, worker changes and offline-page changes produce new worker bytes without changing `/sw.js`. Deploy that generated file with the other generated assets; do not replace it with `public/sw.js`. Existing clients can then receive the app's Update and reload prompt. After deploying a subsequent release, verify that prompt and saved-plan preservation in the installed PWA on the final origin.
