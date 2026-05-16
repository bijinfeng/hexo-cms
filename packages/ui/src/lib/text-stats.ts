function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
    (code >= 0xff00 && code <= 0xffef) || // Halfwidth and Fullwidth Forms
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code >= 0xac00 && code <= 0xd7af)    // Hangul Syllables
  );
}

export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const segments = text.trim().split(/\s+/);

  let wordCount = 0;
  for (const segment of segments) {
    const cjkCount = [...segment].filter(isCJK).length;

    if (cjkCount > 0) {
      wordCount += cjkCount;
    }

    const nonCjkPart = [...segment].filter((c) => !isCJK(c)).join("").trim();
    if (nonCjkPart.length > 0) {
      wordCount += 1;
    }
  }

  return wordCount;
}

export function countChars(text: string): number {
  return text.length;
}

export function estimateReadingTime(words: number, wpm?: number): string {
  if (words === 0) return "0 min read";

  const rate = wpm ?? 300;
  const minutes = Math.max(1, Math.ceil(words / rate));

  if (minutes < 60) {
    return `${minutes} min read`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h read`;
  }

  return `${hours}h ${remainingMinutes}m read`;
}

export function countLines(text: string): number {
  if (!text) return 0;
  return text.split("\n").length;
}
