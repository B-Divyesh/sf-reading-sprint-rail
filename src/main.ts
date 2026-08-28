import './styles.css';
import { deleteDocument, listDocuments, replaceAllDocuments, saveDocument } from './db';
import { parseEpub } from './epub';
import { cachedUnlock, captureLicenseFromUrl, checkoutUrl, getLicense, storeLicense, verifyLicense } from './license';
import { escapeHtml, normalizeParagraphs, readingMinutes } from './text';
import { DEFAULT_SETTINGS, type ReadingDocument, type Settings } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
let documents: ReadingDocument[] = [];
let current: ReadingDocument | null = null;
let activeView: 'home' | 'reader' | 'shelf' = 'home';
let settings = loadSettings();
let unlocked = cachedUnlock();
let wordIndex = 0;
let wordPlaying = false;
let wordTimer: number | null = null;
let sprintSeconds = settings.sprintMinutes * 60;
let elapsedSeconds = 0;
let sprintRunning = false;
let sprintTimer: number | null = null;
let statusMessage = '';
let statusKind: 'ok' | 'error' = 'ok';

function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('rsr:settings') || '{}') }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function applySettings(): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.contrast = String(settings.contrast);
  root.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
  root.dataset.readerFont = settings.font;
  root.style.setProperty('--reader-size', `${settings.fontSize}px`);
  root.style.setProperty('--reader-leading', String(settings.lineHeight));
  localStorage.setItem('rsr:settings', JSON.stringify(settings));
}

