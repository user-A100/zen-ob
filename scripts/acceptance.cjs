const {chromium}=require('playwright');
const fs=require('node:fs'); const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
 const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));
 const results=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const check=async(name,fn)=>{await fn();results.push({name,pass:true});console.log('PASS',name);};
 const active=()=>page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.sync().active?.getViewState().state?.file);
 try {
  assert.equal(path.resolve(await page.evaluate(()=>app.vault.adapter.basePath)).toLowerCase(),path.resolve(__dirname,'../test-vault').toLowerCase());
  await page.emulateMedia({reducedMotion:'reduce'});
  await check('Host 1.14.5; toolbar visible; one sidebar',async()=>{
   assert.equal(await page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].hostVersion),'1.14.5');
   assert.equal(await page.locator('.zm-toolbar:visible').count(),1);
   assert.equal(await page.locator('.zen-atlas-pin:visible').count(),0);
   assert.equal(await page.evaluate(()=>app.workspace.getLeavesOfType('zen-mint-tabs').length),1);
  });
  await check('Click a vertical tab opens the real note',async()=>{
   await page.locator('[data-row="tab:demo-leaf-0"]').click();
   assert.equal(await active(),'阅读札记.md');
  });
  await check('File explorer stays reachable and can return to Zen tabs',async()=>{
   await page.getByRole('button',{name:'菜单',exact:true}).click();
   await page.locator('.menu-item').filter({hasText:/^文件列表$/}).click();
   const zenTab=page.locator('.mod-left-split .workspace-tab-header[data-type="zen-mint-tabs"]');
   assert.ok(await zenTab.isVisible());
   await zenTab.click();
   assert.equal(await page.locator('.zm-toolbar:visible').count(),1);
  });
  await check('Collapse and reveal keep the sidebar reachable',async()=>{
   await page.getByRole('button',{name:'收起侧栏（也可用 Obsidian 的侧栏快捷键展开）',exact:true}).click();
   await page.locator('.zm-sidebar-reveal').click();
   assert.equal(await page.evaluate(()=>app.workspace.leftSplit.collapsed),false);
   assert.equal(await page.locator('.zm-toolbar:visible').count(),1);
  });
  await check('Context menu pins a tab; close keeps its entry; click restores it',async()=>{
   const row=page.locator('[data-row="tab:demo-leaf-0"]');
   await row.click({button:'right'});
   const menu=page.locator('.menu-item').filter({hasText:/^Pin tab$/});
   if(await menu.count()) await menu.click();
   else throw Error('Pin tab context command missing');
   await page.waitForFunction(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.state.pinned.some(n=>n.path==='阅读札记.md'));
   const pin=await page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.state.pinned.find(n=>n.path==='阅读札记.md').id);
   await page.locator(`[data-row="pin:${pin}"]`).click({button:'middle'});
   await page.waitForFunction(()=>!app.plugins.plugins['zen-mint-sidebar'].tabs.sync().bound.has(app.plugins.plugins['zen-mint-sidebar'].tabs.state.pinned.find(n=>n.path==='阅读札记.md').id));
   assert.equal(await page.locator(`[data-row="pin:${pin}"]`).count(),1);
   await page.locator(`[data-row="pin:${pin}"]`).click();
   assert.equal(await active(),'阅读札记.md');
  });
  await check('Folder expands and collapses using the row',async()=>{
   await page.locator('[data-row="folder:basics"]').click();
   await page.waitForFunction(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.state.pinned.find(n=>n.id==='basics').collapsed===false);
   await page.locator('[data-row="folder:basics"]').click();
   await page.waitForFunction(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.state.pinned.find(n=>n.id==='basics').collapsed===true);
  });
  await check('HTML drag reorders unpinned tabs',async()=>{
   const before=await page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.state.order.slice());
   // Hidden Electron windows do not consistently start OS drag sessions. Exercise the actual
   // HTML DnD handlers with a shared DataTransfer without bringing the window to the foreground.
   const source=page.locator('[data-row="tab:demo-leaf-2"]');
   const target=page.locator('[data-row="tab:demo-leaf-1"]');
   const bounds=await target.boundingBox();
   const data=await page.evaluateHandle(()=>new DataTransfer());
   await source.dispatchEvent('dragstart',{dataTransfer:data});
   await target.dispatchEvent('dragover',{dataTransfer:data,clientX:bounds.x+30,clientY:bounds.y+2});
   await target.dispatchEvent('drop',{dataTransfer:data,clientX:bounds.x+30,clientY:bounds.y+2});
   await source.dispatchEvent('dragend',{dataTransfer:data});
   await data.dispose();
   await page.waitForFunction(old=>JSON.stringify(app.plugins.plugins['zen-mint-sidebar'].tabs.state.order)!==JSON.stringify(old),before,{timeout:3000});
   const after=await page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.state.order.slice());
   assert.notDeepEqual(after,before);
  });
  await check('New-tab launcher finds and opens an existing note',async()=>{
   await page.locator('.zen-tabs-new').click();
   const input=page.locator('.zen-launcher input');
   await input.fill('配色与尺寸');
   await page.waitForSelector('.zen-launcher .suggestion-item');
   await input.press('Enter');
   await page.waitForFunction(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.sync().active?.getViewState().state?.file==='配色与尺寸.md');
  });
  await check('Space switch changes the visible tab set',async()=>{
   await page.locator('.zen-space-button[data-space="demo-reading"]').click();
   await page.evaluate(async()=>{
    await app.workspace.getLeaf('tab').openFile(app.vault.getAbstractFileByPath('主题笔记.md'));
   });
   await page.locator('.zen-space-button[data-space="demo-home"]').click();
   assert.equal(await page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].tabs.activeSpace().id),'demo-home');
  });
  await check('Clear preserves pinned entries, other space, and note files',async()=>{
   const before=await page.evaluate(()=>({files:app.vault.getFiles().length,pins:app.plugins.plugins['zen-mint-sidebar'].tabs.state.pinned.length}));
   await page.locator('.zen-tabs-separator').hover();
   await page.locator('.zen-tabs-clear').click();
   const after=await page.evaluate(()=>{const t=app.plugins.plugins['zen-mint-sidebar'].tabs;const snap=t.sync();return {files:app.vault.getFiles().length,pins:t.state.pinned.length,unpinned:snap.unpinned.filter(l=>l.getViewState().type!=='empty').length,other:[...snap.leaves.values()].filter(l=>l.getViewState().state?.file==='主题笔记.md').length};});
   assert.equal(after.files,before.files);assert.equal(after.pins,before.pins);assert.equal(after.unpinned,0);assert.ok(after.other>=1);
  });
  await check('Unload restores classes and new-tab command; preferences unchanged',async()=>{
   const out=await page.evaluate(async()=>{
    const p=app.plugins.plugins['zen-mint-sidebar']; await p.persist();
    const tree=JSON.stringify(p.tabs.serialize());
    const before=[app.vault.getConfig('showRibbon'),app.vault.getConfig('showViewHeader')];
    await app.plugins.disablePlugin('zen-mint-sidebar');
    const removed=!document.body.classList.contains('zen-mint-sidebar')&&!document.body.classList.contains('zm-hide-ribbon');
    const after=[app.vault.getConfig('showRibbon'),app.vault.getConfig('showViewHeader')];
    const cb=app.commands.commands['workspace:new-tab'].checkCallback;
    await app.plugins.enablePlugin('zen-mint-sidebar');
    const q=app.plugins.plugins['zen-mint-sidebar'];await q.revealTabsView();
    return {removed,before,after,persisted:JSON.stringify(q.tabs.serialize())===tree,commandPatched:app.commands.commands['workspace:new-tab'].checkCallback!==cb};
   });
   assert.ok(out.removed);assert.deepEqual(out.before,out.after);assert.ok(out.persisted);assert.ok(out.commandPatched);
  });
  assert.deepEqual(errors,[]);
 } catch(e) {results.push({pass:false,error:e.message});console.error(e);process.exitCode=1;}
 finally {fs.writeFileSync('artifacts/acceptance.json',JSON.stringify({host:'Obsidian 1.14.5',results,errors},null,2));await browser.close();}
})();
