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

