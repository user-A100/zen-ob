# Zen Mint 0.2.2 验证记录

## 0.2.2 原版窗口控制条与整窗边界

按 Zen Browser 固定提交 `f2b18c4f6179a3918c0d92f2a7406322cda4ad12` 调研原版单工具栏；来源和与侧栏 Compact Mode 的区别见 `research/ZEN-AUTOHIDE-SPEC.md`。复用 Obsidian 窗口按钮，新增独立 `plugin/window-controls.ts` 管理顶边触发、焦点、所属弹出菜单、离窗回退、失焦与卸载清理；没有添加依赖或全局鼠标钩子。

白边根因：旧截图脚本调用 `setViewportSize(970×710)`，外层 Electron 窗口更大；页面内截图裁去了空白，漏检了真实绘制区域。现在移除全部固定视口调用，截图入口禁用遗留设备模拟，恢复媒体模拟。另将内容卡高度改为减去上下边距，修复底边溢出。

`scripts/window-chrome-acceptance.cjs` 检查 8 项实际宿主场景：整窗与内容卡边界；隐藏 8px 和按钮禁用命中；200ms+150ms、34px 与整条顶部入口；横向保持和无内容位移；所属菜单／焦点保持与无关菜单独立；跨上沿的 1000ms 有界回退与失焦；实际窗口尺寸变化与 80%／125% 缩放；卸载清理。缩放、尺寸和设置在 finally 恢复。原生截图通过 `electronWindow.webContents.capturePage()` 获取并检查尺寸与真实窗口、DPI 对应，而非固定页面裁剪。

结果 `artifacts/window-chrome-acceptance.json`；整窗截图 `artifacts/zen-mint-native-0.2.2.png`，隐藏／展开对照 `artifacts/zen-mint-autohide-hidden.png`、`artifacts/zen-mint-autohide-shown.png`。宿主仍为 Windows / Obsidian 1.14.5。鼠标和键盘事件走后台 CDP，未激活桌面窗口；原生跨窗鼠标追踪用文档化回退适配，并未复制 Zen 的系统级实现。

## 0.2.1 空白标签、多开与 Windows 窗口按钮

在独立测试库后台验证：Windows 右上角按钮默认隐藏、角落悬停显示、移出隐藏及释放标题栏预留宽度；新建空白页不生成文件；连续新建及 Ctrl+T 保留独立页面；搜索结果打开到对应新标签；同一笔记多开；地址栏搜索切换及 Ctrl+Enter 多开；右键再次打开；关闭启动器后 Ctrl+T 仍独立新建；明确选择创建操作才生成 .md；插件重载保留空白页及卸载还原窗口按钮和原命令。

回归脚本 `scripts/tabs-window-acceptance.cjs` 保留原有页面，只清理它自己创建的页面与临时测试文件。结果见 `artifacts/tabs-window-acceptance.json`。新标签使用宿主 `createLeafInParent`，避开 `getLeaf('tab')` 对当前空白页的复用行为。仍使用宿主窗口按钮，不修改系统级窗口框架。

## 0.2.0 原版主题编辑器

实际宿主 Obsidian 1.14.5；全程通过隐藏测试窗口的 CDP 接口执行，没有激活桌面窗口或发送 OS 键盘／鼠标输入。

- 4 项模型检查通过，含 45 组原版源码产生的独立颜色结果（41 个原版预设 + 4 个自由坐标），不是用移植代码生成自己的期望值。
- 10 项真实 UI 场景通过：右键入口与尺寸、三色球与空盘操作、主球拖动、配色算法、5 页预设、强度和颗粒、全局模式、关闭保存、Space 隔离／非当前 Space 预览、重新加载与清理。
- UI 测试临时停用 Style Settings，证明调色入口和行为不依赖它；结束后恢复原有主题记录、Space 和 Style Settings 启用状态。
- 新验收文件 `artifacts/theme-picker-acceptance.json`；截图 `artifacts/zen-mint-theme-editor.png`。
- 噪点使用 SVG turbulence；图标使用 Obsidian Lucide；Firefox 的系统透明和触觉未移植。不宣称编辑器或应用已完全逐像素一致。