function icon(name: 'route' | 'arrow-left' | 'arrow-right' | 'note' | 'settings' | 'books' | 'timer' | 'play' | 'pause'): string {
  const paths: Record<string, string> = {
    route: '<path d="M3 12h18M6 8v8M18 8v8"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/>',
    'arrow-left': '<path d="m15 18-6-6 6-6"/>', 'arrow-right': '<path d="m9 18 6-6-6-6"/>',
    note: '<path d="M5 4h14v12H9l-4 4V4Z"/><path d="M8 8h8M8 12h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    books: '<path d="M4 5h5v14H4zM9 7h5v12H9zM15 4l4-1 2 15-4 1z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    play: '<path d="m9 7 8 5-8 5V7Z"/>', pause: '<path d="M9 7v10M15 7v10"/>',
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function shell(content: string, page: 'app' | 'legal' = 'app'): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" data-home aria-label="Reading Sprint Rail home"><span class="brand-mark">${icon('route')}</span><span>Reading Sprint Rail</span></a>
      <nav aria-label="Primary">
        ${page === 'app' ? `<button class="quiet-button" data-shelf>${icon('books')}<span class="nav-label">Shelf</span><span class="count">${documents.length}</span></button><button class="icon-button" data-settings aria-label="Reading settings">${icon('settings')}</button>` : '<a href="/">Open the reader</a>'}
      </nav>
    </header>
    <div class="connection-banner" data-offline hidden role="status">Offline — your reading and notes still work.</div>
    ${content}
    <footer class="site-footer"><span>Local first. No feeds, tracking, or cloud account.</span><span><a href="/privacy" data-route>Privacy</a> · <a href="/terms" data-route>Terms</a> · Hero artwork generated for this product.</span></footer>
    <div class="toast" data-toast role="status" aria-live="polite" hidden></div>
    ${page === 'app' ? dialogs() : ''}`;
}

function homeView(): string {
  const recent = documents[0];
  return shell(`<main id="main" class="home-main">
    <section class="hero-copy" aria-labelledby="page-title">
      <div class="eyebrow"><span class="station-dot"></span> One paragraph. One place.</div>
      <h1 id="page-title">Keep the thread.<br><span>Finish the piece.</span></h1>
      <p class="lede">A quiet, offline rail for articles and EPUB chapters. Read one adjustable paragraph at a time, take notes where they belong, and return to the exact stop.</p>
      ${recent ? `<button class="resume-route" data-open-doc="${recent.id}"><span><small>Continue from stop ${recent.currentIndex + 1} of ${recent.paragraphs.length}</small><strong>${escapeHtml(recent.title)}</strong></span>${icon('arrow-right')}</button>` : ''}
      <div class="privacy-line"><span>✓ Stays on this device</span><span>✓ Works offline</span><span>✓ No streaks</span></div>
    </section>
    <section class="import-panel" aria-labelledby="import-title">
      <div class="route-art"><picture><source srcset="/assets/rail-landscape-768.webp 768w, /assets/rail-landscape.webp 1200w" sizes="(max-width: 800px) 100vw, 53vw" type="image/webp"><img src="/assets/rail-landscape.png" width="768" height="512" alt="Abstract paper reading route with a coral paragraph resting on a green rail" fetchpriority="high" decoding="async"></picture><div class="art-caption">A finite route, not an endless feed.</div></div>
      <div class="import-form-wrap">
        <div class="section-heading"><span class="step-number">01</span><div><h2 id="import-title">Lay down a reading route</h2><p>Paste an article or open an EPUB. Nothing leaves your device.</p></div></div>
        <form id="paste-form">
          <label for="document-title">Title</label>
          <input id="document-title" name="title" maxlength="100" autocomplete="off" placeholder="The piece I want to finish">
          <label for="reading-text">Article or chapter text</label>
          <textarea id="reading-text" name="text" rows="7" required aria-describedby="import-help" placeholder="Paste text here. Paragraph breaks become stops on your rail."></textarea>
          <div id="import-help" class="form-help">Long unbroken text is gently divided into readable stops.</div>
          <button class="primary-button" type="submit">Start at the first paragraph ${icon('arrow-right')}</button>
        </form>
        <div class="or-divider"><span>or</span></div>
        <label class="file-button" for="epub-file"><span><strong>Open an EPUB</strong><small>Text-only extraction, up to 25 MB</small></span><span aria-hidden="true">.epub</span></label>
        <input class="visually-hidden" id="epub-file" type="file" accept=".epub,application/epub+zip">
        <p class="form-status ${statusKind}" role="status" aria-live="polite">${escapeHtml(statusMessage)}</p>
      </div>
    </section>
    <section class="how-it-works" aria-labelledby="how-title"><div><span class="step-number">02</span><h2 id="how-title">Travel a bounded rail</h2></div><ol><li><strong>See just enough.</strong><span>The current paragraph stays clear; its neighbors keep context without competing.</span></li><li><strong>Set your cadence.</strong><span>Choose type, size, a word cue, and optional micro-breaks.</span></li><li><strong>Leave a marker.</strong><span>One-line notes remain attached to the paragraph that prompted them.</span></li></ol></section>
  </main>`);
}

function currentParagraphHtml(): string {
  if (!current) return '';
  const text = current.paragraphs[current.currentIndex];
  if (!settings.wordCue) return escapeHtml(text);
  return text.split(/(\s+)/).map((word, index) => {
    if (/^\s+$/.test(word)) return word;
    const logical = text.split(/(\s+)/).slice(0, index).filter((part) => part && !/^\s+$/.test(part)).length;
    return `<span class="word ${logical === wordIndex ? 'word-active' : ''}">${escapeHtml(word)}</span>`;
  }).join('');
}

function readerView(): string {
  if (!current) return homeView();
  const index = current.currentIndex;
  const percentage = Math.round(((index + 1) / current.paragraphs.length) * 100);
  const notes = current.notes.filter((note) => note.paragraph === index);
  const time = `${String(Math.floor(sprintSeconds / 60)).padStart(2, '0')}:${String(sprintSeconds % 60).padStart(2, '0')}`;
  return shell(`<main id="main" class="reader-main">
    <div class="reader-topline">
      <button class="back-button" data-shelf>${icon('arrow-left')} Shelf</button>
      <div class="document-identity"><span>Reading now</span><h1 class="sr-only">Reading Sprint Rail</h1><h2>${escapeHtml(current.title)}</h2></div>
      <div class="session-control"><span class="session-time" aria-label="${time} remaining">${time}</span><button class="compact-button" data-sprint>${icon(sprintRunning ? 'pause' : 'play')} ${sprintRunning ? 'Pause' : elapsedSeconds ? 'Resume' : 'Start sprint'}</button></div>
    </div>
    <div class="progress-row"><span>Stop ${index + 1} of ${current.paragraphs.length}</span><div class="progress-track" role="progressbar" aria-label="Document progress" aria-valuemin="1" aria-valuemax="${current.paragraphs.length}" aria-valuenow="${index + 1}"><span style="width:${percentage}%"></span><i style="left:${percentage}%"></i></div><span>${percentage}%</span></div>
    <section class="rail-stage" aria-label="Paragraph rail">
      <div class="rail-line" aria-hidden="true"></div>
      <div class="neighbor previous" aria-hidden="true">${index > 0 ? escapeHtml(current.paragraphs[index - 1]) : 'Start of route'}</div>
      <article class="current-stop" tabindex="0" aria-label="Current paragraph, ${index + 1} of ${current.paragraphs.length}"><span class="stop-tab" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><p>${currentParagraphHtml()}</p></article>
      <div class="neighbor next" aria-hidden="true">${index < current.paragraphs.length - 1 ? escapeHtml(current.paragraphs[index + 1]) : 'End of route'}</div>
    </section>
    <div class="reader-controls" aria-label="Reading navigation">
      <button class="nav-button" data-prev ${index === 0 ? 'disabled' : ''}>${icon('arrow-left')}<span><small>Previous</small><strong>One stop back</strong></span></button>
      ${settings.wordCue ? `<button class="cue-button" data-word-play>${icon(wordPlaying ? 'pause' : 'play')} ${wordPlaying ? 'Pause word cue' : 'Run word cue'}</button>` : '<span class="keyboard-hint">Use ← and → to move</span>'}
      <button class="nav-button next" data-next ${index === current.paragraphs.length - 1 ? 'disabled' : ''}><span><small>Next</small><strong>${index === current.paragraphs.length - 2 ? 'Finish route' : 'One stop ahead'}</strong></span>${icon('arrow-right')}</button>
    </div>
    <section class="notes-dock" aria-labelledby="notes-title"><div class="notes-head"><div><span class="step-number">${icon('note')}</span><div><h2 id="notes-title">Notes at this stop</h2><p>${notes.length ? `${notes.length} saved here` : 'Capture the thought without leaving the page.'}</p></div></div><button class="compact-button" data-focus-note>Write a note</button></div>
      <form id="note-form" class="note-form"><label class="sr-only" for="note-text">One-line note for paragraph ${index + 1}</label><input id="note-text" maxlength="160" required placeholder="One thought, question, or phrase…"><button type="submit" class="primary-button">Save note</button></form>
      <ul class="note-list">${notes.map((note) => `<li><span>${escapeHtml(note.text)}</span><button data-delete-note="${note.id}" aria-label="Delete note: ${escapeHtml(note.text)}">Delete</button></li>`).join('')}</ul>
    </section>
  </main>`);
}

function shelfView(): string {
  return shell(`<main id="main" class="shelf-main"><div class="shelf-heading"><div><span class="eyebrow"><span class="station-dot"></span> Your routes</span><h1>Return without searching.</h1><p>Every route remembers its paragraph and attached notes on this device.</p></div><button class="primary-button" data-new-route>New reading route</button></div>
    ${documents.length ? `<ul class="document-list">${documents.map((doc) => { const pct = Math.round(((doc.currentIndex + 1) / doc.paragraphs.length) * 100); return `<li><button class="document-open" data-open-doc="${doc.id}"><span class="doc-source">${doc.source === 'epub' ? 'EPUB' : 'PASTED TEXT'}</span><strong>${escapeHtml(doc.title)}</strong><span>Stop ${doc.currentIndex + 1} of ${doc.paragraphs.length} · ${doc.notes.length} ${doc.notes.length === 1 ? 'note' : 'notes'}</span><i><b style="width:${pct}%"></b></i></button><button class="delete-doc" data-delete-doc="${doc.id}" aria-label="Delete ${escapeHtml(doc.title)}">Delete</button></li>`; }).join('')}</ul>` : `<div class="empty-state"><span>${icon('route')}</span><h2>No routes yet</h2><p>Paste an article or open an EPUB to create your first bounded reading rail.</p><button class="primary-button" data-new-route>Create a route</button></div>`}
    <section class="data-tools" aria-labelledby="data-title"><div><h2 id="data-title">Your data, in your hands</h2><p>Export documents, reading positions, and notes as JSON, or restore them on another device.</p></div><div><button class="outline-button" data-export>Export data</button><label class="outline-button" for="import-data">Import data</label><input class="visually-hidden" id="import-data" type="file" accept="application/json,.json"></div></section>
    <section class="unlock-panel" aria-labelledby="unlock-title"><div><span class="eyebrow">${unlocked ? 'Rail Pass active' : 'Optional Rail Pass'}</span><h2 id="unlock-title">${unlocked ? 'Unlimited shelf unlocked.' : 'Keep more routes ready.'}</h2><p>${unlocked ? 'Thank you for supporting a focused, tracker-free tool.' : 'The free shelf holds 3 documents. A ₹499 one-time Rail Pass unlocks unlimited documents and future visual presets. Reading controls, notes, breaks, and export stay free.'}</p></div>${unlocked ? '<span class="license-active">✓ Licensed on this device</span>' : `<div class="unlock-actions"><a class="primary-button" href="${checkoutUrl}">Buy once — ₹499</a><button class="quiet-button" data-restore>Restore a license</button></div>`}</section>
  </main>`);
}

function legalView(kind: 'privacy' | 'terms'): string {
  const privacy = `<main id="main" class="legal-main"><div class="eyebrow">Plain-language policy · 28 August 2026</div><h1>Privacy is the default.</h1><p class="lede">Reading Sprint Rail does not need an account and does not send your documents, notes, positions, or settings to us.</p><h2>What stays on your device</h2><p>Imported text, extracted EPUB text, reading positions, notes, and preferences are stored in your browser using IndexedDB and local storage. You can export or delete them from the Shelf. Clearing site data also removes them.</p><h2>License checks</h2><p>If you buy or restore a Rail Pass, the license token is stored in your browser and sent to the Sociobot billing API only to verify that unlock. Sociobot/Dodo is the merchant of record and handles checkout information under its own policies. Your reading content is never included.</p><h2>Network and measurement</h2><p>The installed app works offline after its first load. We include no advertising, behavioral analytics, third-party fonts, tracking pixels, or social SDKs. The hosting platform may retain short-lived security logs and a privacy-respecting aggregate page count.</p><h2>Your choices</h2><p>Use “Export data” before moving browsers. Use each document’s Delete control or clear this site’s browser storage to erase local data. Questions can be sent to <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p></main>`;
  const terms = `<main id="main" class="legal-main"><div class="eyebrow">Fair-use terms · 28 August 2026</div><h1>Terms for a quiet reading tool.</h1><p class="lede">Reading Sprint Rail is a personal reading utility, not a medical device, diagnostic service, or promise of a particular outcome.</p><h2>Using the product</h2><p>You may use the app to read material you are permitted to access. You remain responsible for copyright and for any text or EPUB you import. The app extracts text locally and does not bypass access controls.</p><h2>Free and paid access</h2><p>The free version includes the core reader, three saved documents, notes, accessibility settings, breaks, and export. The ₹499 Rail Pass is a one-time purchase that unlocks unlimited saved documents and future visual presets for this product. Sociobot/Dodo is the merchant of record. Refunds are handled there; a refunded or revoked license stops unlocking paid features.</p><h2>Availability and warranty</h2><p>The product is provided “as is” without guarantees of uninterrupted availability or fitness for a particular purpose. Keep exports of anything important. To the extent allowed by law, liability is limited to the amount you paid for the product.</p><h2>Changes and contact</h2><p>Material changes will be dated on this page. Questions about purchases or these terms can be sent to <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p></main>`;
  return shell(kind === 'privacy' ? privacy : terms, 'legal');
}

function dialogs(): string {
  return `<dialog id="settings-dialog"><form method="dialog" class="dialog-shell"><div class="dialog-head"><div><span class="eyebrow">Tune the reading field</span><h2>Reading settings</h2></div><button class="icon-button" value="cancel" aria-label="Close settings">×</button></div><div class="settings-grid">
    <label>Reading type<select name="font"><option value="hyperlegible">Hyperlegible</option><option value="serif">Book serif</option><option value="sans">Clean sans</option></select></label>
    <label>Text size <output data-size-output>${settings.fontSize}px</output><input name="fontSize" type="range" min="17" max="32" value="${settings.fontSize}"></label>
    <label>Line spacing <output data-leading-output>${settings.lineHeight.toFixed(2)}</output><input name="lineHeight" type="range" min="1.4" max="2" step="0.05" value="${settings.lineHeight}"></label>
    <label>Sprint length<select name="sprintMinutes"><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="25">25 minutes</option></select></label>
    <label>Micro-breaks<select name="breakMinutes"><option value="0">Off</option><option value="5">Every 5 minutes</option><option value="10">Every 10 minutes</option></select></label>
    <label>Word cue speed<select name="wpm"><option value="120">120 words/min</option><option value="180">180 words/min</option><option value="240">240 words/min</option><option value="300">300 words/min</option></select></label>
    <label class="toggle"><span><strong>Word cue</strong><small>Move a calm highlight through each paragraph</small></span><input name="wordCue" type="checkbox" ${settings.wordCue ? 'checked' : ''}></label>
    <label class="toggle"><span><strong>High contrast</strong><small>Sharper edges and stronger separation</small></span><input name="contrast" type="checkbox" ${settings.contrast ? 'checked' : ''}></label>
    <label class="toggle"><span><strong>Reduce motion</strong><small>Remove sliding transitions</small></span><input name="reduceMotion" type="checkbox" ${settings.reduceMotion ? 'checked' : ''}></label>
    <fieldset><legend>Appearance</legend><label><input type="radio" name="theme" value="system"> System</label><label><input type="radio" name="theme" value="light"> Light</label><label><input type="radio" name="theme" value="dark"> Dark</label></fieldset>
  </div><div class="dialog-actions"><button class="primary-button" value="save">Save settings</button></div></form></dialog>
  <dialog id="break-dialog"><div class="break-dialog"><div class="break-geometry" aria-hidden="true"><i></i><i></i><i></i></div><span class="eyebrow">A small pause</span><h2>Let the paragraph settle.</h2><p>Look away, drop your shoulders, or simply sit for a moment. Continue whenever you are ready.</p><button class="primary-button" data-end-break>Return to the rail</button></div></dialog>
  <dialog id="restore-dialog"><form method="dialog" id="restore-form" class="dialog-shell"><div class="dialog-head"><div><span class="eyebrow">Rail Pass</span><h2>Restore your purchase</h2></div><button class="icon-button" value="cancel" aria-label="Close">×</button></div><label for="license-token">License token</label><textarea id="license-token" rows="3" required autocomplete="off" placeholder="Paste the token from your receipt"></textarea><p class="form-help">Verification uses the Sociobot billing service. It never receives your documents or notes.</p><div class="dialog-actions"><button class="primary-button" value="verify">Verify license</button></div></form></dialog>`;
}

function render(): void {
  stopWordCue();
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/privacy') app.innerHTML = legalView('privacy');
  else if (path === '/terms') app.innerHTML = legalView('terms');
  else if (activeView === 'reader') app.innerHTML = readerView();
  else if (activeView === 'shelf') app.innerHTML = shelfView();
  else app.innerHTML = homeView();
  applySettings(); bindEvents(); updateConnection();
}

function setStatus(message: string, kind: 'ok' | 'error' = 'ok'): void { statusMessage = message; statusKind = kind; render(); }
function toast(message: string): void { const el = document.querySelector<HTMLElement>('[data-toast]'); if (!el) return; el.textContent = message; el.hidden = false; window.setTimeout(() => { el.hidden = true; }, 4200); }

async function createDocument(title: string, paragraphs: string[], source: 'paste' | 'epub'): Promise<void> {
  if (!unlocked && documents.length >= 3) { activeView = 'shelf'; render(); toast('The free shelf holds 3 routes. Delete one or unlock unlimited routes.'); return; }
  const now = Date.now();
  current = { id: crypto.randomUUID(), title: title.trim() || 'Untitled reading', source, paragraphs, currentIndex: 0, notes: [], createdAt: now, updatedAt: now };
  await saveDocument(current); documents = await listDocuments(); activeView = 'reader'; sprintSeconds = settings.sprintMinutes * 60; elapsedSeconds = 0; render();
}

async function persistCurrent(): Promise<void> { if (!current) return; current.updatedAt = Date.now(); await saveDocument(current); documents = await listDocuments(); }

function moveParagraph(direction: -1 | 1): void {
  if (!current) return;
  const next = Math.max(0, Math.min(current.paragraphs.length - 1, current.currentIndex + direction));
  if (next === current.currentIndex) return;
  current.currentIndex = next; wordIndex = 0; void persistCurrent(); render();
  requestAnimationFrame(() => document.querySelector<HTMLElement>('.current-stop')?.focus({ preventScroll: true }));
}

function startWordCue(): void {
  if (!current || !settings.wordCue) return;
  wordPlaying = true;
  const button = document.querySelector<HTMLButtonElement>('[data-word-play]');
  if (button) button.innerHTML = `${icon('pause')} Pause word cue`;
  const step = () => {
    if (!current || !wordPlaying) return;
    const words = current.paragraphs[current.currentIndex].trim().split(/\s+/);
    if (wordIndex >= words.length - 1) {
      if (current.currentIndex < current.paragraphs.length - 1) { current.currentIndex++; wordIndex = 0; void persistCurrent(); render(); startWordCue(); }
      else { stopWordCue(); render(); toast('You reached the end of this route.'); }
      return;
    }
    wordIndex++; const paragraph = document.querySelector('.current-stop p'); if (paragraph) paragraph.innerHTML = currentParagraphHtml();
    wordTimer = window.setTimeout(step, 60_000 / settings.wpm);
  };
  wordTimer = window.setTimeout(step, 60_000 / settings.wpm);
}

function stopWordCue(): void { wordPlaying = false; if (wordTimer) window.clearTimeout(wordTimer); wordTimer = null; }

function toggleSprint(): void {
  sprintRunning = !sprintRunning;
  if (sprintRunning) {
    sprintTimer = window.setInterval(() => {
      sprintSeconds--; elapsedSeconds++;
      const time = document.querySelector<HTMLElement>('.session-time');
      if (time) { const value = `${String(Math.floor(sprintSeconds / 60)).padStart(2, '0')}:${String(sprintSeconds % 60).padStart(2, '0')}`; time.textContent = value; time.setAttribute('aria-label', `${value} remaining`); }
      if (settings.breakMinutes && elapsedSeconds % (settings.breakMinutes * 60) === 0 && sprintSeconds > 0) { pauseSprint(); (document.querySelector('#break-dialog') as HTMLDialogElement)?.showModal(); }
      if (sprintSeconds <= 0) { pauseSprint(); sprintSeconds = 0; render(); toast('Sprint complete. Your place is saved.'); }
    }, 1000);
  } else pauseSprint();
  render();
}

function pauseSprint(): void { sprintRunning = false; if (sprintTimer) window.clearInterval(sprintTimer); sprintTimer = null; }

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); history.pushState({}, '', (link as HTMLAnchorElement).href); render(); window.scrollTo(0, 0); }));
  document.querySelectorAll<HTMLElement>('[data-home]').forEach((el) => el.addEventListener('click', (event) => { event.preventDefault(); history.pushState({}, '', '/'); activeView = 'home'; render(); }));
  document.querySelectorAll<HTMLElement>('[data-shelf]').forEach((el) => el.addEventListener('click', () => { history.pushState({}, '', '/'); activeView = 'shelf'; render(); }));
  document.querySelectorAll<HTMLElement>('[data-new-route]').forEach((el) => el.addEventListener('click', () => { activeView = 'home'; statusMessage = ''; render(); }));
  document.querySelectorAll<HTMLElement>('[data-open-doc]').forEach((el) => el.addEventListener('click', () => { current = documents.find((doc) => doc.id === el.dataset.openDoc) || null; activeView = current ? 'reader' : 'home'; render(); }));
  document.querySelector('[data-prev]')?.addEventListener('click', () => moveParagraph(-1));
  document.querySelector('[data-next]')?.addEventListener('click', () => moveParagraph(1));
  document.querySelector('[data-sprint]')?.addEventListener('click', toggleSprint);
  document.querySelector('[data-word-play]')?.addEventListener('click', () => wordPlaying ? (stopWordCue(), render()) : startWordCue());
  document.querySelector('[data-focus-note]')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#note-text')?.focus());

  const pasteForm = document.querySelector<HTMLFormElement>('#paste-form');
  pasteForm?.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(pasteForm); const paragraphs = normalizeParagraphs(String(data.get('text') || ''));
    if (!paragraphs.length) { setStatus('Paste at least one paragraph to begin.', 'error'); return; }
    await createDocument(String(data.get('title') || ''), paragraphs, 'paste');
  });
  document.querySelector<HTMLInputElement>('#epub-file')?.addEventListener('change', async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setStatus('That EPUB is over 25 MB. Choose a smaller file.', 'error'); return; }
    setStatus('Opening the EPUB on this device…');
    try { const parsed = await parseEpub(file); await createDocument(parsed.title, parsed.paragraphs, 'epub'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'The EPUB could not be opened.', 'error'); }
  });
  const noteForm = document.querySelector<HTMLFormElement>('#note-form');
  noteForm?.addEventListener('submit', async (event) => { event.preventDefault(); if (!current) return; const input = noteForm.querySelector<HTMLInputElement>('input')!; const text = input.value.trim(); if (!text) return; current.notes.push({ id: crypto.randomUUID(), paragraph: current.currentIndex, text, createdAt: Date.now() }); await persistCurrent(); render(); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#note-text')?.focus()); });
  document.querySelectorAll<HTMLButtonElement>('[data-delete-note]').forEach((button) => button.addEventListener('click', async () => { if (!current || !confirm('Delete this note from the current paragraph?')) return; current.notes = current.notes.filter((note) => note.id !== button.dataset.deleteNote); await persistCurrent(); render(); toast('Note deleted.'); }));
  document.querySelectorAll<HTMLButtonElement>('[data-delete-doc]').forEach((button) => button.addEventListener('click', async () => { const doc = documents.find((item) => item.id === button.dataset.deleteDoc); if (!doc || !confirm(`Delete “${doc.title}” and its notes from this device?`)) return; await deleteDocument(doc.id); documents = await listDocuments(); if (current?.id === doc.id) current = null; render(); toast('Reading route deleted.'); }));

  document.querySelector('[data-export]')?.addEventListener('click', () => { const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), documents, settings }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `reading-sprint-rail-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); toast('Data export downloaded.'); });
  document.querySelector<HTMLInputElement>('#import-data')?.addEventListener('change', async (event) => { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (!Array.isArray(data.documents) || data.version !== 1) throw new Error(); if (!confirm(`Replace this device’s shelf with ${data.documents.length} imported routes?`)) return; await replaceAllDocuments(data.documents); documents = await listDocuments(); if (data.settings) settings = { ...DEFAULT_SETTINGS, ...data.settings }; applySettings(); render(); toast('Shelf restored from export.'); } catch { toast('That file is not a valid Reading Sprint Rail export.'); } });

  const settingsDialog = document.querySelector<HTMLDialogElement>('#settings-dialog');
  document.querySelector('[data-settings]')?.addEventListener('click', () => { if (!settingsDialog) return; const form = settingsDialog.querySelector<HTMLFormElement>('form')!; (form.elements.namedItem('font') as HTMLSelectElement).value = settings.font; (form.elements.namedItem('theme') as RadioNodeList).value = settings.theme; (form.elements.namedItem('sprintMinutes') as HTMLSelectElement).value = String(settings.sprintMinutes); (form.elements.namedItem('breakMinutes') as HTMLSelectElement).value = String(settings.breakMinutes); (form.elements.namedItem('wpm') as HTMLSelectElement).value = String(settings.wpm); settingsDialog.showModal(); });
  settingsDialog?.querySelector<HTMLInputElement>('[name=fontSize]')?.addEventListener('input', (event) => { settingsDialog.querySelector('[data-size-output]')!.textContent = `${(event.currentTarget as HTMLInputElement).value}px`; });
  settingsDialog?.querySelector<HTMLInputElement>('[name=lineHeight]')?.addEventListener('input', (event) => { settingsDialog.querySelector('[data-leading-output]')!.textContent = Number((event.currentTarget as HTMLInputElement).value).toFixed(2); });
  settingsDialog?.addEventListener('close', () => { if (settingsDialog.returnValue !== 'save') return; const form = settingsDialog.querySelector<HTMLFormElement>('form')!; const data = new FormData(form); settings = { ...settings, font: data.get('font') as Settings['font'], theme: data.get('theme') as Settings['theme'], fontSize: Number(data.get('fontSize')), lineHeight: Number(data.get('lineHeight')), sprintMinutes: Number(data.get('sprintMinutes')), breakMinutes: Number(data.get('breakMinutes')), wpm: Number(data.get('wpm')), wordCue: data.has('wordCue'), contrast: data.has('contrast'), reduceMotion: data.has('reduceMotion') }; sprintSeconds = settings.sprintMinutes * 60; elapsedSeconds = 0; applySettings(); render(); toast('Reading settings saved.'); });
  document.querySelector('[data-end-break]')?.addEventListener('click', () => { (document.querySelector('#break-dialog') as HTMLDialogElement).close(); toggleSprint(); });
  const restoreDialog = document.querySelector<HTMLDialogElement>('#restore-dialog');
  document.querySelector('[data-restore]')?.addEventListener('click', () => restoreDialog?.showModal());
  restoreDialog?.addEventListener('close', async () => { if (restoreDialog.returnValue !== 'verify') return; const token = restoreDialog.querySelector<HTMLTextAreaElement>('#license-token')?.value.trim(); if (!token) return; storeLicense(token); toast('Checking this license…'); try { const result = await verifyLicense(true); unlocked = result.valid; render(); toast(result.valid ? 'Rail Pass restored.' : 'That license is not active. Check the token and try again.'); } catch { render(); toast('License check unavailable. Your free reader still works.'); } });
}

