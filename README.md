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

Day/evening light palettes are defined per environment in `src/themes.ts` and
applied by `RoomScene.tsx`. The practical lights still use the existing day/night
switch. Walls and floor remain hidden; the whiteboard, rug and content are unchanged.

## Environment backgrounds

The top-right `EnvironmentPicker` presents four previews: Interior, Aurora,
Meadow and Coast. The stored IDs (`home`, `aurora`, `prairie`, `ocean`) and
`peter-workbench-theme` storage key remain compatible with earlier versions.
Arrow keys select an environment; Escape dismisses the picker and restores focus.

`EnvironmentBackground.tsx` draws a non-interactive full-screen background using
`environment.frag.glsl`. Interior is a quiet bedroom corner: warm painted walls,
pale wood tones, and a right-hand window with gathered linen and a translucent
inner curtain. There is no office skyline, ceiling slot or stone-panel grid.
Its evening palette stays soft and readable. Bedroom key/window light comes from
the right; other environments keep their existing light direction. This is a
procedural background; it does not reposition furniture or restore the old wall
and floor meshes.

Other themes use aurora filaments, layered grassland, and perspective-compressed
sea ripples. These are art-directed environments, not photographs or additional
room meshes. There are no external texture requests or continuous CanvasTexture
uploads. Static WebP previews under `public/images/environments/` are rendered
from the same shader. Use a new content-hashed preview filename when replacing
an existing immutable asset; the optional `preview` field in `themes.ts` overrides
the default theme-ID filename.

Background weights and lighting use bounded exponential interpolation. The night
mix affects both the background and room lighting. Reduced-motion mode disables
automatic movement and makes environment changes immediate; hidden tabs pause the
background clock. GPU cost and frame rate still depend on the device and the
existing room geometry/shadows. To tune the look, edit the GLSL alongside the
matching palette in `themes.ts`; keep preview images in sync.

## Background music

The lower-left `MusicPlayer` defaults to a single 52px CD button, with no visible
card, song title or controls. Clicking it reveals the complete player; clicking
the CD again, the close button, outside the player, or pressing Escape collapses
it. Keyboard focus returns to the CD when explicitly dismissed. The same disc
and native audio element stay mounted, so collapsing does not interrupt playback
or reset rotation. The player is outside the 3D scene; theme changes and content
panels do not restart it. `src/data/music.json`
defines the order, titles, artists, durations, MP3 URLs and album covers. The three
tracks and embedded artwork were supplied by the site owner, who confirmed
permission for public playback/display. Only add assets you have permission to
publish: files under `public/` remain publicly accessible.

- No autoplay and no MP3 source assigned until the visitor presses Play or selects
  a song. The first visit starts at 30% volume; only volume is remembered.
- Previous/next retains the paused/playing intent; the final track loops to the
  first. Seeking becomes available after metadata loads. If a CDN does not expose
  a usable seek range, `seekableSource.ts` buffers that track on demand into a
  revocable local Blob URL (8 MiB maximum), reusing the HTTP cache. Buffers and
  in-flight requests are released on track changes/unmount. Failed playback shows
  an actionable message rather than endlessly skipping tracks.
- The album CD rotates once every 24 seconds only during playback. Pause holds
  its angle; reduced-motion preferences disable the rotation.
- Open the CD first, then the playlist for song selection, volume and mute.
  Escape collapses the entire player; only volume is persisted, not its open state.
- Audio lives in `public/audio/` and extracted WebP covers in `public/images/music/`.
  Filenames contain content hashes for immutable caching. Replace the filename
  and manifest URL when changing an asset.

`src/audio/musicController.test.ts` covers lazy loading, transport, repeat,
metadata, seeking, volume, errors, stale playback promises and cleanup.

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
