export function normalizeParagraphs(input: string): string[] {
  const clean = input.replace(/\r/g, '').replace(/[\t ]+/g, ' ').trim();
  if (!clean) return [];
  let parts = clean.split(/\n\s*\n+/).map((part) => part.replace(/\n/g, ' ').trim()).filter(Boolean);
  if (parts.length === 1 && parts[0].length > 700) {
    const sentences = parts[0].match(/[^.!?]+[.!?]+(?:[”"']+)?|[^.!?]+$/g) ?? [parts[0]];
    parts = [];
    let current = '';
    for (const sentence of sentences) {
      const next = `${current} ${sentence.trim()}`.trim();
      if (current && next.length > 420) { parts.push(current); current = sentence.trim(); }
      else current = next;
    }
    if (current) parts.push(current);
  }
  return parts.filter((part) => part.length > 0);
}

export function readingMinutes(paragraphs: string[], wpm = 200): number {
  const words = paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
}
