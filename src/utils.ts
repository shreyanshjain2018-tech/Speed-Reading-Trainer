// utils.ts
import type { WordGroup } from "./types";

interface ParagraphGroup {
  id: string;
  lines: WordGroup[];
}

/**
 * Splits text into paragraphs, and then segments each paragraph's words
 * into chunks of a specific size (wordsPerLine) for narrow column fixation training.
 */
export function chunkTextIntoFixationLines(
  text: string,
  wordsPerLine: number
): ParagraphGroup[] {
  if (!text) return [];

  // Split text into paragraphs based on one or more empty line breaks
  const rawParagraphs = text.split(/\n\s*\n/);

  return rawParagraphs
    .map((rawPara, pIdx) => {
      // Clean up whitespace and get individual words
      const cleanedText = rawPara.replace(/\s+/g, " ").trim();
      if (!cleanedText) return null;

      const words = cleanedText.split(" ");
      const lines: WordGroup[] = [];

      for (let i = 0; i < words.length; i += wordsPerLine) {
        const chunk = words.slice(i, i + wordsPerLine).join(" ");
        lines.push({
          id: `para-${pIdx}-line-${i}`,
          words: chunk,
        });
      }

      return {
        id: `paragraph-${pIdx}`,
        lines,
      };
    })
    .filter((group): group is ParagraphGroup => group !== null);
}

/**
 * Count the exact number of words in a string.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").length;
}

/**
 * Calculates words per minute speed.
 */
export function calculateWpm(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || wordCount <= 0) return 0;
  const minutes = durationSeconds / 60;
  return Math.round(wordCount / minutes);
}

/**
 * Returns a neat human feedback string given the WPM.
 */
export function getWpmFeedback(wpm: number): {
  category: string;
  description: string;
  color: string;
} {
  if (wpm < 150) {
    return {
      category: "Deliberate / Slow Reader",
      description: "A slow, focused reading speed. This is typically used for studying complex topics, editing, or sub-vocalizing almost every syllable.",
      color: "text-amber-600 border-amber-200 bg-amber-50",
    };
  } else if (wpm >= 150 && wpm < 250) {
    return {
      category: "Average Reader",
      description: "Around the standard vocalized reading speed of most adults. You are likely processing about 1-2 words per eye fixation.",
      color: "text-blue-600 border-blue-200 bg-blue-50",
    };
  } else if (wpm >= 250 && wpm < 400) {
    return {
      category: "Amateur Speed Reader",
      description: "Excellent rhythm! You are absorbing structural phrases and reading slightly faster than the internal speaking voice can vocalize.",
      color: "text-emerald-600 border-emerald-200 bg-emerald-50",
    };
  } else if (wpm >= 400 && wpm < 700) {
    return {
      category: "Proficient Speed Reader",
      description: "Superb eye discipline! You are sweeping strictly down the column and taking in clumps of 3-4 words with almost instantaneous cognitive transfer.",
      color: "text-purple-600 border-purple-200 bg-purple-50",
    };
  } else {
    return {
      category: "Advanced Speed Reader",
      description: "Stellar performance! You are scanning vertically with highly minimal eye pauses. True Norman Lewis style vertical integration.",
      color: "text-pink-600 border-pink-200 bg-pink-50",
    };
  }
}
