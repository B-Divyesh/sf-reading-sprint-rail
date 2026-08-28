import { describe, expect, it } from 'vitest';
import { shelfProgressSummary, upsertDocument } from '../../src/documents';
import type { ReadingDocument } from '../../src/types';

const first: ReadingDocument = {
  id: 'route',
  title: 'A route',
  source: 'paste',
  paragraphs: ['First.', 'Second.', 'Third.'],
  currentIndex: 0,
  notes: [],
  createdAt: 1,
  updatedAt: 1,
};

describe('shelf progress', () => {
  it('uses the latest saved position and note count rather than a stale shelf copy', () => {
    const saved = {
      ...first,
      currentIndex: 1,
      notes: [{ id: 'marker', paragraph: 1, text: 'Resume here.', createdAt: 2 }],
      updatedAt: 2,
    };

    const shelf = upsertDocument([first], saved);

    expect(shelfProgressSummary(shelf[0])).toBe('Stop 2 of 3 · 1 note');
    expect(shelf[0]).not.toBe(saved);
    expect(shelf[0].notes).not.toBe(saved.notes);
  });
});
