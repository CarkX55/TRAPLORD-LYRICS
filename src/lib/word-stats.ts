// Word Stats Analyzer
// Computes statistics about lyrics: word count, unique words, avg per line, reading time.

export interface WordStats {
  totalWords: number;
  uniqueWords: number;
  totalLines: number;
  nonEmptyLines: number;
  avgWordsPerLine: number;
  longestLine: number;
  readingTimeSec: number;   // at ~150 wpm = 2.5 wps
  uniqueRatio: number;       // uniqueWords / totalWords (lexical diversity)
  topWords: { word: string; count: number }[];
  adlibCount: number;       // (parenthetical) count
  sectionCount: number;     // [Section] count
}

const STOPWORDS = new Set([
  // Spanish
  "el", "la", "los", "las", "un", "una", "de", "en", "con", "por", "para", "que", "y", "o",
  "no", "se", "me", "te", "le", "les", "su", "sus", "mi", "tu", "al", "del", "es", "son",
  "fue", "era", "ya", "más", "pero", "como", "sin", "sobre", "entre", "hasta", "desde",
  // English
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "by", "from", "is", "are",
  "was", "were", "be", "been", "i", "you", "he", "she", "it", "we", "they", "me", "him",
  "and", "or", "but", "not", "no", "my", "your", "his", "its", "our", "their", "yeah",
]);

export function analyzeWordStats(lyrics: string): WordStats {
  const lines = lyrics.split("\n");
  const nonEmptyLines = lines.filter(l => l.trim() && !/^\[.*\]$/.test(l.trim()) && !/^Interpr/i.test(l.trim()));
  const allText = lyrics.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ").replace(/[^\w\sáéíóúñü']/g, " ");
  const words = allText.toLowerCase().split(/\s+/).filter(w => w.length > 1);

  const totalWords = words.length;
  const uniqueWords = new Set(words).size;
  const totalLines = lines.length;
  const longestLine = Math.max(...nonEmptyLines.map(l => l.split(/\s+/).filter(w => w.length > 0).length), 0);
  const avgWordsPerLine = nonEmptyLines.length > 0 ? Math.round(totalWords / nonEmptyLines.length * 10) / 10 : 0;
  const readingTimeSec = Math.ceil((totalWords / 150) * 60);
  const uniqueRatio = totalWords > 0 ? Math.round((uniqueWords / totalWords) * 100) : 0;

  // Top words (excluding stopwords)
  const wordCounts = new Map<string, number>();
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 3) continue;
    wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
  }
  const topWords = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Count ad-libs (parenthetical content)
  const adlibMatches = lyrics.match(/\([^)]*\)/g) ?? [];
  const adlibCount = adlibMatches.filter(a => !/^\[(beat|long|whisper|drop|scream)/i.test(a)).length;

  // Count sections
  const sectionMatches = lyrics.match(/\[[^\]]*\]/g) ?? [];
  const sectionCount = sectionMatches.filter(s => /^(intro|verse|chorus|hook|bridge|outro|pre-chorus|refrán)/i.test(s)).length;

  return {
    totalWords,
    uniqueWords,
    totalLines,
    nonEmptyLines: nonEmptyLines.length,
    avgWordsPerLine,
    longestLine,
    readingTimeSec,
    uniqueRatio,
    topWords,
    adlibCount,
    sectionCount,
  };
}
