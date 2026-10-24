const {chromium} = require('playwright');
(async()=>{
 const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
 const pages=browser.contexts()[0].pages();
 console.log(pages.map(p=>p.url()));
 const page=pages.find(p=>p.url().includes('index.html'))||pages[0];
 console.log(await page.evaluate(()=>({version:typeof app!=='undefined'?{version:app.version,vault:app.vault?.getName(),keys:Object.keys(app).slice(0,20)}:null,text:document.body.innerText.slice(0,1800)})));
 await page.screenshot({path:require('node:path').resolve(__dirname,'../artifacts/host.png')});
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
