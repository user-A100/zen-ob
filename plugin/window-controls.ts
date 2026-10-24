import { Component } from "obsidian";

/** Zen single-toolbar behavior adapted to Obsidian's existing Windows/Linux titlebar.
 * Geometry and timings: research/ZEN-AUTOHIDE-SPEC.md. No native mouse hooks or replacement buttons.
 */
export class WindowControls extends Component {
  private visible = false;
  private outside = false;
  private point: { x: number; y: number } | null = null;
  private exitTimer = 0;
  private entryTimer = 0;
  private frame = 0;
  private observer?: MutationObserver;
  private rootObserver?: ResizeObserver;
  private toolbar: HTMLElement | null = null;
  private popups = new Set<Element>();
  private originalLeft = "";

  constructor(private win: Window, private alwaysVisible: () => boolean) { super(); }

  onload() {
    const doc = this.win.document;
    this.toolbar = doc.querySelector<HTMLElement>(".titlebar");
    if (!this.toolbar) return;
    this.originalLeft = doc.body.style.getPropertyValue("--zm-chrome-left");
    const move = (e: MouseEvent | DragEvent) => {
      this.clearExit(); this.outside = false;
      this.point = { x: e.clientX, y: e.clientY }; this.refresh();
    };
    this.registerDomEvent(doc, "mousemove", move);
    this.registerDomEvent(doc, "dragover", move);
    this.registerDomEvent(doc, "focusin", () => this.refresh());
    this.registerDomEvent(doc, "focusout", () => this.schedule());
    this.registerDomEvent(this.win, "resize", () => {
      this.clearExit(); this.point = null; this.outside = false; this.refresh();
    });
    this.registerDomEvent(doc, "fullscreenchange", () => this.refresh());
    this.registerDomEvent(this.win, "blur", () => {
      this.clearExit(); this.point = null; this.outside = false; this.show(false);
    });
    this.registerDomEvent(doc, "mouseleave", (e: MouseEvent) => {
      this.point = null;
      // Zen uses native tracking outside the top edge. Use its bounded fallback in Electron.
      if (e.clientY <= 0 && this.visible) {
        this.outside = true;
        this.exitTimer = this.win.setTimeout(() => { this.outside = false; this.refresh(); }, 1000);
      } else { this.outside = false; this.refresh(); }
    });
    this.observer = new MutationObserver(records => {
      // Only menus opened from this surface hold it; editor/sidebar menus remain independent.
      if (this.visible && (this.overBar() || this.toolbar?.contains(doc.activeElement))) {
        for (const record of records) for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType !== 1) continue;
          const element = node as Element;
          if (element.matches(".menu, .modal-container")) this.popups.add(element);
          for (const popup of Array.from(element.querySelectorAll(".menu, .modal-container"))) this.popups.add(popup);
        }
      }
      if (this.visible) this.schedule();
    });
    this.observer.observe(doc.body, { childList: true, subtree: true });
    const root = doc.querySelector(".workspace-split.mod-root");
    if (root) {
      this.rootObserver = new ResizeObserver(() => this.schedule());
      this.rootObserver.observe(root);
    }
    this.register(() => {
      this.clearExit(); this.win.clearTimeout(this.entryTimer); this.win.cancelAnimationFrame(this.frame);
      this.observer?.disconnect(); this.rootObserver?.disconnect();
      this.popups.clear();
      doc.body.removeClass("zm-autohide-window-controls", "zm-window-buttons-visible", "zm-window-controls-interactive");
      if (this.originalLeft) doc.body.style.setProperty("--zm-chrome-left", this.originalLeft);
      else doc.body.style.removeProperty("--zm-chrome-left");
    });
    this.refresh();
  }

  refresh() {
    if (!this.toolbar) return;
    const doc = this.win.document;
    const root = doc.querySelector(".workspace-split.mod-root");
    const left = root?.getBoundingClientRect().left ?? 0;
    doc.body.style.setProperty("--zm-chrome-left", `${left}px`);
    const auto = !this.alwaysVisible();
    doc.body.toggleClass("zm-autohide-window-controls", auto);
    if (!auto) { this.clearExit(); this.popups.clear(); this.show(true); return; }
    if (doc.body.hasClass("is-fullscreen")) { this.show(false); return; }
    const focused = !!doc.activeElement && this.toolbar.contains(doc.activeElement);
    for (const popup of this.popups) if (!popup.isConnected || popup.classList.contains("is-hidden")) this.popups.delete(popup);
    this.show(this.overBar() || focused || this.popups.size > 0 || this.outside);
  }

  private overBar() {
    const left = parseFloat(this.win.document.body.style.getPropertyValue("--zm-chrome-left")) || 0;
    const height = Math.max(8, this.toolbar?.getBoundingClientRect().height ?? 8);
    return !!this.point && this.point.x >= left && this.point.x <= this.win.innerWidth - 8 && this.point.y >= 0 && this.point.y <= height;
  }

  private show(visible: boolean) {
    const changed = this.visible !== visible;
    this.visible = visible;
    this.win.document.body.toggleClass("zm-window-buttons-visible", visible);
    if (!visible || this.alwaysVisible()) {
      this.win.clearTimeout(this.entryTimer);
      this.win.document.body.toggleClass("zm-window-controls-interactive", visible);
    } else if (changed) {
      this.win.clearTimeout(this.entryTimer);
      // Native caption hit targets must not activate through the invisible/delayed toolbar.
      const delay = this.win.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350;
      this.entryTimer = this.win.setTimeout(() => {
        if (this.visible) this.win.document.body.addClass("zm-window-controls-interactive");
      }, delay);
    }
  }

  private schedule() {
    if (!this.frame) this.frame = this.win.requestAnimationFrame(() => { this.frame = 0; this.refresh(); });
  }

  private clearExit() { this.win.clearTimeout(this.exitTimer); this.exitTimer = 0; }
}
