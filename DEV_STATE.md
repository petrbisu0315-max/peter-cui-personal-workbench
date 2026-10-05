# DEV_STATE

当前目标是把现有 Blender 工作台稳定交付为可在 Cloudflare Pages 访问的 React + TypeScript + Vite 3D 个人作品集，并逐步用真实内容替换示例内容；目前已完成介绍纸进入动画、基于 `peter-hero-current-safe.glb` 的 R3F 场景、独立的 `peter-interaction-props.glb`、01–08 顺序的 Resume/Experience/Research/Projects/Photos/Books/Films/Whiteboard 八个入口、通用内容面板、真实中文简历 PDF 与预览、校园和实习经历、本地 `localStorage` 白板、移动端底部导航及 Cloudflare Pages 部署（`https://peter-cui-workbench.pages.dev/`）。关键决策是保持 Blender/GLB 为场景位置、比例和材质的唯一视觉基线，不在网页重新拼装家具；内容由 `src/data/*.json` 管理；3D 热点按对象名映射，并将镜头聚焦状态与面板状态分离，3D 点击必须等 GSAP 镜头动画完成后再打开面板，而底部导航作为直接访问入口即时打开。核心实现位于 `src/App.tsx`、`src/interactionState.ts`、`src/experience/RoomScene.tsx`、`src/experience/hotspots.ts`、`src/components/ContentPanel.tsx`、`src/components/Whiteboard.tsx` 和 `src/styles.css`，核心资产位于 `public/models/`、`public/documents/peter-cui-resume.pdf` 与 `public/images/ui/resume-preview-real-20260930.png`。2026-10-01 执行 `pnpm check` 已通过 Oxlint、14 个 Vitest 测试、TypeScript 和 Vite 生产构建；测试覆盖八个热点的映射与顺序、3D 点击延迟开面板、底部导航即时打开、过期镜头回调防护及关闭状态复位。浏览器复查确认介绍纸进入、底部 Projects 入口和内容面板正常，且将模型加载器从 Drei `<Html>` portal 移到 Canvas 外后，React 19 Suspense 切换不再产生同步卸载与 `removeChild` 错误；控制台仍有 Three/R3F 依赖内部的 `THREE.Clock` 与 shadow-map 弃用 warning，但没有应用运行时 error。线上首页、7.7 MB 主 GLB 和简历 PDF 此前均返回 HTTP 200；八个底部入口以及电脑/相机/书柜/海报/研究材料/白板等主要 3D 热点此前均已手工验证。工作区及 `web-portfolio/` 仍未初始化 Git，因此无法取得 Git diff；`photos.json` 尚无真实图片路径，Projects/Books/Films/Research 仍以首版内容为主且缺少多数附件或外链，本轮已修正 README 的真实简历预览路径并记录 `pnpm check`。已废弃的方案包括只检查最前方单个射线网格、让 Drei 悬停提示层接收鼠标事件、让同一个 `active` 状态同时触发镜头和面板，以及在 Canvas 内用 Drei `<Html>` 承载 Suspense 加载器；这些方案分别造成重叠物件无法命中、提示出现后点击被拦截、面板先于镜头弹出和 React 19 portal 卸载竞态。下一步应优先获取并补齐真实项目、摄影、书籍、电影、研究与写作内容及附件；工程侧继续进行移动端、Safari、低性能设备和 `prefers-reduced-motion` 回归测试，并针对约 1.31 MB（gzip 约 371 kB）的主 JS chunk 与 7.7 MB 主 GLB 做加载性能优化。

## Latest implementation — 2026-10-01

- 一级界面恢复英文：首屏、房间顶栏、热点悬停、底部导航、加载/错误提示与 HTML 元数据；进入二级内容面板后使用中文标题、正文、分类和操作。
- 已接入 5 张经审核的真实图片到 `public/images/gallery/`：汇报现场、旅途片段、美团实习工牌、小红书实习留念、网易实习工牌；Photos 面板提供分类、主图和缩略图浏览。
- 已接入 2 份科研 PDF 到 `public/documents/research/`，界面明确标为“研究资料”，不宣称作者身份；Projects 仅保留当前可验证的 3D 工作台，Books/Films 在没有确认资料时展示 TODO 空状态。
- 保留介绍纸但增加英文 Enter/Skip 入口与 Escape 跳过；RoomScene 改为进入后懒加载，生产构建将主入口降至约 300 kB，3D 场景独立为约 1.01 MB chunk（gzip 约 272 kB）。
- 明亮中性房间背景、深色内容面板、中文二级内容、响应式 Photos 浏览器、白板撤销状态和 SVG 关闭图标已完成；`pnpm check`、Impeccable detector、浏览器英文一级/中文二级路径均通过，浏览器没有应用 error。
- 本轮未部署 Cloudflare Pages。仍需在真实 Safari、390px 手机与 `prefers-reduced-motion` 环境下做最终人工回归；Three/R3F 自身的 `THREE.Clock` 与 shadow-map 弃用 warning 仍非应用错误。

