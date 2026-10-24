const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
try { const page=browser.contexts()[0].pages().find(p=>p.url().includes('index.html'));
 if(path.resolve(await page.evaluate(()=>app.vault.adapter.basePath)).toLowerCase()!==path.resolve(__dirname,'../test-vault').toLowerCase()) throw Error('Not the test vault');
 await page.evaluate(()=>electronWindow.webContents.disableDeviceEmulation());
 await page.screenshot({path:path.resolve(process.argv[2]||'artifacts/zen-mint-v1.png'),animations:'disabled',timeout:15000,scale:'css'});
 console.log('Captured real Obsidian.');
}finally {await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
