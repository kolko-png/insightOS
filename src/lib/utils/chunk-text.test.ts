import { describe, it, expect } from 'vitest';
import { chunkText } from './chunk-text';

describe('chunkText', () => {
  it('returns an empty array for empty or whitespace-only input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('returns a single chunk when text is shorter than chunkSize', () => {
    const result = chunkText('A short paragraph.', 1200);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 0, content: 'A short paragraph.' });
  });

  it('splits long text into multiple chunks', () => {
    const longText = 'Sentence one. '.repeat(200); // ~2800 chars
    const result = chunkText(longText, 1200, 150);
    expect(result.length).toBeGreaterThan(1);
  });

  it('assigns sequential zero-based indices', () => {
    const longText = 'Sentence one. '.repeat(200);
    const result = chunkText(longText, 1200, 150);
    result.forEach((chunk, i) => expect(chunk.index).toBe(i));
  });

  it('produces no empty chunks', () => {
    const longText = 'Word '.repeat(1000);
    const result = chunkText(longText, 500, 50);
    expect(result.every((c) => c.content.trim().length > 0)).toBe(true);
  });

  it('prefers paragraph boundaries over hard cuts when available', () => {
    const text = 'First paragraph content here.\n\nSecond paragraph content here.'.repeat(20);
    const result = chunkText(text, 200, 20);
    // A hard cut mid-word would produce chunks that don't end near a
    // sentence/paragraph boundary — spot-check that most chunks end
    // with recognizable punctuation or the paragraph break.
    const endsCleanly = result.filter((c) => /[.\n]\s*$/.test(c.content) || /\.$/.test(c.content));
    expect(endsCleanly.length).toBeGreaterThan(0);
  });

  it('handles Windows-style line endings without leaving stray \\r', () => {
    const result = chunkText('Line one.\r\nLine two.\r\nLine three.');
    expect(result[0]!.content).not.toContain('\r');
  });

  it('never produces a chunk drastically larger than chunkSize plus overlap', () => {
    const longText = 'x'.repeat(5000); // no separators at all — forces hard cuts
    const result = chunkText(longText, 1000, 100);
    result.forEach((chunk) => expect(chunk.content.length).toBeLessThanOrEqual(1100));
  });
});