import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const passage = `The first paragraph makes a clear beginning and introduces the route.\n\nThe second paragraph keeps enough context to test movement between stops.\n\nThe third paragraph completes this short and deliberately bounded reading.`;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const names = ['reading-sprint-rail', 'demo:reading-sprint-rail'];
      let done = 0;
      names.forEach((name) => {
        const request = indexedDB.deleteDatabase(name);
        const finish = () => { done++; if (done === names.length) resolve(); };
        request.onsuccess = finish; request.onerror = finish; request.onblocked = finish;
      });
    });
  });
  await page.reload();
});

test('@claim:sample-demo opens an immediately usable three-stop sample reader', async ({ page }) => {
  await expect(page.getByRole('link', { name: /Try it with sample data/ })).toBeVisible();
  await page.getByRole('link', { name: /Try it with sample data/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Stop 1 of 3')).toBeVisible();
  await expect(page.getByText('A three-stop reset between meetings')).toBeVisible();
  await page.getByRole('button', { name: /One stop ahead/ }).click();
  await expect(page.getByText('A useful pause is small enough to keep.')).toBeVisible();
});

test('@claim:demo-isolation keeps demo changes out of real storage and discards them', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Write a note' }).click();
  await page.getByLabel('One-line note for paragraph 1').fill('Only in the demo.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Only in the demo.')).toBeVisible();
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Only in the demo.')).toHaveCount(0);
  const namespaces = await page.evaluate(async () => {
    const read = (name: string) => new Promise<number>((resolve) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' });
      request.onsuccess = () => { const tx = request.result.transaction('documents'); const count = tx.objectStore('documents').count(); count.onsuccess = () => resolve(Number(count.result)); };
      request.onerror = () => resolve(-1);
    });
    return { real: await read('reading-sprint-rail'), demo: await read('demo:reading-sprint-rail') };
  });
  expect(namespaces).toEqual({ real: 0, demo: 0 });
});

test('@claim:local-reading-data sends no reading data off-origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Write a note' }).click();
  await page.getByLabel('One-line note for paragraph 1').fill('Saved locally.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Saved locally.')).toBeVisible();
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});

test('@claim:offline-reading reloads the seeded demo after the first visit', async ({ page, context }) => {
  await page.goto('/demo');
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller?.state === 'activated';
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline — your reading and notes still work.')).toBeVisible();
  await expect(page.getByText('Stop 1 of 3')).toBeVisible();
});

test('@claim:json-export includes the current document, position, notes, and settings', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Shelf', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data' }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8')) as { version: number; documents: Array<{ title: string; currentIndex: number; notes: unknown[] }>; settings: unknown };
  expect(exported.version).toBe(1);
  expect(exported.documents).toHaveLength(1);
  expect(exported.documents[0]).toMatchObject({ title: 'A three-stop reset between meetings', currentIndex: 0 });
  expect(exported.documents[0].notes).toHaveLength(1);
  expect(exported.settings).toBeTruthy();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-data').setInputFiles({ name: 'rail-export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await expect(page.getByText('Shelf restored from export.')).toBeVisible();
});

test('creates a route, moves by keyboard, attaches a note, and resumes', async ({ page }) => {
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByLabel('Title').fill('A bounded test');
  await page.getByLabel('Article or chapter text').fill(passage);
  await page.getByRole('button', { name: /Start at the first paragraph/ }).click();
  await expect(page.getByText('Stop 1 of 3')).toBeVisible();
  await page.locator('.current-stop').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Stop 2 of 3')).toBeVisible();
  await page.getByLabel('One-line note for paragraph 2').fill('Return to this idea.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Return to this idea.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Shelf/ }).first().click();
  await expect(page.getByText('Stop 2 of 3 · 1 note')).toBeVisible();
});

test('reading preferences change the rail and persist', async ({ page }) => {
  await page.getByLabel('Title').fill('Settings test');
  await page.getByLabel('Article or chapter text').fill(passage);
  await page.getByRole('button', { name: /Start at the first paragraph/ }).click();
  await page.getByRole('button', { name: 'Reading settings' }).click();
  await page.locator('input[name="fontSize"]').fill('28');
  await page.getByText('Word cue', { exact: true }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('html')).toHaveCSS('--reader-size', '28px');
  await expect(page.getByRole('button', { name: 'Run word cue' })).toBeVisible();
});

test('opens a valid EPUB into a reading route', async ({ page }) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('EPUB/package.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>A Local EPUB</dc:title></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>');
  zip.file('EPUB/chapter.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter one</h1><p>The EPUB paragraph stays entirely on this device.</p><p>A second EPUB stop is ready.</p></body></html>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  await page.getByLabel('Open an EPUB').setInputFiles({ name: 'local.epub', mimeType: 'application/epub+zip', buffer });
  await expect(page.getByText('The EPUB paragraph stays entirely on this device.')).toBeVisible();
  await expect(page.getByText('Stop 1 of 3')).toBeVisible();
});

test('gives a plain recovery message for a broken EPUB', async ({ page }) => {
  await page.getByLabel('Open an EPUB').setInputFiles({ name: 'broken.epub', mimeType: 'application/epub+zip', buffer: Buffer.from('not a zip') });
  await expect(page.getByText('This file is not a readable EPUB. Choose a standard .epub file and try again.')).toBeVisible();
  await expect(page.getByText(/end of central directory/i)).toHaveCount(0);
});

test('legal pages and the 390px layout are usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).toHaveCSS('overflow-x', 'visible');
  const width = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(width).toBe(true);
  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy is the default.' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
});

test('unknown routes show a designed not-found screen', async ({ page }) => {
  await page.goto('/not-a-real-route');
  await expect(page.getByRole('heading', { level: 1, name: 'This route does not exist.' })).toBeVisible();
  await expect(page).toHaveTitle('Page not found — Reading Sprint Rail');
});

test('app shell and saved reading work offline', async ({ page, context }) => {
  await page.getByLabel('Title').fill('Offline route');
  await page.getByLabel('Article or chapter text').fill(passage);
  await page.getByRole('button', { name: /Start at the first paragraph/ }).click();
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller?.state === 'activated';
  });
  await page.waitForFunction(async () => {
    const entryAssets = [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[rel="stylesheet"]')]
      .map((element) => element instanceof HTMLScriptElement ? element.src : element.href);
    return entryAssets.length > 0 && (await Promise.all(entryAssets.map((url) => caches.match(url)))).every(Boolean);
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline — your reading and notes still work.')).toBeVisible();
  await page.getByRole('button', { name: /Continue from stop/ }).click();
  await expect(page.getByText('The first paragraph makes a clear beginning')).toBeVisible();
});

test('home and reader have no serious accessibility violations', async ({ page }) => {
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await page.getByLabel('Title').fill('Accessible route');
  await page.getByLabel('Article or chapter text').fill(passage);
  await page.getByRole('button', { name: /Start at the first paragraph/ }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
});

test('dark reader has no serious accessibility violations', async ({ page }) => {
  await page.getByLabel('Title').fill('Dark contrast test');
  await page.getByLabel('Article or chapter text').fill(passage);
  await page.getByRole('button', { name: /Start at the first paragraph/ }).click();
  await page.getByRole('button', { name: 'Reading settings' }).click();
  await page.locator('input[name="theme"][value="dark"]').check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
});
