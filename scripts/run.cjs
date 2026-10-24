const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9224'); const page=browser.contexts()[0].pages().find(p=>p.url().includes('obsidian.md/index.html')); if(!page) throw Error('Test vault window missing');
const target=await page.evaluate(()=>app.vault.adapter.basePath);
if(path.resolve(target).toLowerCase()!==path.resolve(__dirname,'../test-vault').toLowerCase()) throw Error('Refusing a non-test vault');
page.on('console',m=>{if(['error','warn'].includes(m.type())) console.log(m.type(),m.text())}); page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
console.log(JSON.stringify(await page.evaluate(fs.readFileSync(process.argv[2],'utf8')),null,2));
if(process.argv[3]) await page.screenshot({path:path.resolve(process.argv[3])});
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
