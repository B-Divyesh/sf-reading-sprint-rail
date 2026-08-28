import { describe, expect, it } from 'vitest';
import { escapeHtml, normalizeParagraphs, readingMinutes } from '../../src/text';

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
