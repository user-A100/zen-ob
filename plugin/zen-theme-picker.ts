/* This Source Code Form is subject to the Mozilla Public License v. 2.0.
 * https://mozilla.org/MPL/2.0/
 * Obsidian DOM/lifecycle port of Zen Browser's theme picker, source and adaptations
 * documented in THIRD-PARTY-NOTICES.md. This file contains no Firefox services. */
import { App, Component, setIcon } from "obsidian";
import { TabsManager } from "./tabs-manager";
import { PRESET_PAGES } from "./zen-theme-presets";
import { Scheme, SpaceTheme, SIZE, HARMONIES, arrange, boundPoint, cloneTheme, defaultTheme, gradient, lightText, pointColor, rgb, sanitizeTheme, themeColors } from "./zen-theme-model";

interface Host {
  app: App;
  themes(): Record<string, SpaceTheme>;
  scheme(): Scheme | undefined;
  setScheme(scheme: Scheme): void;
  save(): Promise<void>;
}
export class ZenThemePicker extends Component {
  private root: HTMLElement | null = null;
  private session: Component | null = null;
  private css!: HTMLStyleElement;
  private board!: HTMLElement;
  private dots!: HTMLElement;
  private hint!: HTMLElement;
  private schemeButtons!: HTMLElement;
  private swatches!: HTMLElement;
  private left!: HTMLButtonElement;
  private right!: HTMLButtonElement;
  private plus!: HTMLButtonElement;
  private minus!: HTMLButtonElement;
  private algorithm!: HTMLButtonElement;
  private opacity!: HTMLInputElement;
  private wave!: SVGPathElement;
  private dial!: HTMLElement;
  private handle!: HTMLElement;
  private state: SpaceTheme = defaultTheme();
  private editing = "";
  private dirty = false;
  private page = 0;
  private anchor: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private drag: "point" | "texture" | null = null;
  private moved = false;
  private originalDark = document.body.classList.contains("theme-dark");
  private system = window.matchMedia("(prefers-color-scheme: dark)");
  constructor(private host: Host, private tabs: TabsManager) { super(); }
  onload() {
    this.css = document.head.createEl("style", { attr: { "data-zen-theme": "spaces" } });
    this.registerEvent(this.tabs.on("space-switched", () => { this.close(false); this.apply(); }));
    const systemChanged = () => { if (this.host.scheme() === "auto") this.apply(); };
    this.system.addEventListener("change", systemChanged);
    this.register(() => this.system.removeEventListener("change", systemChanged));
    this.registerDomEvent(window, "resize", () => this.position());
    this.host.app.workspace.onLayoutReady(() => this.apply());
    this.register(() => {
      this.close(false); this.css.remove(); document.body.removeClass("zm-space-themed");
      if (this.host.scheme()) this.setDark(this.originalDark);
    });
  }
  private setDark(dark: boolean) {
    document.body.toggleClass("theme-dark", dark); document.body.toggleClass("theme-light", !dark);
  }
  apply() {
    const scheme = this.host.scheme();
    if (scheme) this.setDark(scheme === "auto" ? this.system.matches : scheme === "dark");
    const raw = this.host.themes()[this.root ? this.editing : this.tabs.activeSpace().id];
    document.body.toggleClass("zm-space-themed", !!raw);
    if (!raw) { this.css.textContent = ""; return; }
    const state = sanitizeTheme(raw), dark = document.body.hasClass("theme-dark");
    const colors = themeColors(state, dark), light = lightText(colors, dark);
    const ink = light ? "#eaf0ed" : "#26372d", muted = light ? "#bdccc1" : "#587361";
    const noise = state.texture ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='white' opacity='${(state.texture * .20).toFixed(3)}' filter='url(%23n)' d='M0 0h150v150H0z'/%3E%3C/svg%3E"),` : "";
    this.css.textContent = `body.zen-mint-sidebar.zm-space-themed{--zm-frame:${gradient(colors, dark)} !important;--zm-ink:${ink} !important;--zm-muted:${muted} !important;--icon-color:${muted};--icon-color-hover:${ink};--nav-item-color:${ink};--nav-item-color-hover:${ink};--zm-hover:${light ? "rgb(255 255 255 / .10)" : "rgb(0 0 0 / .07)"};--zm-selected:${light ? "rgb(255 255 255 / .18)" : "rgb(255 255 255 / .78)"}}body.zm-space-themed .app-container{background-color:${dark ? "#17171a" : "#f0f0f4"};background-image:${noise}var(--zm-frame) !important}body.zm-space-themed .zen-space-header{color:var(--zm-muted) !important}body.zm-space-themed .zen-row.is-active{color:var(--zm-ink)}`;
  }
  open(anchor: HTMLElement, spaceId = this.tabs.activeSpace().id) {
    this.close(false);
    this.anchor = anchor; this.editing = spaceId;
    this.state = cloneTheme(this.host.themes()[spaceId] ?? defaultTheme()); this.dirty = false;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.session = this.addChild(new Component());
    this.root = document.body.createDiv({ cls: "zm-theme-picker", attr: { role: "dialog", "aria-modal": "false", "aria-label": "更改主题" } });
    this.root.dataset.space = spaceId;
    this.board = this.root.createDiv({ cls: "zm-theme-board" });
    this.schemeButtons = this.board.createDiv({ cls: "zm-theme-scheme" });
    for (const [scheme, icon, label] of [["auto", "sparkles", "跟随系统"], ["light", "sun", "浅色"], ["dark", "moon-star", "深色"]]) {
      const button = this.button(this.schemeButtons, icon, label, () => {
        this.host.setScheme(scheme as Scheme); void this.host.save(); this.apply(); this.render();
      }); button.dataset.scheme = scheme;
    }
    this.hint = this.board.createDiv({ cls: "zm-theme-hint", text: "点击添加颜色" });
    this.dots = this.board.createDiv({ cls: "zm-theme-dots" });
    const actions = this.board.createDiv({ cls: "zm-theme-actions" });
    this.plus = this.button(actions, "plus", "添加颜色", () => { arrange(this.state, Math.min(3, this.state.points.length + 1)); this.preview(); });
    this.minus = this.button(actions, "minus", "移除颜色", () => { arrange(this.state, Math.max(0, this.state.points.length - 1)); this.preview(); });
    this.algorithm = this.button(actions, "network", "切换配色算法", () => {
      const options = HARMONIES.filter(h => h.angles.length === this.state.points.length - 1);
      const index = options.findIndex(h => h.type === this.state.algorithm);
      arrange(this.state, this.state.points.length, options[(index + 1) % options.length].type); this.preview();
    });
    const presets = this.root.createDiv({ cls: "zm-theme-presets" });
    this.left = this.button(presets, "chevron-left", "上一页配色", () => { this.page--; this.renderPresets(); });
    this.swatches = presets.createDiv({ cls: "zm-theme-swatches" });
    this.right = this.button(presets, "chevron-right", "下一页配色", () => { this.page++; this.renderPresets(); });
    const controls = this.root.createDiv({ cls: "zm-theme-controls" });
    const strength = controls.createDiv({ cls: "zm-theme-strength" });
    const svg = strength.createSvg("svg", { attr: { viewBox: "0 0 300 60", preserveAspectRatio: "none", "aria-hidden": "true" } });
    this.wave = svg.createSvg("path", { attr: { fill: "none", "stroke-linecap": "round" } });
    this.opacity = strength.createEl("input", { type: "range", attr: { min: ".25", max: ".8", step: ".001", "aria-label": "颜色强度", title: "颜色强度" } });
    this.on(this.opacity, "input", () => { this.state.opacity = Number(this.opacity.value); this.preview(); });
    this.dial = controls.createDiv({ cls: "zm-theme-texture", attr: { role: "slider", tabindex: "0", "aria-label": "颗粒纹理", "aria-valuemin": "0", "aria-valuemax": "15", title: "颗粒纹理" } });
    for (let i = 0; i < 16; i++) {
      const mark = this.dial.createDiv({ cls: "zm-theme-texture-tick" });
      const angle = i / 16 * Math.PI * 2 - Math.PI / 2;
      mark.style.left = `${50 + Math.cos(angle) * 44}%`; mark.style.top = `${50 + Math.sin(angle) * 44}%`;
    }
    this.handle = this.dial.createDiv({ cls: "zm-theme-texture-handle" });
    this.on(this.dial, "pointerdown", e => { e.preventDefault(); this.drag = "texture"; this.updateTexture(e); });
    this.on(this.dial, "keydown", e => { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return; e.preventDefault(); this.state.texture = ((Math.round(this.state.texture * 16) + (["ArrowRight", "ArrowUp"].includes(e.key) ? 1 : 15)) % 16) / 16; this.preview(); });
    this.on(this.board, "pointerdown", e => {
      if (e.button !== 0 || !(e.target as HTMLElement).closest(".zm-theme-dot.primary")) return;
      e.preventDefault(); this.drag = "point"; this.moved = false;
    });
    this.on(this.board, "click", e => {
      if ((e.target as HTMLElement).closest("button") || this.moved) return;
      this.updatePoint(e); this.preview();
    });
    this.on(this.board, "contextmenu", e => {
      e.preventDefault(); if (!(e.target as HTMLElement).closest(".zm-theme-dot")) return;
      this.state.points.shift(); arrange(this.state); this.preview();
    });
    this.on(document, "pointermove", e => {
      if (this.drag === "point") { this.moved = true; this.updatePoint(e); this.preview(); }
      if (this.drag === "texture") this.updateTexture(e);
    });
    this.on(document, "pointerup", () => { this.drag = null; window.setTimeout(() => this.moved = false, 0); });
    this.on(document, "pointerdown", e => { if (!this.root?.contains(e.target as Node) && !this.anchor?.contains(e.target as Node)) this.close(false); }, true);
    this.on(this.root, "keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(true); }
      if (e.key === "Tab") {
        const items = [...this.root!.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]')].filter(el => el.offsetParent !== null);
        if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
      }
    });
    this.renderPresets(); this.render(); this.position(); this.apply();
    this.root.querySelector<HTMLElement>('.zm-theme-scheme button[aria-pressed="true"]')?.focus({ preventScroll: true });
  }
  close(restoreFocus = false) {
    if (!this.root) return;
    if (this.dirty) void this.host.save();
    this.root.remove(); this.root = null; this.drag = null;
    if (this.session) { this.session.unload(); this.removeChild(this.session); this.session = null; }
    if (restoreFocus && this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.apply();
  }
  private on<K extends keyof HTMLElementEventMap>(target: HTMLElement | Document, event: K, cb: (ev: HTMLElementEventMap[K]) => void, capture = false) {
    this.session!.registerDomEvent(target as HTMLElement, event, cb, capture);
  }
  private button(parent: HTMLElement, icon: string, label: string, run: () => void) {
    const button = parent.createEl("button", { cls: "zm-theme-button", attr: { "aria-label": label, title: label } });
    setIcon(button, icon); this.on(button, "click", run); return button;
  }
  private position() {
    if (!this.root || !this.anchor) return;
    const box = this.anchor.getBoundingClientRect(), width = this.root.offsetWidth, height = this.root.offsetHeight;
    this.root.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, box.right + 10))}px`;
    this.root.style.top = `${Math.max(8, Math.min(window.innerHeight - height - 8, box.top))}px`;
  }
  private updatePoint(e: MouseEvent | PointerEvent) {
    const rect = this.board.getBoundingClientRect();
    const point = boundPoint((e.clientX - rect.left) / rect.width * SIZE, (e.clientY - rect.top) / rect.height * SIZE);
    if (!this.state.points.length) this.state.points.push({ ...point, lightness: 80 });
    else Object.assign(this.state.points[0], point);
    arrange(this.state);
  }
  private updateTexture(e: PointerEvent) {
    const r = this.dial.getBoundingClientRect();
    const turn = (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI + 450) % 360;
    this.state.texture = (Math.round(turn / 360 * 16) % 16) / 16; this.preview();
  }
  private preview() {
    this.host.themes()[this.editing] = cloneTheme(this.state); this.dirty = true; this.apply(); this.render();
  }
  private render() {
    this.dots.empty();
    this.state.points.forEach((p, index) => {
      const dot = this.dots.createEl("button", { cls: `zm-theme-dot${index === 0 ? " primary" : ""}`, attr: { "aria-label": index === 0 ? "主色点" : `辅助色点 ${index}`, tabindex: index === 0 ? "0" : "-1" } });
      dot.style.left = `${p.x / SIZE * 100}%`; dot.style.top = `${p.y / SIZE * 100}%`; dot.style.background = rgb(pointColor(p));
      // Native listener belongs to this ephemeral dot and is collected when render replaces it.
      dot.addEventListener("keydown", e => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault(); const step = e.shiftKey ? 10 : 2;
        Object.assign(p, boundPoint(p.x + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0), p.y + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0)));
        arrange(this.state); this.preview(); this.dots.querySelector<HTMLElement>(".primary")?.focus();
      });
    });
    this.hint.hidden = this.state.points.length > 0;
    this.plus.disabled = !this.state.points.length || this.state.points.length >= 3;
    this.minus.disabled = !this.state.points.length; this.algorithm.disabled = this.state.points.length < 2;
    this.algorithm.dataset.algorithm = this.state.algorithm;
    this.schemeButtons.querySelectorAll<HTMLElement>("[data-scheme]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.scheme === (this.host.scheme() ?? (this.originalDark ? "dark" : "light")))));
    this.opacity.value = String(this.state.opacity);
    const progress = (this.state.opacity - .25) / .55;
    let path = "M 8 30";
    for (let x = 8; x <= 290; x += 2) path += ` L ${x} ${30 + Math.sin((x - 8) / 282 * Math.PI * 12) * (1 - progress) * 19}`;
    this.wave.setAttribute("d", path); this.opacity.style.setProperty("--zm-thumb-height", `${18 + progress * 14}px`);
    this.dial.setAttribute("aria-valuenow", String(Math.round(this.state.texture * 16)));
    this.dial.style.setProperty("--zm-texture", String(this.state.texture));
    this.handle.style.transform = `translate(-50%,-50%) rotate(${this.state.texture * 360}deg) translateY(-34px)`;
    this.dial.querySelectorAll<HTMLElement>(".zm-theme-texture-tick").forEach((el, i) => el.classList.toggle("active", i <= Math.round(this.state.texture * 16)));
  }
  private renderPresets() {
    this.page = Math.max(0, Math.min(PRESET_PAGES.length - 1, this.page));
    this.left.disabled = this.page === 0; this.right.disabled = this.page === PRESET_PAGES.length - 1;
    this.swatches.empty(); this.swatches.dataset.page = String(this.page);
    PRESET_PAGES[this.page].presets.forEach((preset, index) => {
      const swatch = this.swatches.createEl("button", { cls: "zm-theme-swatch", attr: { "aria-label": `配色 ${this.page + 1}-${index + 1}`, title: `配色 ${this.page + 1}-${index + 1}` } });
      swatch.style.cssText = preset.preview;
      if (preset.dotCount === 3) swatch.classList.add("is-gradient");
      swatch.addEventListener("click", () => {
        this.state.points = [{ x: Math.trunc(preset.position.x), y: Math.trunc(preset.position.y), lightness: preset.lightness ?? this.state.points[0]?.lightness ?? 50, type: preset.type }];
        arrange(this.state, preset.dotCount, preset.algorithm === "float" ? "floating" : preset.algorithm); this.preview();
      });
    });
  }
}
