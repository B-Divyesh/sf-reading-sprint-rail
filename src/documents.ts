import type { ReadingDocument } from './types';

/**
 * Copy a document before it crosses an async boundary. IndexedDB snapshots a
 * value at `put` time, so sharing the mutable reader object can otherwise
 * allow rapid position and note changes to be saved out of order.
 */
export function copyDocument(document: ReadingDocument): ReadingDocument {
  return {
    ...document,
    paragraphs: [...document.paragraphs],
    notes: document.notes.map((note) => ({ ...note })),
  };
}

/** Keep the shelf's read model in step with the reader before storage settles. */
export function upsertDocument(documents: ReadingDocument[], updated: ReadingDocument): ReadingDocument[] {
  return [copyDocument(updated), ...documents.filter((document) => document.id !== updated.id)]
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

/** The one place that turns persisted reader state into a shelf progress label. */
export function shelfProgressSummary(document: ReadingDocument): string {
  const noteLabel = document.notes.length === 1 ? 'note' : 'notes';
  return `Stop ${document.currentIndex + 1} of ${document.paragraphs.length} · ${document.notes.length} ${noteLabel}`;
}
