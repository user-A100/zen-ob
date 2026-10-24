# Third-party notices

## Atlas Sidebar / Zen UI

Zen Mint Sidebar is a modified fork of [Atlas Sidebar](https://github.com/atlas-vtt/atlas-sidebar), v1.0.2, commit `71675faced6d9d926eb566b8aa280728956e7c35`, itself derived from [Zen UI](https://github.com/merlinkraemer/obsidian-zen).

MIT License. Copyright (c) 2026 Merlin Kraemer; Copyright (c) 2026 Fabian Urbanek. The complete original license is included in `plugin/LICENSE` and in the distributed plugin folder.

Changes in Zen Mint: independent plugin/view/storage identifiers; screenshot-specific theme and toolbar; Chinese primary controls; reversible appearance classes; collapse/reveal entry; Atlas card disabled by default; new test and packaging tools. The upstream tab model and interaction modules are retained with attribution.

## Fantasy space icons and Atlas assets

The retained fantasy space icon set comes from [game-icons.net](https://game-icons.net/), by **Lorc, Delapouite, Skoll, sbed, Carl Olsen and Caro Asercion**, under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). The Atlas upstream removed their backgrounds and converted them to paths; Zen Mint retains those derivatives for space selection. Atlas artwork is retained from the upstream repository and is hidden by default, without an Atlas VTT dependency.

## Zen Browser

[Zen Browser](https://github.com/zen-browser/desktop), pinned commit `f2b18c4f6179a3918c0d92f2a7406322cda4ad12`, supplies the **MPL-2.0** theme editor implementation reference and adapted code introduced in 0.2.0.

Covered adapted files: `plugin/zen-theme-model.ts`, `plugin/zen-theme-picker.ts`, `plugin/zen-theme-picker.css`, `plugin/zen-theme-presets.ts`; the reference vector generator/fixture also derive from these sources. Original files: `src/zen/spaces/ZenGradientGenerator.mjs`, `src/zen/spaces/zen-gradient-generator.css`, `src/browser/base/content/zen-panels/theme-picker.inc`. Copyright belongs to their respective Zen Browser contributors.

Changes: Firefox XUL, `Services.prefs`, native popup services and workspace storage replaced with Obsidian DOM, Component lifecycle and per-Space plugin data. The color-plane sampler, harmony relationships, 41 preset definitions and gradient layering retain original semantics. Platform-specific transparency and haptics are not included; the opaque-platform blend path is used. Custom-color developer controls, hidden by default upstream, are not exposed.

The complete MPL-2.0 license is in `plugin/MPL-2.0.txt`. Install ZIPs include the covered modified source files in `plugins/zen-mint-sidebar/source/`, so source access does not depend on a future GitHub upload. Other MIT files retain their original licenses. The user's customized screenshot is a design reference and is not included in the install package.

## Development tools

Playwright (Apache-2.0), TypeScript (Apache-2.0), esbuild (MIT) and the Obsidian SDK are development dependencies, subject to their own licenses. They are not included in the install ZIP. Obsidian's built-in icons are rendered through its `setIcon` API.
