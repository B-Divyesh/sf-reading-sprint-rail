import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const passage = `The first paragraph makes a clear beginning and introduces the route.\n\nThe second paragraph keeps enough context to test movement between stops.\n\nThe third paragraph completes this short and deliberately bounded reading.`;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('reading-sprint-rail');
      request.onsuccess = () => resolve(); request.onerror = () => resolve(); request.onblocked = () => resolve();
    });
  });
  await page.reload();
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

test('legal pages and the 390px layout are usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).toHaveCSS('overflow-x', 'visible');
  const width = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(width).toBe(true);
  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy is the default.' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
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
