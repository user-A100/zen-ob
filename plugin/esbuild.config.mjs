import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const banner = `/*
Zen Mint Sidebar — bundled by esbuild.
Atlas Sidebar portions: MIT. Zen theme picker portions: MPL-2.0.
Modified MPL source is supplied in source/ in the install package.
See THIRD-PARTY-NOTICES.md and MPL-2.0.txt for provenance and terms.
*/
`;

const prod = process.argv[2] === "production";
writeFileSync("styles.css", ["sidebar.css", "mint-chrome.css", "zen-theme-picker.css"].map(file => readFileSync(file, "utf8")).join("\n"));

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  platform: "browser",
  loader: { ".webp": "dataurl" },
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
