---
name: organize-fandazi-assets
description: Ingest, inspect, rename, classify, move, and validate new 饭搭子 image/icon assets, especially files added to `frontend/ui/material`. Use when the user says “图标已生成”, “material 新增图片”, “改名并分类”, “移到 static”, images are missing, or icon canvases/sizes look inconsistent. Do not redesign pages unless required to wire the assets.
---

# Organize Fandazi Assets

## Workflow

1. Inspect `git status` and list recent files under `frontend/ui/material` without touching unrelated documents.
2. View every relevant image. Record visible purpose, dimensions, transparency, internal whitespace, and whether it is an icon or content image.
3. Read [references/asset-map.md](references/asset-map.md) and select the narrowest semantic destination.
4. Rename assets to lowercase semantic English names. Avoid timestamps, ChatGPT export names, spaces, and duplicate numeric suffixes.
5. Copy or move only the user-scoped new assets into `frontend/src/static`; preserve original design source files unless the user explicitly requests cleanup.
6. Update all code references. Use absolute miniapp paths such as `/static/images/home/icon-bell.png`.
7. Run `scripts/audit-assets.ps1` from the repository root.
8. Build the WeChat target when source references changed.

## Rules

- Never reference `frontend/ui/` from `frontend/src`.
- Use `.png` for transparent icons and `.jpg`/`.webp` for opaque food photography when appropriate.
- Inspect internal padding before compensating with page-specific CSS.
- Keep selected/unselected TabBar pairs together and consistently named.
- Do not overwrite a semantically different existing asset merely because its dimensions match.
- Preserve user-owned source assets and unrelated files in `frontend/ui/material`.

## Handoff

List source-to-destination mappings, updated code references, missing or duplicate findings, and validation results.
