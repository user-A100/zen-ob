const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));
const results=[],errors=[];let backup;
const check=async(name,run)=>{await run();results.push({name,pass:true});console.log('PASS',name)};
const state=()=>page.evaluate(()=>{const p=app.plugins.plugins['zen-mint-sidebar'];return p.settings.spaceThemes[p.tabs.activeSpace().id]});
try {
 assert.equal(path.resolve(await page.evaluate(()=>app.vault.adapter.basePath)).toLowerCase(),path.resolve(__dirname,'../test-vault').toLowerCase());
 await page.evaluate(()=>electronWindow.webContents.disableDeviceEmulation());
 page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
 backup=await page.evaluate(async()=>{const p=app.plugins.plugins['zen-mint-sidebar'];p.themePicker.close(false);const snap=p.tabs.sync();const b={spaceThemes:p.settings.spaceThemes,themeScheme:p.settings.themeScheme,active:p.tabs.activeSpace().id,leafIds:[...snap.leaves.keys()],activeLeaf:snap.active?.id,styleSettings:!!app.plugins.plugins['obsidian-style-settings']};await app.plugins.disablePlugin('obsidian-style-settings');return JSON.parse(JSON.stringify(b))});
 await check('Original entry: sidebar right-click opens a 380px non-modal dot-board',async()=>{
  await page.locator('.zen-tabs-header').click({button:'right'});await page.locator('.menu-item').filter({hasText:'更改主题…'}).click();
  assert.ok(Math.abs((await page.locator('.zm-theme-picker').boundingBox()).width-380)<1);
  assert.equal(await page.locator('.zm-theme-picker').getAttribute('aria-modal'),'false');
  assert.equal(await page.locator('.zm-theme-scheme button').count(),3);assert.equal(await page.locator('.zm-theme-picker input[type=color]').count(),0);
 });
 await check('Up to three linked dots; empty board click creates first color',async()=>{
  while(await page.locator('.zm-theme-dot').count()<3)await page.getByRole('button',{name:'添加颜色',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'添加颜色',exact:true}).isDisabled(),true);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'移除颜色',exact:true}).click();
  assert.equal(await page.locator('.zm-theme-hint').isVisible(),true);assert.equal(await page.getByRole('button',{name:'添加颜色',exact:true}).isDisabled(),true);
  await page.locator('.zm-theme-board').click({position:{x:95,y:250}});assert.equal((await state()).points.length,1);
 });
 await check('Dragging the primary updates color and live gradient; stays in circular bounds',async()=>{
  const before=await state();const dot=await page.locator('.zm-theme-dot.primary').boundingBox(),board=await page.locator('.zm-theme-board').boundingBox();
  await page.mouse.move(dot.x+dot.width/2,dot.y+dot.height/2);await page.mouse.down();await page.mouse.move(board.x+330,board.y+190,{steps:5});await page.mouse.up();
  const after=await state();assert.notDeepEqual(after.points,before.points);assert.ok(Math.hypot(after.points[0].x-179,after.points[0].y-179)<=179.01);
  assert.ok((await page.evaluate(()=>getComputedStyle(document.querySelector('.app-container')).backgroundImage)).includes('gradient'));
 });
 await check('Harmony button cycles relationships without randomizing the primary',async()=>{
  await page.getByRole('button',{name:'添加颜色',exact:true}).click();const a=await state();
  await page.getByRole('button',{name:'切换配色算法',exact:true}).click();const b=await state();assert.notEqual(a.algorithm,b.algorithm);assert.deepEqual(a.points[0],b.points[0]);assert.notDeepEqual(a.points[1],b.points[1]);
 });
 await check('Five original preset pages have 8/8/8/8/9 swatches',async()=>{
  const counts=[];for(let i=0;i<5;i++){counts.push(await page.locator('.zm-theme-swatch').count());if(i<4)await page.getByRole('button',{name:'下一页配色',exact:true}).click();}
  assert.deepEqual(counts,[8,8,8,8,9]);assert.equal(await page.getByRole('button',{name:'下一页配色',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'配色 5-9',exact:true}).click();assert.equal((await state()).points[0].type,'explicit-black-white');
 });
 await check('Wave slider changes color intensity; texture dial uses sixteen steps',async()=>{
  await page.locator('.zm-theme-strength input').evaluate(el=>{el.value='.8';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await state()).opacity,.8);
  const dial=page.getByRole('slider',{name:'颗粒纹理'});await dial.focus();await dial.press('ArrowRight');assert.equal((await state()).texture,1/16);
  for(let i=0;i<15;i++)await dial.press('ArrowRight');assert.equal((await state()).texture,0);
 });
 await check('Global Light/Dark/Auto work without Style Settings; no save/cancel form',async()=>{
  await page.getByRole('button',{name:'深色',exact:true}).click();assert.ok(await page.evaluate(()=>document.body.classList.contains('theme-dark')));
  await page.getByRole('button',{name:'跟随系统',exact:true}).click();assert.equal(await page.evaluate(()=>app.plugins.plugins['zen-mint-sidebar'].settings.themeScheme),'auto');
  await page.getByRole('button',{name:'浅色',exact:true}).click();assert.ok(await page.evaluate(()=>document.body.classList.contains('theme-light')));
  assert.equal(await page.getByRole('button',{name:/^(保存|取消)$/}).count(),0);assert.equal(await page.evaluate(()=>!!app.plugins.plugins['obsidian-style-settings']),false);
 });
 await check('Escape closes and saves the current space, not a global palette',async()=>{
  await page.getByRole('button',{name:'上一页配色',exact:true}).click();await page.getByRole('button',{name:'上一页配色',exact:true}).click();await page.getByRole('button',{name:'上一页配色',exact:true}).click();
  await page.getByRole('button',{name:'配色 2-2',exact:true}).click();
  await page.keyboard.press('Escape');assert.equal(await page.locator('.zm-theme-picker').count(),0);
  const result=await page.evaluate(async()=>{const p=app.plugins.plugins['zen-mint-sidebar'];await p.persist();return {id:p.tabs.activeSpace().id,mem:p.settings.spaceThemes,stored:(await p.loadData()).spaceThemes}});
  assert.deepEqual(result.stored[result.id],result.mem[result.id]);
 });
 await check('Switching spaces restores each gradient; inactive-space edits preview and return',async()=>{
  const result=await page.evaluate(async()=>{const p=app.plugins.plugins['zen-mint-sidebar'];const id=p.tabs.activeSpace().id;const before=getComputedStyle(document.querySelector('.app-container')).backgroundImage;const other=await p.tabs.addSpace();await p.tabs.switchSpace(id);p.themePicker.open(document.querySelector('.zen-tabs-header'),other.id);return {id,other:other.id,before}});
  await page.getByRole('button',{name:'配色 2-1',exact:true}).click();const preview=await page.evaluate(()=>getComputedStyle(document.querySelector('.app-container')).backgroundImage);assert.notEqual(preview,result.before);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.app-container')).backgroundImage),result.before);
  await page.evaluate(async id=>app.plugins.plugins['zen-mint-sidebar'].tabs.switchSpace(id),result.other);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.app-container')).backgroundImage),preview);
  await page.evaluate(async({id,other})=>{const p=app.plugins.plugins['zen-mint-sidebar'];await p.tabs.switchSpace(id);await p.tabs.deleteSpace(other);delete p.settings.spaceThemes[other];},result);
 });
 await check('Reload restores themes and cleans old popup/style nodes',async()=>{
  const result=await page.evaluate(async()=>{const p=app.plugins.plugins['zen-mint-sidebar'];await p.persist();const saved=JSON.stringify(p.settings.spaceThemes);await app.plugins.disablePlugin('zen-mint-sidebar');const clean=!document.querySelector('.zm-theme-picker')&&!document.querySelector('style[data-zen-theme]');await app.plugins.enablePlugin('zen-mint-sidebar');const q=app.plugins.plugins['zen-mint-sidebar'];await q.revealTabsView();return {clean,saved,restored:JSON.stringify(q.settings.spaceThemes),styles:document.querySelectorAll('style[data-zen-theme]').length}});
  assert.ok(result.clean);assert.equal(result.saved,result.restored);assert.equal(result.styles,1);
 });
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>app.commands.executeCommandById('zen-mint-sidebar:edit-theme'));
 await page.screenshot({path:'artifacts/zen-mint-theme-editor.png',scale:'css',animations:'disabled',timeout:15000});
}catch(e){results.push({pass:false,error:e.message});console.error(e);process.exitCode=1;}
finally {
 if(backup)await page.evaluate(async b=>{const p=app.plugins.plugins['zen-mint-sidebar'];p.themePicker.close(false);p.settings.spaceThemes=b.spaceThemes;p.settings.themeScheme=b.themeScheme;await p.tabs.switchSpace(b.active);for(const [id,leaf]of p.tabs.sync().leaves)if(!b.leafIds.includes(id)&&leaf.getViewState().type==='empty')leaf.detach();const original=p.tabs.sync().leaves.get(b.activeLeaf);if(original)await p.tabs.focus(original);p.themePicker.apply();await p.persist();if(b.styleSettings)await app.plugins.enablePlugin('obsidian-style-settings');},backup).catch(console.error);
 await page.emulateMedia({reducedMotion:null});
 fs.writeFileSync('artifacts/theme-picker-acceptance.json',JSON.stringify({host:'Obsidian 1.14.5',results,errors},null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