## Latest implementation — 2026-10-03

- Second-level panels are now English, including the panel data in `src/data/*.json`; the résumé PDF and research PDFs themselves remain Chinese, and research summaries say so.
- The back wall and floor are hidden; the old landscape canvas bars are replaced by a code-built portrait whiteboard (`src/experience/RoomDecor.tsx`) reading "Welcome to Peter's room" / "You can write down anything you want" in Caveat. It keeps the `PROP_Canvas*` name so it still maps to the whiteboard hotspot.
- A heathered terracotta loop-pile rug sits under the desk and chair; it also receives shadows now that the floor is gone.
- Night lighting: brass picture lights over the bookcase, poster and whiteboard, a globe floor lamp and an off-screen window light. All textures are generated with Canvas 2D in `src/experience/surfaces.ts`.
- The sandbox browser renders WebGL with SwiftShader at about 0.5 fps, so day/night transitions and panel fades cannot be judged there; verify them on real hardware.

## Latest implementation — 2026-10-05

- 整体界面参考最新视频设计重构：精简顶栏视觉层次，移除荣誉文字与底层杂音，左上角保留极简优雅的 `Peter Cui` 标识。
- 移除底部 01～08 导航栏，释放完整画面，让用户在 3D 空间内自由旋转、缩放探索。
- 网页上端增加三大核心导航 Tab：
  * **Resume**：直接高清呈现个人简历，支持视觉预览、内嵌交互式 PDF 阅读器、PDF 下载与全屏新窗口打开，附核心教育与背景摘要。
  * **Intern**：深度交互式实习经历展示，解析 6 段核心经历（ConvergeAI、Analemma、小红书、美团、网易、环球时报），并保留教育背景切换，附带多维数据表现指标、业务职责与方法论沉淀。
  * **Gallery**：城市影像画廊，收录在上海、北京、布拉格、香港与旅途拍摄的城市摄影集，支持城市分类筛选、胶片与相机元数据卡片及全屏灯箱详情。
- 3D 场景内桌上的相机（`PROP_Camera`）映射为个人照片（`Personal Photos`），作为个人生活照与工作纪念的精选占位，后续持续更新。
- 引入四大整体沉浸式瀑布环境背景与右上角胶囊切换器：
  * **现代简约（默认）**：现代高级简约家庭内工作室，柔和漫射日光与沉静建筑质感。
  * **极光**：深邃北极夜空、闪烁星群与动态飘逸的绿青紫极光幕布。
  * **草原**：开阔晴空与金色原野地平线，金黄阳光与清新草地反光。
  * **海边**：海天一色的蔚蓝海洋，清爽海风与动态流动的层叠浪花波纹。
  * 切换状态持久化存储于 `localStorage`，3D 光照与色彩平滑过渡。

## Environment refinement — 2026-10-05

- Replaced the low-resolution CanvasTexture backgrounds with an original full-screen procedural shader (`environment.frag.glsl`, `EnvironmentBackground.tsx`): window-lit interior, translucent aurora filaments, layered meadow, perspective-compressed coastal ripples. These are stylized backdrops, not photographs or additional room geometry.
- Top-right environment control now opens a four-preview picker. The neutral, full-bleed header keeps Peter Cui and the three existing navigation destinations; no bottom dock was reintroduced.
- Existing theme IDs and localStorage key are preserved. Invalid stored IDs resolve to Interior. Keyboard arrows/Home/End select, Escape closes and restores focus, outside click dismisses.
- Per-environment day/night palettes live in `themes.ts`. Background and room illumination now share the live night mix. Lighting fades use elapsed real time rather than GSAP lag smoothing, preventing slow renderers from stretching a short fade indefinitely.
- Reduced motion freezes background animation and switches environments immediately; normal motion uses bounded transitions and a paused clock in hidden tabs. Confirmed all four shader themes in both day/night, live uniforms, mobile 390×844 layout, persistence and keyboard navigation in Chromium/SwiftShader. No real-device performance claims.
- Content data, PDFs, furniture and room model files were not changed in this refinement.

## Background music — 2026-10-05

- Added a lower-left CD-style player with the supplied tracks: Chezile — Beanie; Ryan Gebhardt — Ladyfingers; RIX / Zy — 阳光灿烂的日子. Titles/artwork were read from the MP3 metadata (the attachment order differed from the named order). The owner confirmed authorization for public playback and artwork display before publication.
- Music mounts independently of the 3D room and uses a single native audio element. Playback is visitor-initiated, with no MP3 source assigned before Play; default volume is 30%, with volume preference stored locally. Opening a content panel leaves music playing while making the covered controls inert.
- Supports previous/next, playlist selection, seek, mute, volume and repeat-all. The CD rotates in 24 seconds, pauses at its current angle and respects reduced motion. Web-optimized audio and extracted cover art have content-hashed filenames.
- Browser checks verified actual playback for all three songs, pause, skip, seek, volume/mute, repeat-all, scene/panel continuity, silent reload and 390px layout. The software 3D loop was temporarily suspended during detailed media-control tests; production scene rendering is unchanged. Controller tests cover errors and stale asynchronous play requests.
- Production CDN testing returned full-file responses for Range requests. Added an on-demand bounded Blob buffer when the browser cannot seek natively. All three public URLs were verified playing and seeking to 60 seconds, including the fallback path; paused seeking and stale-buffer cancellation are covered as well. No Cloudflare server configuration or Functions were added.

