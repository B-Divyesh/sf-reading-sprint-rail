import { normalizeParagraphs } from './text';

type ZipArchive = Awaited<ReturnType<(typeof import('jszip'))['loadAsync']>>;

export async function parseEpub(file: File): Promise<{ title: string; paragraphs: string[] }> {
  let zip: ZipArchive;
  try {
    const { default: JSZip } = await import('jszip');
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error('This file is not a readable EPUB. Choose a standard .epub file and try again.');
  }
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('This EPUB has no container file. Try exporting it again.');
  const container = new DOMParser().parseFromString(await containerFile.async('text'), 'application/xml');
  const rootPath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!rootPath) throw new Error('This EPUB does not identify its reading content.');
  const packageFile = zip.file(rootPath);
  if (!packageFile) throw new Error('The EPUB package file could not be opened.');
  const packageDoc = new DOMParser().parseFromString(await packageFile.async('text'), 'application/xml');
  const title = packageDoc.querySelector('title')?.textContent?.trim() || file.name.replace(/\.epub$/i, '');
  const manifest = new Map<string, string>();
  packageDoc.querySelectorAll('manifest item').forEach((item) => {
    const id = item.getAttribute('id'); const href = item.getAttribute('href');
    if (id && href) manifest.set(id, href);
  });
  const directory = rootPath.includes('/') ? rootPath.slice(0, rootPath.lastIndexOf('/') + 1) : '';
  const paragraphs: string[] = [];
  for (const item of Array.from(packageDoc.querySelectorAll('spine itemref'))) {
    const href = manifest.get(item.getAttribute('idref') || '');
    if (!href) continue;
    const path = decodeURIComponent(directory + href.split('#')[0]);
    const content = zip.file(path);
    if (!content) continue;
    const doc = new DOMParser().parseFromString(await content.async('text'), 'application/xhtml+xml');
    const nodes = doc.querySelectorAll('h1,h2,h3,h4,p,li,blockquote');
    nodes.forEach((node) => {
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 1) paragraphs.push(...normalizeParagraphs(text));
    });
  }
  if (!paragraphs.length) throw new Error('No readable paragraphs were found in this EPUB.');
  return { title, paragraphs };
}
