/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. https://mozilla.org/MPL/2.0/
 * Adapted for Obsidian from Zen Browser's ZenGradientGenerator.mjs,
 * commit f2b18c4f6179a3918c0d92f2a7406322cda4ad12.
 * Firefox services/DOM are replaced; position, harmony and gradient semantics retained. */
export type Scheme = "auto" | "light" | "dark";
export type Point = { x: number; y: number; lightness: number; type?: string };
export type SpaceTheme = { points: Point[]; algorithm: string; opacity: number; texture: number };
export type RGB = [number, number, number];
export const SIZE = 358;
export const HARMONIES = [
  { type: "complementary", angles: [180] },
  { type: "singleAnalogous", angles: [310] },
  { type: "splitComplementary", angles: [150, 210] },
  { type: "analogous", angles: [50, 310] },
  { type: "triadic", angles: [120, 240] },
  { type: "floating", angles: [] },
];
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function boundPoint(x: number, y: number): { x: number; y: number } {
  const center = SIZE / 2, distance = Math.hypot(x - center, y - center);
  if (distance <= center) return { x, y };
  const angle = Math.atan2(y - center, x - center);
  return { x: center + Math.cos(angle) * center, y: center + Math.sin(angle) * center };
}
export function defaultTheme(): SpaceTheme {
  return { points: [{ x: 115, y: 247, lightness: 66, type: "explicit-lightness" }, { x: 285, y: 95, lightness: 66, type: "explicit-lightness" }], algorithm: "complementary", opacity: .5, texture: 0 };
}
export function sanitizeTheme(raw: unknown): SpaceTheme {
  if (!raw || typeof raw !== "object") return defaultTheme();
  const r = raw as Partial<SpaceTheme>, base = defaultTheme();
  const number = (v: unknown, fallback: number, min: number, max: number) => typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : fallback;
  return { points: Array.isArray(r.points) ? r.points.slice(0, 3).filter(p => p && typeof p === "object").map(p => ({ ...boundPoint(number(p.x, 179, 0, SIZE), number(p.y, 179, 0, SIZE)), lightness: number(p.lightness, 80, 0, 100), type: ["explicit-lightness", "explicit-black-white"].includes(p.type ?? "") ? p.type : undefined })) : base.points,
    algorithm: HARMONIES.some(h => h.type === r.algorithm) ? r.algorithm! : "floating",
    opacity: number(r.opacity, .5, .25, .8), texture: Math.round(number(r.texture, 0, 0, 15 / 16) * 16) / 16 };
}
export const cloneTheme = (theme: SpaceTheme) => sanitizeTheme(JSON.parse(JSON.stringify(theme)));
export function hslToRgb(h: number, s: number, l: number): RGB {
  const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (!s) return [l, l, l].map(v => Math.round(v * 255)) as RGB;
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)].map(v => Math.round(v * 255)) as RGB;
}
export function pointColor(point: Point): RGB {
  // Original picker adds 29px and a virtual 30px padding when sampling the dot plane.
  const x = point.x + 29, y = point.y + 29, center = (SIZE + 60) / 2;
  const distance = Math.hypot(x - center, y - center) - .2;
  const normalized = 1 - Math.min(distance / ((SIZE + 30) / 2), 1);
  const hue = (Math.atan2(y - center, x - center) * 180 / Math.PI + 360) % 360;
  let saturation = normalized * 100, lightness = point.lightness;
  if (point.type !== "explicit-lightness") { saturation = 90 + (1 - normalized) * 10; lightness = Math.round((1 - normalized) * 100); }
  if (point.type === "explicit-black-white") { saturation = 0; lightness = Math.round((1 - normalized) * 100); }
  return hslToRgb(hue / 360, saturation / 100, lightness / 100).map(v => Math.min(255, Math.max(0, v))) as RGB;
}
export function arrange(theme: SpaceTheme, count = theme.points.length, algorithm = theme.algorithm): void {
  if (!count) { theme.points = []; theme.algorithm = "floating"; return; }
  const primary = theme.points[0] ?? { x: 240, y: 240, lightness: 80 };
  const harmony = HARMONIES.find(h => h.type === algorithm && h.angles.length === count - 1) ?? HARMONIES.find(h => h.angles.length === count - 1)!;
  theme.algorithm = harmony.type;
  if (harmony.type === "floating") { theme.points = [primary]; return; }
  const center = SIZE / 2, angle = Math.atan2(primary.y - center, primary.x - center), distance = Math.min(center, Math.hypot(primary.x - center, primary.y - center));
  theme.points = [primary, ...harmony.angles.map(a => ({ ...primary, x: center + Math.cos(angle + a * Math.PI / 180) * distance, y: center + Math.sin(angle + a * Math.PI / 180) * distance }))];
}
export function mix(a: RGB, b: RGB, amount: number): RGB { return a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount))) as RGB; }
export const rgb = (c: RGB) => `rgb(${c.join(", ")})`;
export function themeColors(theme: SpaceTheme, dark: boolean): RGB[] {
  return theme.points.map(p => mix(pointColor(p), dark ? [23, 23, 26] : [240, 240, 244], theme.opacity));
}
export function gradient(colors: RGB[], dark: boolean): string {
  const c = colors.map(rgb);
  if (!c.length) return dark ? "linear-gradient(#131313,#131313)" : "linear-gradient(#e9e9e9,#e9e9e9)";
  if (c.length === 1) return `linear-gradient(${c[0]},${c[0]})`;
  if (c.length === 2) return `linear-gradient(150deg, ${c[0]} 30%, transparent 120%),linear-gradient(-30deg, ${c[1]} 30%, transparent 120%)`;
  return `linear-gradient(-5deg, ${c[2]} 10%, transparent 80%),radial-gradient(circle at 95% 0%, ${c[1]} 0%, transparent 75%),radial-gradient(circle at 0% 0%, ${c[0]} 10%, transparent 70%)`;
}
export function lightText(colors: RGB[], dark: boolean): boolean {
  if (!colors.length) return dark;
  const background = colors[0];
  const luminance = (c: RGB) => {
    const channels = c.map(v => { const n = v / 255; return n <= .03928 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4); });
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  };
  const contrast = (text: RGB) => { const a = luminance(background), b = luminance(text); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05); };
  return contrast(mix(background, [255,255,255], .1)) > contrast(mix(background, [0,0,0], .1));
}
