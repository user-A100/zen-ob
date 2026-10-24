import { ItemView, Menu, Notice, setIcon } from "obsidian";
import { TabsManager, executeCommand, leafTitle } from "./tabs-manager";

/** Chrome specific to the screenshot; tab ownership stays in the upstream manager. */
export function buildMintToolbar(view: ItemView, header: HTMLElement, tabs: TabsManager, openTheme: () => void): () => void {
  const app = view.app;
  const tools = header.createDiv({ cls: "zm-toolbar", attr: { role: "toolbar", "aria-label": "侧栏工具" } });
  const button = (parent: HTMLElement, icon: string, label: string, run: (event: MouseEvent) => void) => {
    const el = parent.createEl("button", { cls: "zm-icon-button", attr: { "aria-label": label, title: label } });
    setIcon(el, icon);
    view.registerDomEvent(el, "click", run);
    return el;
  };
  const reveal = async (type: string) => {
    const leaf = app.workspace.getLeavesOfType(type)[0];
    if (leaf) await app.workspace.revealLeaf(leaf);
    else new Notice("请先在 Obsidian 中启用文件列表或搜索核心插件。");
  };
  button(tools, "ellipsis", "菜单", (e) => {
    const menu = new Menu();
    menu.addItem(i => i.setTitle("更改主题…").setIcon("palette").onClick(openTheme));
    menu.addSeparator();
    menu.addItem(i => i.setTitle("文件列表").setIcon("folder").onClick(() => reveal("file-explorer")));
    menu.addItem(i => i.setTitle("搜索笔记").setIcon("search").onClick(() => reveal("search")));
    menu.addItem(i => i.setTitle("新建空间").setIcon("plus").onClick(() => void tabs.addSpace()));
    menu.addSeparator();
    menu.addItem(i => i.setTitle("设置").setIcon("settings").onClick(() => { executeCommand(app, "app:open-settings"); }));
    menu.showAtMouseEvent(e);
  });
  button(tools, "panel-left", "收起侧栏（也可用 Obsidian 的侧栏快捷键展开）", () => app.workspace.leftSplit.collapse());
  tools.createSpan({ cls: "zm-toolbar-spacer" });
  const back = button(tools, "arrow-left", "后退", () => { executeCommand(app, "app:go-back"); });
  const forward = button(tools, "arrow-right", "前进", () => { executeCommand(app, "app:go-forward"); });
  button(tools, "search", "搜索或打开笔记", () => tabs.search());

  const location = header.createDiv({ cls: "zm-location" });
  const current = location.createEl("button", { cls: "zm-current-note", attr: { "aria-label": "搜索或打开笔记" } });
  view.registerDomEvent(current, "click", () => tabs.search());
  button(location, "link", "复制当前笔记链接", async () => {
    const file = tabs.sync().active?.view;
    const path = file && "file" in file ? (file as {file?: {path: string}}).file?.path : undefined;
    if (!path) return;
    try { await navigator.clipboard.writeText(`[[${path.replace(/\.md$/, "")}]]`); new Notice("已复制笔记链接"); }
    catch { new Notice("复制失败，请使用 Obsidian 的复制链接命令。"); }
  });
  return () => {
    const active = tabs.sync().active;
    current.textContent = active ? leafTitle(active) : app.vault.getName();
    current.title = current.textContent;
    const history = (active as unknown as {history?: {backHistory?: unknown[];forwardHistory?: unknown[]}} | null)?.history;
    back.disabled = !history?.backHistory?.length;
    forward.disabled = !history?.forwardHistory?.length;
  };
}
