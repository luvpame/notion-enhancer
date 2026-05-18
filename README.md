# Notion Enhancer

Chrome MV3 browser extension for copying Notion pages as practical Markdown.

## Requirements

- mise
- Node.js 24 and pnpm 10 via `mise install`
- Chrome or Chromium

## Setup

```bash
mise install
vp install
```

This runs `wxt prepare` via `postinstall` and generates the `.wxt/` TypeScript config.

## Commands

```bash
vp run dev
vp check
vp test
vp run build
vp run zip
```

## What It Does

- injects a `Markdownをコピー` button into the Notion top bar
- lets you toggle the copy button from the popup, defaulting to on
- shows a title-hover action group on the page title
- lets you toggle title hover actions from the popup, defaulting to on
- shows Markdown-style heading markers inside Notion pages
- lets you toggle heading markers from the popup, defaulting to on
- extracts the current page content and converts it with `europa`
- normalizes Notion-style to-do blocks into Markdown task list items
- strips obvious hidden UI noise before copying
- keeps a lightweight popup for toggling the three page features

## Usage

1. Open a page on `https://www.notion.so/*` or `https://*.notion.site/*`
2. Click `Markdownをコピー` in the top bar
3. Hover the page title to copy either the title text or Markdown link
4. Use the popup if you want to disable or re-enable the copy button, title hover actions, or heading markers
5. Paste the copied Markdown into GitHub, Obsidian, or another Markdown editor

## Build Outputs

- Chrome: `.output/chrome-mv3/`

## Load Unpacked Extension

1. Open `chrome://extensions/`
2. Enable developer mode
3. Choose "Load unpacked"
4. Select `.output/chrome-mv3/`

## Toolchain Notes

- `pnpm` is the package manager for dependency installation and lifecycle hooks
- Use `vp check` before handoff
- Use `vp run build` after manifest, WXT, or bundling changes
- WXT remains responsible for Chrome MV3 dev/build/zip commands
- `mise.toml` manages the local toolchain, including Node.js and pnpm

## Scope

This extension intentionally stays small. It currently focuses on popup-controlled feature toggles, background ping/pong diagnostics, and page-level Markdown copying for Notion. Add permissions, storage, options pages, or browser-specific behavior only when the feature actually needs them.
