const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('obsidian.md/index.html'));
  const results = [], errors = [];
  let backup;
  const check = async (name, run) => { await run(); results.push({ name, pass: true }); console.log('PASS', name); };
  const metrics = () => page.evaluate(() => {
    const bar = document.querySelector('.titlebar'), root = document.querySelector('.workspace-split.mod-root');
    const c = getComputedStyle(bar), bounds = electronWindow.getContentBounds();
    return { inner: [innerWidth, innerHeight], bounds, zoom: window.require('electron').webFrame.getZoomFactor(),
      app: document.querySelector('.app-container').getBoundingClientRect().toJSON(), root: root.getBoundingClientRect().toJSON(),
      margin: { bottom: parseFloat(getComputedStyle(root).marginBottom), right: parseFloat(getComputedStyle(root).marginRight) },
      bar: { height: bar.getBoundingClientRect().height, opacity: c.opacity, delay: c.transitionDelay, duration: c.transitionDuration },
      interactive: document.body.classList.contains('zm-window-controls-interactive') };
  });
  const filled = m => {
    assert.ok(Math.abs(m.inner[0] - m.bounds.width / m.zoom) < 2, 'Native window width must match CSS viewport');
    assert.ok(Math.abs(m.inner[1] - m.bounds.height / m.zoom) < 2, 'Native window height must match CSS viewport');
    assert.ok(Math.abs(m.app.width - m.inner[0]) < 1 && Math.abs(m.app.height - m.inner[1]) < 1, 'App must fill the real viewport');
    assert.ok(Math.abs(m.inner[1] - m.root.bottom - m.margin.bottom) < 1, 'Card bottom must keep its frame inset');
    assert.ok(Math.abs(m.inner[0] - m.root.right - m.margin.right) < 1, 'Card right edge must keep its frame inset');
  };
  const hidden = async () => {
    await page.mouse.move(400, 160);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.titlebar')).opacity === '0');
  };
  const reveal = async () => {
    const m = await metrics(); await page.mouse.move(m.root.left + m.root.width * .4, 2);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.titlebar')).opacity === '1' && document.body.classList.contains('zm-window-controls-interactive'));
  };
  const nativeShot = async file => {
    const shot = await page.evaluate(async () => {
      const image = await electronWindow.webContents.capturePage(); return { size: image.getSize(), data: image.toDataURL(), dpr: devicePixelRatio };
    });
    const m = await metrics();
    assert.ok(Math.abs(shot.size.width - m.bounds.width * shot.dpr) <= 2);
    assert.ok(Math.abs(shot.size.height - m.bounds.height * shot.dpr) <= 2);
    fs.writeFileSync(path.resolve(file), Buffer.from(shot.data.split(',')[1], 'base64'));
  };
  try {
    assert.equal(path.resolve(await page.evaluate(() => app.vault.adapter.basePath)).toLowerCase(), path.resolve(__dirname, '../test-vault').toLowerCase());
    page.on('pageerror', e => errors.push(e.message));
    backup = await page.evaluate(() => ({ bounds: electronWindow.getBounds(), zoom: window.require('electron').webFrame.getZoomFactor(), always: app.plugins.plugins['zen-mint-sidebar'].settings.showTrafficLights }));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => { electronWindow.webContents.disableDeviceEmulation(); const p = app.plugins.plugins['zen-mint-sidebar']; p.settings.showTrafficLights = false; p.applyAll(); });
    await check('Real native window and content card fill correctly without fixed viewport emulation', async () => { filled(await metrics()); });
    await check('Collapsed bar is 8px and hidden captions cannot receive pointer input', async () => {
      await hidden(); const m = await metrics(); assert.equal(m.bar.height, 8); assert.equal(m.interactive, false);
      assert.equal(await page.locator('.titlebar-button.mod-close').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
      assert.equal(await page.evaluate(() => !!document.elementFromPoint(innerWidth - 30, 2)?.closest('.titlebar')), false);
      await nativeShot('artifacts/zen-mint-autohide-hidden.png');
    });
    await check('Entire content top edge reveals 34px bar with original 200ms delay and 150ms transition', async () => {
      const before = await metrics();
      assert.equal(before.bar.delay, '0.2s, 0.2s'); assert.equal(before.bar.duration, '0.15s, 0.15s');
      await page.mouse.move(before.root.left + before.root.width * .4, 2);
      const early = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 80)); const e = document.querySelector('.titlebar'); return { opacity: getComputedStyle(e).opacity, hit: getComputedStyle(document.querySelector('.titlebar-button.mod-close')).pointerEvents }; });
      assert.equal(early.opacity, '0'); assert.equal(early.hit, 'none');
      await page.waitForFunction(() => document.body.classList.contains('zm-window-controls-interactive'));
      const shown = await metrics(); assert.equal(shown.bar.height, 34); assert.equal(shown.bar.opacity, '1'); assert.deepEqual(shown.root, before.root);
      assert.notEqual(await page.locator('.titlebar').evaluate(e => getComputedStyle(e).backgroundImage), 'none');
      assert.equal(await page.locator('.titlebar-button-container.mod-right').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
      await nativeShot('artifacts/zen-mint-autohide-shown.png');
    });
    await check('Moving across the control bar holds it open; leaving collapses without moving content', async () => {
      const m = await metrics(); await page.mouse.move(m.root.left + 20, 20); assert.equal((await metrics()).bar.opacity, '1');
      await page.mouse.move(m.inner[0] - 30, 20); assert.equal((await metrics()).interactive, true);
      await hidden(); assert.deepEqual((await metrics()).root, m.root);
    });
    await check('Owned popup and toolbar focus keep the expanded bar open until released', async () => {
      await reveal();
      await page.evaluate(() => { const menu = document.createElement('div'); menu.className = 'menu zm-acceptance-menu'; document.body.append(menu); });
      await page.mouse.move(400, 160); assert.equal((await metrics()).bar.opacity, '1');
      await page.evaluate(() => document.querySelector('.zm-acceptance-menu').remove()); await hidden();
      await reveal();
      await page.evaluate(() => { const e = document.querySelector('.titlebar-button.mod-minimize'); e.dataset.zmPriorTabindex = e.getAttribute('tabindex') ?? ''; e.tabIndex = 0; e.focus(); });
      await page.mouse.move(400, 160); assert.equal((await metrics()).bar.opacity, '1');
      await page.evaluate(() => { const e = document.querySelector('.titlebar-button.mod-minimize'); e.blur(); if (e.dataset.zmPriorTabindex) e.setAttribute('tabindex', e.dataset.zmPriorTabindex); else e.removeAttribute('tabindex'); delete e.dataset.zmPriorTabindex; });
      await hidden();
      await page.evaluate(() => { const menu = document.createElement('div'); menu.className = 'menu zm-acceptance-menu'; document.body.append(menu); });
      assert.equal((await metrics()).bar.opacity, '0');
      await page.evaluate(() => document.querySelector('.zm-acceptance-menu').remove());
    });
    await check('Top-edge leave has bounded 1000ms fallback; blur releases immediately', async () => {
      await reveal();
      await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave', { clientY: -1 })));
      assert.equal((await metrics()).bar.opacity, '1');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.titlebar')).opacity === '0');
      await reveal(); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.titlebar')).opacity === '0');
      assert.equal((await metrics()).interactive, false);
    });
    await check('Native resizing and 80%/125% zoom retain all four frame edges', async () => {
      for (const [width, height, zoom] of [[900, 680, .8], [1100, 800, 1.25], [680, 540, 1]]) {
        await page.evaluate(({ width, height, zoom }) => { window.require('electron').webFrame.setZoomFactor(zoom); electronWindow.setContentSize(width, height); }, { width, height, zoom });
        await page.waitForFunction(() => Math.abs(innerWidth - electronWindow.getContentBounds().width / window.require('electron').webFrame.getZoomFactor()) < 2);
        filled(await metrics());
      }
    });
    await check('Plugin unload restores native titlebar and removes all controller state', async () => {
      const out = await page.evaluate(async () => {
        await app.plugins.disablePlugin('zen-mint-sidebar');
        const result = { classes: document.body.classList.contains('zm-autohide-window-controls'), left: document.body.style.getPropertyValue('--zm-chrome-left'), pointer: getComputedStyle(document.querySelector('.titlebar-button.mod-close')).pointerEvents };
        await app.plugins.enablePlugin('zen-mint-sidebar'); return result;
      });
      assert.equal(out.classes, false); assert.equal(out.left, ''); assert.equal(out.pointer, 'auto');
    });
    assert.deepEqual(errors, []);
  } catch (e) { results.push({ pass: false, error: e.stack }); console.error(e); process.exitCode = 1; }
  finally {
    if (backup) await page.evaluate(b => {
      document.querySelector('.zm-acceptance-menu')?.remove();
      window.require('electron').webFrame.setZoomFactor(b.zoom); electronWindow.setBounds(b.bounds); electronWindow.webContents.disableDeviceEmulation();
      const p = app.plugins.plugins['zen-mint-sidebar']; p.settings.showTrafficLights = b.always; p.applyAll();
    }, backup);
    await page.emulateMedia({ reducedMotion: null });
    await hidden();
    const final = await metrics(); filled(final);
    fs.writeFileSync('artifacts/window-chrome-acceptance.json', JSON.stringify({ host: 'Obsidian 1.14.5', results, errors, final }, null, 2));
    await nativeShot('artifacts/zen-mint-native-0.2.2.png');
    await browser.close();
  }
})();
