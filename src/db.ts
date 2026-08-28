import type { ReadingDocument } from './types';
import { isReadingDocument } from './validation';

const DB_NAME = location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1'
  ? 'demo:reading-sprint-rail'
  : 'reading-sprint-rail';
const STORE = 'documents';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export type DocumentListResult = { documents: ReadingDocument[]; discarded: number };

export async function listDocumentsWithRecovery(): Promise<DocumentListResult> {
  const db = await openDb();
  const stored = await new Promise<unknown[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => reject(request.error);
  });
  const documents = stored.filter(isReadingDocument).sort((a, b) => b.updatedAt - a.updatedAt);
  const invalidIds = stored.filter((document): document is { id: IDBValidKey } => !isReadingDocument(document)
    && typeof (document as { id?: unknown }).id === 'string');
  if (invalidIds.length) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      invalidIds.forEach((document) => tx.objectStore(STORE).delete(document.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  return { documents, discarded: invalidIds.length };
}

export async function listDocuments(): Promise<ReadingDocument[]> {
  return (await listDocumentsWithRecovery()).documents;
}

export async function saveDocument(document: ReadingDocument): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(document);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function replaceAllDocuments(documents: ReadingDocument[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    documents.forEach((document) => store.put(document));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearDocuments(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
