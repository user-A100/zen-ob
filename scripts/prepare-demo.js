(async()=>{
 const p=app.plugins.plugins['zen-mint-sidebar'];
 if(!p?.tabs) throw Error('Load Zen Mint first');
 const docs={
 '收件箱.md':'# 收件箱\n\n留一个入口，收集尚未整理的想法。\n\n[[Zen Mint 使用指南]]',
 'Zen Mint 使用指南.md':'# Zen Mint 使用指南\n\n把笔记留在手边，让工作区安静下来。\n\n- 点击标签切换笔记，悬停显示关闭按钮。\n- 右键标签，将笔记固定或放入文件夹。\n- 固定入口关闭后依然保留，点击即可重新打开。\n- 点击“新建标签页”，搜索已有笔记，或输入名称创建。\n- 用底部图标切换空间，右侧加号添加空间。\n\n## 与原版对照\n\n侧栏从薄荷绿过渡到淡粉。选中的标签使用浅色卡片，内容区是柔和的奶油色。\n\n[[配色与尺寸]]',
 '配色与尺寸.md':'# 配色与尺寸\n\n薄荷绿 `#B6E3C3`\n\n淡粉色 `#D9BFD2`\n\n奶油色 `#F2EFE3`\n\n设置中可调整界面字号，侧栏宽度沿用 Obsidian 的拖拽调整。安装 Style Settings 后还可调整主题颜色和行高。',
 'Release notes.md':'# Release notes\n\n让笔记拥有 Zen 的秩序与留白。\n\n## 侧栏，回到熟悉的位置\n\n固定笔记、文件夹、新建标签页和打开的笔记，共用一条自然的导航轴线。当前笔记像一张浅色卡片，安静地浮在薄荷绿的背景之上。\n\n## 先把交互做好\n\n**标签切换**　点击即可进入笔记，保留原有编辑器与阅读视图。\n\n**固定入口**　关闭页面后仍保留入口，下次点击恢复。\n\n**文件夹**　折叠整理固定笔记，保留正在使用的页面线索。\n\n**清除标签**　关闭当前空间的未固定标签，固定入口和笔记文件会保留。\n\n**Spaces**　每个空间保存自己的打开页和固定列表，共享常用入口。\n\n## 柔和，不等于模糊\n\n界面使用清晰的深绿色文字。过渡仅用于解释标签和空间的变化；启用减少动态效果后会停用。\n\n> 这是 Obsidian 内运行的第一版。侧栏管理沿用 Atlas Sidebar，视觉依据你的 Zen 截图。\n\n[[Zen Mint 使用指南]] · [[配色与尺寸]]',
 '阅读札记.md':'# 阅读札记\n\n保留重要的段落，再写下自己的理解。\n\n[[Release notes]]',
 '灵感.md':'# 灵感\n\n一个好用的工作区，应让下一步操作自然发生。',
 '主题笔记.md':'# 主题笔记\n\n先保持每个部分可用，再逐步对齐细节。'
 };
 for(const [name,text] of Object.entries(docs)) { const f=app.vault.getAbstractFileByPath(name); if(f) await app.vault.modify(f,text); else await app.vault.create(name,text); }
 // Candidate tests may leave different pane layouts. Start with one ordinary tab group.
 const layout=app.workspace.getLayout();
 const names=['阅读札记.md','灵感.md','主题笔记.md','Release notes.md'];
 const leaves=names.map((file,i)=>({id:'demo-leaf-'+i,type:'leaf',state:{type:'markdown',state:{file,mode:'preview'}}}));
 layout.main={id:'demo-main',type:'split',direction:'vertical',children:[{id:'demo-tabs',type:'tabs',children:[leaves[3],leaves[0],leaves[1],leaves[2]],currentTab:0}]};
 layout.active='demo-leaf-3';
 await app.workspace.changeLayout(layout);
 [...document.body.classList].filter(c=>c.startsWith('vt-')).forEach(c=>document.body.classList.remove(c));
 p.tabs.load({essentials:[],spaces:[{id:'demo-home',name:'Space',icon:'castle',pinned:[{kind:'pin',id:'inbox',path:'收件箱.md',icon:'inbox'},{kind:'folder',id:'basics',name:'zen basics',color:'green',collapsed:true,children:[{kind:'pin',id:'guide',path:'Zen Mint 使用指南.md'},{kind:'pin',id:'palette',path:'配色与尺寸.md'}]}]},{id:'demo-reading',name:'阅读',icon:'forest',pinned:[]}]});
 app.vault.setConfig('showInlineTitle',false);
 app.workspace.leftSplit.setSize(174);
 app.workspace.leftSplit.expand();
 app.workspace.rightSplit.collapse();
 p.tabs.commit(); await p.persist();
 return {host:p.hostVersion,rows:document.querySelectorAll('.zen-row').length,theme:app.customCss.theme,enabled:[...app.plugins.enabledPlugins]};
})()
