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

The existing `peter-cui-workbench` Pages project uses Direct Upload, with
`main` as its production branch. Local edits do not publish automatically.
The `.github/workflows/deploy-pages.yml` workflow validates and deploys pushes
to `main`, and also supports manual runs on `main`. It requires these GitHub
repository Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`: the account owning the existing Pages project.
- `CLOUDFLARE_API_TOKEN`: a dedicated token with Account → Cloudflare Pages → Edit,
  restricted to that account.

The workflow uses Node.js 24, pnpm 10.33.0 and the lockfile's Wrangler version.
It runs `pnpm check` before deployment; failed checks prevent publishing.

For manual deployment, authenticate with `pnpm exec wrangler login --device` when needed,
then validate with `pnpm check` and explicitly publish the production build:

```bash
pnpm exec wrangler pages deploy dist --project-name peter-cui-workbench --branch main
```

Keep OAuth credentials and API tokens outside the repository. Store the CI token
only in GitHub Secrets; never reuse or copy the local Wrangler OAuth credentials.

## Floor lamp and evening lighting

`src/experience/floorLampModel.ts` builds the reference-inspired floor lamp:
an opaque woven-linen drum shade, a slender brass stem and a curved bronze
trumpet base. It is an approximate reconstruction from a single photo, not a
photogrammetry scan. `FLOOR_LAMP` contains its proportions and placement in the
original room's coordinates. The room GLBs are unchanged.

The model uses a deterministic 256×256 linen texture and fewer than 5,000
triangles. `AccentLights.tsx` controls its warm light; the existing floor-lamp
click target still toggles day/night. No large glow sprite surrounds the shade.

The night palette in `RoomScene.tsx` uses broad warm ambient light, a neutral
front fill and gentler desk/picture lights. Its background (`#514940`) matches
the night UI in `styles.css`. Keep these in sync when adjusting the palette.
Walls and floor remain hidden; the whiteboard, rug and content are unchanged.

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
