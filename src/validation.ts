import type { ReadingDocument, Settings } from './types';

export type ReadingSprintRailExport = {
  version: 1;
  exportedAt?: string;
  documents: ReadingDocument[];
  settings: Settings;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

export function isReadingDocument(value: unknown): value is ReadingDocument {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.title !== 'string'
    || (value.source !== 'paste' && value.source !== 'epub') || !isStringArray(value.paragraphs)
    || !Number.isSafeInteger(value.currentIndex) || !Array.isArray(value.notes) || !isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt)) return false;
  const paragraphs = value.paragraphs;
  const currentIndex = value.currentIndex as number;
  const notes = value.notes;
  if (currentIndex < 0 || currentIndex >= paragraphs.length) return false;

  return notes.every((note) => {
    if (!isRecord(note) || typeof note.id !== 'string' || !note.id || !Number.isSafeInteger(note.paragraph)
      || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 160 || !isFiniteNumber(note.createdAt)) return false;
    const paragraph = note.paragraph as number;
    return paragraph >= 0 && paragraph < paragraphs.length;
  });
}

export function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  return (value.theme === 'system' || value.theme === 'light' || value.theme === 'dark')
    && typeof value.contrast === 'boolean'
    && typeof value.reduceMotion === 'boolean'
    && (value.font === 'hyperlegible' || value.font === 'serif' || value.font === 'sans')
    && isFiniteNumber(value.fontSize) && value.fontSize >= 17 && value.fontSize <= 32
    && isFiniteNumber(value.lineHeight) && value.lineHeight >= 1.4 && value.lineHeight <= 2
    && typeof value.wordCue === 'boolean'
    && [120, 180, 240, 300].includes(value.wpm as number)
    && [5, 15, 25].includes(value.sprintMinutes as number)
    && [0, 5, 10].includes(value.breakMinutes as number);
}

/** Validate every imported field before an IndexedDB transaction is opened. */
export function parseReadingSprintRailExport(value: unknown): ReadingSprintRailExport | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.documents) || !isSettings(value.settings)
    || (value.exportedAt !== undefined && typeof value.exportedAt !== 'string')
    || !value.documents.every(isReadingDocument)) return null;
  return value as ReadingSprintRailExport;
}