## Interior-only office refinement — 2026-10-05

- Replaced the residential curtain/beadboard treatment with graphite-framed full-height glazing, a generic city skyline, pale honed-stone panels, flush walnut joinery, a concealed ceiling light and perspective slab joints. Raised the background wall/floor junction to sit behind, rather than below, the foreground furniture.
- Interior day lighting is neutral and diffuse; evening has cooler exterior glazing, subtle city lights and a brighter warm-neutral office wash. Only the `home` palette changed. Furniture, model geometry, content, audio and other environment palettes are untouched.
- Added a content-hashed office preview and optional per-theme preview URL; removed the obsolete home thumbnail. Other previews retain their previous URLs.
- Chromium shader compilation and day/night rendering checked. The other three shader themes were pixel-compared with the prior shader at fixed time in both day and night and were identical. Mobile 390×844 layout, picker thumbnails, keyboard focus and Resume open/close checked. Continuous software rendering was temporarily paused for settled captures; no real-device frame-rate claims.

## Bedroom and compact CD refinement — 2026-10-05

- The owner rejected the office treatment as too deliberate. Interior now uses warm bedroom finishes, a right-side domestic window with soft linen curtains and diffuse light. Removed the skyline, graphite frames, stone joints, walnut storage and ceiling slots. Only Interior lighting direction/palette changed; other environment functions and shared shader helpers remain unchanged.
- Music defaults to one 52px album CD. Click to reveal controls; click outside, the close button, the disc again, or Escape to collapse. Collapsing preserves the same audio element and disc node, track position and rotation. Playback remains opt-in and starts only with Play/track selection; reduced motion disables the spin.
- Browser checks confirmed desktop day/night rendering and right-window placement, 390px collapsed/expanded layout, playback continuity while collapsed, playlist selection, paused rotation, outside-click/Escape dismissal, keyboard opening/focus restoration and reduced-motion behavior. Software 3D rendering was paused during detailed media checks; production frame settings are unchanged.

## Catalog batch and book metadata — 2026-10-06

- Imported 35 WeRead shelf entries from the owner's screenshot. The owner confirmed all are read. Preserved two 南风窗 issues and the Eva Illouz two-book collection as separate entry types rather than silently dropping/splitting them.
- Filled every shelf entry with a verified author/editor, an original one-sentence Chinese summary and a disclosed reference URL. Primary sources: 30 Douban book pages, two bookseller pages, one authorized ebook collection page and two 南风窗 official pages. Version/translation differences remain explicitly possible. Corrected 小说榫卯 author to 张秋子 and completed truncated titles from verified sources.
- Imported the first 30 watched entries from two Douban screenshots: 21 films, 8 series and 1 stage recording. Four have no visible rating and remain null. The owner explicitly requested titles and personal scores only: no personal reviews or marking dates were added to the public bundle. Remaining 89 watched entries are not yet imported.
- Added cover grids, title/author search, category filters, same-panel details and reference links. The existing bookshelf/poster 3D hotspots were exercised. Mobile 390px layout, filtering, collection volumes, ratings, Escape/back navigation and focus return were verified. Review/provenance CSV/JSON files remain outside the repository in the workspace review folder.

## Cover artwork upgrade — 2026-10-06

- The owner reported that most covers were soft screenshot crops. Replaced 32 of 35 book covers and all 30 film posters with publisher artwork from the same disclosed reference source, keeping everything local: no hotlinks and no third-party image hosts are referenced at runtime.
- Every replacement was matched against the shelf thumbnail it replaced before the old file was deleted, using aligned grayscale cross-correlation plus a visual pass. Three book covers had no usable match and keep their original crop: 发现东亚 and 报道伊斯兰 exist only as different editions, and 韩国影视文化产业研究 has no image larger than 100 px.
- Two 南风窗 issues came from the publisher's own issue pages at 600x804, which also removed a QR overlay the screenshot included. The Eva Illouz collection cover came from its authorized ebook page. 父亲的解放日志 uses the publisher cover because the shelf thumbnail was a squashed tile.
- Long side is capped at 900 px and stored as WebP q82 with content-hashed filenames; the catalog directory grows from about 0.8 MB to about 4.6 MB. Six replacements scored below 0.85 correlation because the thumbnail is a 2:3-cropped variant of the same artwork, not a different title, and were confirmed visually.
- Douban's movie subject pages redirect automated requests to a security challenge, and its mobile search API refuses anonymous calls after a few queries. The reader-facing mobile search page and the public subject endpoint answered normally, so the catalog data keeps working without authentication. Rate-limit and retry behaviour must be revisited before importing the remaining 89 entries.


