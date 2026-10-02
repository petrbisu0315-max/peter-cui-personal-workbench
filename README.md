# Peter Cui · Personal Workbench

Interactive portfolio built with React, React Three Fiber, Three.js and GSAP.

## Local development

```bash
pnpm install
pnpm dev
```

## Production build

```bash
pnpm build
```

Run the complete local quality gate before publishing:

```bash
pnpm check
```

This runs Oxlint, the hotspot and interaction-state tests, TypeScript, and the Vite production build.

Cloudflare Pages uses `pnpm build` with `dist` as the output directory.

Production site: <https://peter-cui-workbench.pages.dev/>

## Migration package

This repository contains the complete editable website source, public assets,
research attachments, résumé files, and deployable GLB models. Generated
`node_modules/` and `dist/` directories are intentionally excluded; recreate
them with `pnpm install` and `pnpm build`.

The legacy exports in `model-archive/` are distributed as the public GitHub
release asset `model-archive.tar.gz`. This keeps every original binary
available while avoiding GitHub's 100 MB per-file repository limit.

To move the project to another platform:

```bash
git clone <this-repository-url>
cd web-portfolio
pnpm install
pnpm check
pnpm dev
```

To publish a new production build after changing content or code:

```bash
pnpm deploy
```

## Updating portfolio content

Edit the JSON files under `src/data/`:

- `projects.json` — laptop projects
- `photos.json` — camera archive
- `books.json` — reading shelf
- `movies.json` — film notes
- `research.json` — research, writing and works in progress
- `experiences.json` — campus and internship timelines
- `resume.json` — résumé file metadata

Replace `public/documents/peter-cui-resume.pdf` to update the downloadable résumé. Regenerate `public/images/ui/resume-preview-real-20260930.png` from its first page when the PDF changes, and keep `src/data/resume.json` pointed at the same preview file.

The Blender source with the new résumé and ID badge is `../personal-workbench-interactive-v58.blend`. The two lightweight interaction props are exported separately as `public/models/peter-interaction-props.glb` so the verified room model remains untouched.
