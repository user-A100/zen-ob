# Zen Mint：竖向标签底座验证

验证日期：2026-10-23。范围为公开源码检查、依赖锁安装、TypeScript 检查和生产构建；本文件不把构建成功等同于 Obsidian 内的行为测试通过。运行截图与真实工作区测试由主任务另行记录。

## 结论

**首版选择 Atlas Sidebar 1.0.2，最终以其源码制作独立的 Zen Mint Sidebar fork，配合独立主题。** 它的状态模型和 DOM 已经覆盖参考截图中的固定入口、文件夹、清除、普通标签、新标签和底部 Spaces。Vertical Tabs 是维护较活跃的通用标签管理器，但它的固定标签与分组语义不同，达到本次目标需要重建一部分状态管理与 UI。

不要同时启用两个侧栏插件。Atlas 自身也是 Zen UI 的 fork，本次保留其来源、版权与许可证，使用新的插件名称和标识，避免覆盖上游安装。最终在 Obsidian 1.14.5 中完成真实应用验收，见项目 VALIDATION.md；下文是选型时的源码记录。

## 固定版本与构建证据

| 项目 | 版本 / 固定提交 | 最低宿主版本 | 本次结果 |
|---|---|---|---|
| [Vertical Tabs](https://github.com/oxdc/obsidian-vertical-tabs) | 0.18.6 / `2e358438c07466473a0f12dbfb99aaca7e16d8f7` | 1.8.7 | `npm ci --ignore-scripts --no-audit --no-fund`；`tsc -noEmit -skipLibCheck`；`node esbuild.config.mjs production` 均通过 |
| [Atlas Sidebar](https://github.com/atlas-vtt/atlas-sidebar) | 1.0.2 / `71675faced6d9d926eb566b8aa280728956e7c35` | 1.13.0 | `npm ci --ignore-scripts --no-audit --no-fund` 与 `npm run build` 均通过 |

Vertical Tabs 的 npm build 脚本使用 `cp`，因此在 Windows 用等价的类型检查与 esbuild 命令完成验证。输出为 `vertical-tabs/dist/main.js`（398998 bytes）和 `dist/styles.css`（51540 bytes）。Atlas 输出 `atlas-sidebar/main.js`（334653 bytes），配套 manifest 与 styles.css 已在仓库根目录。

两个项目都是 MIT；Atlas fantasy 图标另外标注 CC BY 3.0。查看了完整根目录文件及 `rg --files -g AGENTS.md`，两仓库没有 AGENTS.md。Vertical Tabs 的 CONTRIBUTING 另有 Community Directory fork 与命名说明，若未来分发修改版需再次核实实际发布政策；本次无需 fork Vertical Tabs。

安装器 EXE 显示的 1.11.5 不是当前加载的 Obsidian API 版本，不能据此排除 Atlas。主任务发现本机有 `obsidian-1.14.5.asar`；实际运行版本仍应在隔离应用实例内确认。

## 对参考截图的适配

| 截图行为 | Vertical Tabs | Atlas Sidebar |
|---|---|---|
| 标签切换 / 关闭 / 拖拽排序 | 已实现 | 已实现 |
| 固定页关闭后保留入口、点击重开 | `leaf.setPinned` 原生固定；不等同于 Zen 语义 | `PinNode` 单独持久化，`unload` 仅关闭 leaf；已实现 |
| 固定页导航后回到原始文件 | 需要补充 | `TabsManager.reset` 已实现 |
| 固定入口文件夹 | 按真实 workspace group 组织；需重新映射 | `FolderNode`、最多 5 层、折叠及预览已实现 |
| 分隔线与 Clear | 需要独立入口和行为适配 | `.zen-tabs-separator` / `.zen-tabs-clear`，关闭当前空间未固定标签 |
| New tab 浮动搜索 | 可用原生打开流程；需补充截图中的入口及启动器 | `.zen-tabs-new`、`Launcher` 已实现 |
| 底部 Spaces | 无同等状态模型与 section API | `.zen-space-switcher`，独立 pins/order/active tab 已实现 |
| Mint → pink 背景、奶油内容卡、浅色 active row | CSS 可做 | CSS 可做，现有 DOM 更接近目标 |

Atlas 构造截图结构的位置：`tabs-view.ts:224` 的 `buildSkeleton()`；固定页/文件夹与空间模型位于 `tabs-model.ts`；状态与 leaf 同步位于 `tabs-manager.ts`。配套插件可将功能控制保持在 Atlas 中，只负责参考截图顶部导航栏、当前笔记入口与配置；主题统一覆盖外观。

## API 与维护边界

### Vertical Tabs

- 使用 React 18、Zustand、dnd-kit；`VerticalTabsView` 对整个容器创建 React root。配套插件向这个 root 内任意插入节点容易被重渲染覆盖。
- 暴露 workspace 事件，如 `vertical-tabs:render-tab-icon`、`render-group-icon`、`on-tab-menu`（见 `src/constants/Events.ts`、`src/types/extensions/Events.d.ts`）。这些适合图标与菜单扩展，未发现第三方可插入 section/Spaces 的公开渲染接口。
- 也使用宿主内部 API 与 monkey-around：`ItemView`、`WorkspaceLeaf`、`Workspace`、`FileView`、`MarkdownView` 的原型包装见 `src/main.ts`。不能将其描述为仅依赖稳定公开 API。
- 当前公开 master 最近提交为 2026-10-23，GitHub 页面约 628 stars；相对 Atlas 有更长的维护历史。用户现有 vault 中发现的是 0.16.6，不能将最新源码测试结果自动套用到旧安装。

### Atlas Sidebar

- `tabs-model.ts` 把持久化入口和真实 leaf 分开；同步部分是 essentials/spaces/pins，设备本地部分是 leaf 绑定、排序、split 和当前空间。这比临时 DOM 排序更符合 Zen。
- `.zen-row`、`.zen-tabs-pinned`、`.zen-tabs-list`、`.zen-space-header`、`.zen-space-switcher` 可直接用 CSS 适配，节点由 keyed DOM 更新。配套插件仍应把自己新增节点放在 Atlas 内容之外、做存在性检查及卸载清理。
- 分屏内部调用集中在 `split-layout.ts`：`splitLeaf`、`removeChild`、`insertChild`、`selectTab`、`children/currentTab`。`supportsSplitMoves()` 有部分能力检测；失败会禁用分屏并提示。这是降低风险而不是稳定 API 保证。
- 其他内部依赖还有 `leaf.id`、`leaf.parent`、`createLeafInParent`、`app.commands`，以及以替换 `workspace:new-tab.checkCallback` 接管 Ctrl+T（卸载会恢复）。启动器 `createNewFile` 有 `vault.create` fallback。
- `main.ts:724 applyAll()` 会写入 vault 的 `showRibbon` 与 `showViewHeader`。卸载时将被隐藏的项目设回 true，并不保存原偏好。**需要在隔离 vault 验证，正式启用前记录这两个偏好。**
- Atlas 专用图钉只在 Atlas VTT 插件存在且启用时出现；首版设 `atlasPin: false` 即可，无需引入 VTT 依赖。
- 根目录 MIT 代码包含 CC BY 3.0 图标，应保留 README/许可证中的图标来源。如果改用 Obsidian 自带 Lucide 图标则避免复用该组资产。

## 推荐首版验收

1. 隔离 vault、仅 Atlas + Zen Mint 主题 + 配套插件，确认真实 `apiVersion`。
2. 默认、hover、active、close-hover、文件夹展开/折叠分别截图；窗口宽高、系统缩放与 Obsidian 缩放一并记录。
3. 打开笔记 → 列表出现 → 切换 → 关闭 → 固定关闭后重开 → 拖拽排序 → Clear 不关闭固定入口。
4. 创建/切换空间 → 重启确认入口和顺序保留；卸载恢复标签栏与插件自己的 DOM。
5. 首版展示已验证的功能；分屏/跨窗口/API 降级应独立验证，避免用构建成功代替行为结论。

## 检索渠道记录

已使用本地 rg/git、公开 GitHub 页面、公开 master/main 源码和 npm 锁文件。普通 sandbox git 下载因 127.0.0.1 代理不可达失败；获得网络升级后两个浅克隆成功。没有调用私有 GitHub 账户接口或修改现有用户 vault；未做 npm 全生态搜索，因为这里要验证的两个具体候选与其锁定依赖已明确。
