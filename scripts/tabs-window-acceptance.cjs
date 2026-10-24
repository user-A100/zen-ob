const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('obsidian.md/index.html'));
  const results = [], errors = [];
  let backup, createdPath;
  const check = async (name, run) => { await run(); results.push({ name, pass: true }); console.log('PASS', name); };
  const state = () => page.evaluate(() => {
    const t = app.plugins.plugins['zen-mint-sidebar'].tabs, s = t.sync();
    return { ids: [...s.leaves.keys()], active: s.active?.id, type: s.active?.getViewState().type,
      file: s.active?.getViewState().state?.file, files: app.vault.getFiles().map(f => f.path).sort() };
  });
  const launch = async () => {
    await page.locator('.zen-tabs-new').click();
    await page.locator('.zen-launcher input').waitFor();
  };
  const search = async (name, key = 'Enter') => {
    const input = page.locator('.zen-launcher input');
    await input.fill(name);
    await page.locator('.zen-launcher .suggestion-item').first().waitFor();
    await input.press(key);
    await page.locator('.zen-launcher').waitFor({ state: 'detached' });
  };
  try {
    assert.equal(path.resolve(await page.evaluate(() => app.vault.adapter.basePath)).toLowerCase(), path.resolve(__dirname, '../test-vault').toLowerCase());
    page.on('pageerror', e => errors.push(e.message));
    backup = await state();
    await page.evaluate(() => app.plugins.plugins['zen-mint-sidebar'].themePicker.close(false));
    await check('Window-control bar collapses to 8px and expands from the content top edge without a gap', async () => {
      await page.mouse.move(300, 300);
      const css = () => page.locator('.titlebar').evaluate(el => ({ opacity: getComputedStyle(el).opacity, pointer: getComputedStyle(el).pointerEvents, reserved: getComputedStyle(document.body).getPropertyValue('--frame-right-space').trim() }));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.titlebar')).opacity === '0');
      assert.equal((await css()).pointer, 'none'); assert.equal((await css()).reserved, '0px');
      const bounds = await page.locator('.workspace-split.mod-root').boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, 2);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.titlebar')).opacity === '1');
      assert.equal((await css()).pointer, 'auto');
      await page.mouse.move(300, 300);
    });
    await check('New tab and Escape create one blank leaf, without creating a Markdown file', async () => {
      await launch(); await page.keyboard.press('Escape');
      const s = await state(); assert.equal(s.ids.length, backup.ids.length + 1); assert.equal(s.type, 'empty'); assert.deepEqual(s.files, backup.files);
    });
    await check('Repeated new-tab actions retain distinct empty tabs; Ctrl+T follows the same path', async () => {
      const one = await state(); await launch(); await page.keyboard.press('Escape');
      const two = await state(); assert.equal(two.ids.length, one.ids.length + 1); assert.notEqual(two.active, one.active);
      await page.keyboard.press('Control+t'); await page.locator('.zen-launcher input').waitFor(); await page.keyboard.press('Escape');
      const three = await state(); assert.equal(three.ids.length, two.ids.length + 1); assert.deepEqual(three.files, backup.files);
      await page.mouse.move(300, 300);
      await page.screenshot({ path: path.resolve('artifacts/zen-mint-tabs-0.2.1.png') });
    });
    const note = backup.files.find(f => f.endsWith('.md'));
    assert.ok(note, 'Needs one existing note');
    await check('New-tab search opens a file inside its own blank tab and permits the same note twice', async () => {
      await launch(); const first = await state(); await search(note);
      const opened = await state(); assert.equal(opened.active, first.active); assert.equal(opened.file, note); assert.equal(opened.ids.length, first.ids.length);
      await launch(); const second = await state(); await search(note);
      const again = await state(); assert.equal(again.active, second.active); assert.notEqual(again.active, opened.active); assert.equal(again.file, note); assert.deepEqual(again.files, backup.files);
    });
    await check('Location search switches tabs; Ctrl+Enter explicitly opens another copy', async () => {
      const before = await state();
      await page.locator('.zm-current-note').click(); await search(note);
      assert.equal((await state()).ids.length, before.ids.length);
      await page.locator('.zm-current-note').click(); await search(note, 'Control+Enter');
      const after = await state(); assert.equal(after.ids.length, before.ids.length + 1); assert.equal(after.file, note);
    });
    await check('Tab context menu opens another copy without modifying the note', async () => {
      const before = await state();
      await page.locator('.zen-tabs-list .zen-row.is-active').click({ button: 'right' });
      await page.locator('.menu-item').filter({ hasText: '在独立标签中再次打开' }).click();
      const after = await state(); assert.equal(after.ids.length, before.ids.length + 1); assert.equal(after.file, note); assert.deepEqual(after.files, backup.files);
    });
    await check('Disabling the launcher keeps Ctrl+T creating distinct blank tabs', async () => {
      const before = await state();
      await page.evaluate(() => { app.plugins.plugins['zen-mint-sidebar'].settings.zenNewTab = false; });
      try {
        await page.keyboard.press('Control+t');
        await page.waitForFunction(n => app.plugins.plugins['zen-mint-sidebar'].tabs.sync().leaves.size === n + 1, before.ids.length);
        assert.equal(await page.locator('.zen-launcher').count(), 0); assert.equal((await state()).type, 'empty');
      } finally {
        await page.evaluate(() => { app.plugins.plugins['zen-mint-sidebar'].settings.zenNewTab = true; });
      }
    });
    await check('Unmatched query alone creates no file; explicit Create action creates a named Markdown file', async () => {
      const name = `zen-mint-acceptance-${Date.now()}`; createdPath = `${name}.md`;
      await launch(); const input = page.locator('.zen-launcher input'); await input.fill(name);
      const create = page.locator('.zen-launcher .suggestion-item.is-create').filter({ hasText: '创建 .md 文件' });
      await create.waitFor(); assert.deepEqual((await state()).files, backup.files);
      await create.click();
      await page.waitForFunction(p => app.workspace.getActiveFile()?.path === p, createdPath);
      assert.equal((await state()).file, createdPath);
    });
    await check('Blank tab survives plugin reload; uninstall restores window controls and original new-tab command', async () => {
      await launch(); await page.keyboard.press('Escape'); const s = await state();
      const restored = await page.evaluate(async () => {
        const patched = app.commands.commands['workspace:new-tab'].checkCallback;
        await app.plugins.disablePlugin('zen-mint-sidebar');
        const controls = getComputedStyle(document.querySelector('.titlebar-button-container.mod-right'));
        const out = { hidden: document.body.classList.contains('zen-hide-traffic-lights'), opacity: controls.opacity,
          command: app.commands.commands['workspace:new-tab'].checkCallback !== patched };
        await app.plugins.enablePlugin('zen-mint-sidebar'); return out;
      });
      assert.equal(restored.hidden, false); assert.equal(restored.opacity, '1'); assert.equal(restored.command, true);
      assert.ok((await state()).ids.includes(s.active));
    });
    assert.deepEqual(errors, []);
  } catch (e) {
    results.push({ pass: false, error: e.stack }); console.error(e); process.exitCode = 1;
  } finally {
    if (backup) await page.evaluate(async ({ backup, createdPath }) => {
      const p = app.plugins.plugins['zen-mint-sidebar'];
      document.querySelector('.zen-launcher-container')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      for (const [id, leaf] of p.tabs.sync().leaves) if (!backup.ids.includes(id)) leaf.detach();
      const original = p.tabs.sync().leaves.get(backup.active); if (original) await p.tabs.focus(original);
      if (createdPath) { const file = app.vault.getAbstractFileByPath(createdPath); if (file) await app.vault.delete(file); }
    }, { backup, createdPath });
    fs.writeFileSync('artifacts/tabs-window-acceptance.json', JSON.stringify({ host: 'Obsidian 1.14.5', results, errors }, null, 2));
    await browser.close();
  }
})();
