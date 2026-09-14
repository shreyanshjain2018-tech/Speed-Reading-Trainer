import type { Book } from "./types";

export interface ParsedWord {
  index: number;
  word: string;
  isParagraphStart?: boolean;
  isHeading?: boolean;
  headingLevel?: number;
  tagName?: string;
}

export interface ParsedLine {
  lineNumber: number;
  words: ParsedWord[];
  isParagraphStart?: boolean;
}

/**
 * Extracts plain text words and parses HTML content into sequential tokenized words
 * with indices, retaining paragraph boundaries and semantic structure.
 */
export function parseHtmlToWords(htmlContent: string): {
  words: ParsedWord[];
  totalWords: number;
  previewSnippet: string;
} {
  // Use DOMParser if available in browser
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const body = doc.body;

      const words: ParsedWord[] = [];
      let wordCounter = 0;

      function traverse(node: Node, isBlockStart = false) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          const tokens = text.match(/\S+/g);
          if (tokens && tokens.length > 0) {
            tokens.forEach((token, idx) => {
              words.push({
                index: wordCounter++,
                word: token,
                isParagraphStart: isBlockStart && idx === 0,
              });
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const isHeading = /^h[1-6]$/.test(tag);
          const isBlock = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "li", "section", "article"].includes(tag);

          let firstChild = true;
          for (let i = 0; i < el.childNodes.length; i++) {
            const child = el.childNodes[i];
            traverse(child, isBlock && firstChild);
            if (child.textContent && child.textContent.trim().length > 0) {
              firstChild = false;
            }
          }
        }
      }

      traverse(body, true);

      const preview = words.slice(0, 30).map((w) => w.word).join(" ") + (words.length > 30 ? "..." : "");

      return {
        words,
        totalWords: words.length,
        previewSnippet: preview,
      };
    } catch (e) {
      console.warn("DOMParser fallback to regex parsing:", e);
    }
  }

  // Regex Fallback
  const clean = htmlContent.replace(/<[^>]*>/g, " ");
  const rawTokens = clean.match(/\S+/g) || [];
  const words: ParsedWord[] = rawTokens.map((w, idx) => ({
    index: idx,
    word: w,
  }));

  return {
    words,
    totalWords: words.length,
    previewSnippet: words.slice(0, 30).map((w) => w.word).join(" ") + "...",
  };
}

/**
 * Splits words into lines of approximate word count (e.g. 8-10 words per line)
 * suitable for standardized SAT/ACT dual-column layout with 5-line numbering.
 */
export function formatWordsIntoLines(words: ParsedWord[], wordsPerLine = 8): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let currentLineWords: ParsedWord[] = [];
  let lineCounter = 1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // If it's a new paragraph and current line already has content, push line
    if (word.isParagraphStart && currentLineWords.length > 0) {
      lines.push({
        lineNumber: lineCounter++,
        words: currentLineWords,
        isParagraphStart: currentLineWords[0]?.isParagraphStart,
      });
      currentLineWords = [];
    }

    currentLineWords.push(word);

    if (currentLineWords.length >= wordsPerLine) {
      lines.push({
        lineNumber: lineCounter++,
        words: currentLineWords,
        isParagraphStart: currentLineWords[0]?.isParagraphStart,
      });
      currentLineWords = [];
    }
  }

  if (currentLineWords.length > 0) {
    lines.push({
      lineNumber: lineCounter++,
      words: currentLineWords,
      isParagraphStart: currentLineWords[0]?.isParagraphStart,
    });
  }

  return lines;
}

export const BUILT_IN_BOOKS: Book[] = [];
