export type TextChunk = { index: number; content: string };

/**
 * Recursive-ish character chunker with overlap, preferring
 * paragraph/sentence boundaries when available. Deliberately plain
 * JS rather than Cortex's SPLIT_TEXT_RECURSIVE_CHARACTER SQL
 * function — keeps one more integration point in code this project
 * fully controls and can unit test in isolation, at the cost of
 * being less linguistically aware than a purpose-built splitter.
 * Good enough for hackathon-scale documents; worth revisiting if
 * retrieval quality on long, dense documents needs improvement.
 */
export function chunkText(text: string, chunkSize = 1200, overlap = 150): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  const separators = ['\n\n', '\n', '. ', ' '];

  function split(input: string): string[] {
    if (input.length <= chunkSize) return [input];

    for (const sep of separators) {
      const idx = input.lastIndexOf(sep, chunkSize);
      if (idx > chunkSize * 0.5) {
        const head = input.slice(0, idx + sep.length);
        const tail = input.slice(Math.max(idx + sep.length - overlap, 0));
        return [head, ...split(tail)];
      }
    }

    // No good separator in range — hard cut rather than producing
    // one enormous unsplit chunk.
    return [input.slice(0, chunkSize), ...split(input.slice(chunkSize - overlap))];
  }

  return split(cleaned)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((content, index) => ({ index, content }));
}