下面保留 0.1.0 侧栏底座验收记录；这次没有重置用户已经体验过的测试库布局重跑旧 fixture。

日期：2026-10-23。宿主 API 版本：**Obsidian 1.14.5**，Windows 桌面版。安装器版本 1.11.5 不等于当前实际加载的应用版本。

## 底座验证

- Vertical Tabs 0.18.6：依赖锁安装、TypeScript、生产构建通过；在真实隔离库加载成功，注册 22 个命令，竖向标签视图可显示。
- Atlas Sidebar 1.0.2：依赖锁安装、TypeScript、生产构建通过；在真实隔离库加载成功，标签与侧栏可显示。
- 选择 Atlas 的原因是已有的固定入口与 Spaces 状态模型更接近本次目标；没有同时加载两个管理器进行最终验收。

## 第一版真实应用测试

`scripts/acceptance.cjs` 通过 Playwright CDP 连接本机独立测试实例，仅接受名称为 `test-vault` 的库。测试使用真实宿主、真实笔记文件、插件生成的真实 DOM，不使用 Obsidian 的 HTML 模拟页面。

验收覆盖：顶部工具栏；笔记切换；文件列表与侧栏返回；收起与展开；右键固定；中键关闭固定页；固定入口点击恢复；文件夹折叠；HTML 拖拽排序；新标签搜索打开；空间切换；清除未固定标签时保留固定入口、其他空间和笔记文件；插件卸载与重新启用；持久入口恢复；新标签命令恢复；原有外观偏好未改变。精确结果见 `artifacts/acceptance.json`。

隐藏 Electron 窗口的原生 OS 拖拽会话不稳定，因此后台验收使用同一 `DataTransfer` 分派 `dragstart/dragover/drop/dragend`，验证的是实际 HTML 拖拽处理器和排序结果。前台原生拖拽曾通过一次；最终版没有重新争夺用户焦点做前台拖拽验收。

测试实例开启 `--disable-gpu`，以稳定后台截图；初次启用 GPU 的截图过程出现过渲染进程退出，重启为软件渲染后没有重复出现。用户日常 GPU 配置下尚需体验验证。

## 视觉检查

参考：用户提供的 1533 × 1107 Zen Browser 调色截图，并查看了当时正在运行的原版 Zen 窗口。

真实 Obsidian 截图按 **970 × 710 CSS px** 导出，`scale: css`，不是原图的设备像素尺寸。参考图的侧栏约为 174 CSS px 的视觉比例；行高采用 36px，文字 15px。主题当前使用不透明渐变模拟参考色调；不穿透到桌面背景。

截图：`zen-mint-v1.png`（默认）、`zen-mint-hover.png`（悬停）、`zen-mint-folder.png`（文件夹展开）、`zen-mint-launcher.png`（搜索）、`zen-mint-dark.png`（暗色 CSS 渲染）。暗色截图通过切换真实页面主题类检查颜色，不代表已经验收所有系统自动切换场景。

对齐的是首版侧栏颜色、尺寸层级、选中／悬停、文件夹与标签结构。未计算逐像素误差，没有宣称已经像素级一致。截图里的笔记内容是独立测试资料，避免将浏览器网页内容伪装成 Obsidian 的真实功能。

## 本次未验收

Zen 完整 Compact Mode、原生窗口材质、桌面透明效果、全部分屏行为、弹出窗口、移动端、其他社区主题与复杂插件组合、跨操作系统字体差异。Atlas 上游的部分高级功能依赖 Obsidian 内部 API，版本升级后需要重跑测试。

所有构建、测试库、调试配置均位于 `Zen Mint/`。没有安装到或改写现有个人笔记库。
