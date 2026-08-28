import { describe, expect, it } from 'vitest';
import { escapeHtml, normalizeParagraphs, readingMinutes } from '../../src/text';
import { parseReadingSprintRailExport } from '../../src/validation';

describe('text preparation', () => {
  it('preserves intentional paragraph stops', () => {
    expect(normalizeParagraphs('First line.\n\nSecond\nline.')).toEqual(['First line.', 'Second line.']);
  });

  it('divides very long unbroken text without losing its ending', () => {
    const input = Array.from({ length: 30 }, (_, index) => `Sentence ${index} has enough words to make a useful passage.`).join(' ');
    const result = normalizeParagraphs(input);
    expect(result.length).toBeGreaterThan(1);
    expect(result.join(' ')).toContain('Sentence 29');
  });

  it('estimates reading time and safely escapes imported markup', () => {
    expect(readingMinutes([Array(401).fill('word').join(' ')], 200)).toBe(3);
    expect(escapeHtml('<img onerror="bad">')).toBe('&lt;img onerror=&quot;bad&quot;&gt;');
  });
});

describe('export schema', () => {
  const valid = {
    version: 1,
    documents: [{ id: 'route-1', title: 'A route', source: 'paste', paragraphs: ['One paragraph.'], currentIndex: 0, notes: [], createdAt: 1, updatedAt: 1 }],
    settings: { theme: 'system', contrast: false, reduceMotion: false, font: 'hyperlegible', fontSize: 22, lineHeight: 1.65, wordCue: false, wpm: 180, sprintMinutes: 15, breakMinutes: 5 },
  };

  it('accepts a complete export and rejects malformed document data before persistence', () => {
    expect(parseReadingSprintRailExport(valid)).not.toBeNull();
    expect(parseReadingSprintRailExport({ ...valid, documents: [{ ...valid.documents[0], paragraphs: null }] })).toBeNull();
    expect(parseReadingSprintRailExport({ ...valid, settings: {} })).toBeNull();
    expect(parseReadingSprintRailExport({ ...valid, documents: [{ ...valid.documents[0], currentIndex: 1 }] })).toBeNull();
  });
});