function updateConnection(): void { const banner = document.querySelector<HTMLElement>('[data-offline]'); if (banner) banner.hidden = navigator.onLine; }

function keyboardNavigation(event: KeyboardEvent): void {
  if (activeView !== 'reader' || document.querySelector('dialog[open]')) return;
  const target = event.target as HTMLElement;
  if (target.matches('input,textarea,select,button,a')) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveParagraph(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveParagraph(1); }
  if (event.key.toLowerCase() === 'n') { event.preventDefault(); document.querySelector<HTMLInputElement>('#note-text')?.focus(); }
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) { toast('An update is ready. Reload to use it.'); } }); });
    await navigator.serviceWorker.ready;
  } catch { /* The app remains usable without installation support. */ }
}

async function init(): Promise<void> {
  captureLicenseFromUrl(); applySettings();
  try { documents = await listDocuments(); } catch { statusMessage = 'Local storage is unavailable. You can read now, but this browser may not save your place.'; statusKind = 'error'; }
  const latest = documents[0]; if (latest) current = latest;
  render();
  if (getLicense()) { try { const result = await verifyLicense(); unlocked = result.valid; if (!result.valid) toast('Rail Pass license is no longer active.'); render(); } catch { /* use cached verdict offline */ } }
  void registerServiceWorker();
}

window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection); window.addEventListener('popstate', render); window.addEventListener('keydown', keyboardNavigation);
void init();
