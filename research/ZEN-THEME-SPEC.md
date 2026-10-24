# Zen 原版主题编辑器移植规格

参照源码固定为官方 dev 提交 `f2b18c4f6179a3918c0d92f2a7406322cda4ad12`，不是对用户安装版本的断言。

原始位置：

- `src/browser/base/content/zen-panels/theme-picker.inc`：面板结构、41 个预设。
- `src/zen/spaces/zen-gradient-generator.css`：380px 面板、358px 点阵区、球、色卡、滑条和旋钮样式。
- `src/zen/spaces/ZenGradientGenerator.mjs`：全部颜色和交互算法。

| 原版行为 | 原始控制器行号 | Obsidian 实现 |
|---|---|---|
| 侧栏／工具栏右键 Edit Theme 浮层 | 212–231 | 右键侧栏空白或顶部工具栏 → 更改主题；Space 菜单亦可进入 |
| Auto / Light / Dark | 319–348 | 三个图标按钮，全局保存，Auto 监听系统配色 |
| 主球拖动，最多 3 球和谐联动 | 201–209、537–581、772–897、962–1221 | 原版取色公式、圆形边界、6 种和谐关系 |
| 单击空白、右键删除、加减球 | 962–1175 | 同语义；主球支持方向键微调作为键盘补充 |
| 五页 41 色卡 | 241–317 | 原始坐标／明度／算法／预览提取，页数为 8/8/8/8/9 |
| 波形与浓度滑条 | 1229–1236、1287–1337 | .25–.8、step .001；使用原版不透明平台混合路径 |
| 颗粒纹理旋钮 | 351–413 | 16 档，12 点为 0，一圈回 0，不用来旋转渐变 |
| 单／双／三色渐变 | 1339–1392 | 单色、双层相对 -30°/150° 渐变、三层组合 |
| Space 独立主题、关闭保存 | 1961–2034 | 独立 spaceThemes，实时预览；关闭浮层保存，无表单保存／取消按钮 |
| 编辑非当前 Space 的主题 | 1951–1958、2017–2026 | 临时预览该 Space，关闭返回当前 Space |

移植文件均标明 MPL-2.0，安装包携带修改后的源文件与完整许可证。Firefox XUL/native popup 替换为 Obsidian DOM／Component；没有模拟系统级桌面透明或触觉反馈。噪点使用 SVG turbulence 替代 Firefox 的 grain PNG；内置图标使用 Obsidian Lucide 对应图标，而非复制原版图标资产。这些是明确的宿主适配差异，不能称为完整像素一致。

`scripts/reference-colors.cjs` 仅截取原版三个纯颜色函数生成测试向量；41 个预设和 4 个自由坐标的结果由 `scripts/theme-model.test.cjs` 独立比对。`scripts/theme-picker-acceptance.cjs` 在真实 Obsidian 中测试界面，并临时停用 Style Settings，验证调色不依赖它。测试完成后恢复此前主题记录和全局模式。
