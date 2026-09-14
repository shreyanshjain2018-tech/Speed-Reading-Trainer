import type { Book, BookReadingSession } from "./types";
import { BUILT_IN_BOOKS } from "./bookData";
import { normalizeTimestamp } from "./syncHelper";

const BOOKS_STORAGE_KEY = "speed_reader_books_v1";
const BOOK_SESSIONS_STORAGE_KEY = "speed_reader_book_sessions_v1";

const DEFAULT_BOOK_IDS = new Set(["christmas-carol-dickens", "sat-official-reading-passage-1", "act-natural-science-passage"]);

/**
 * Loads the active list of books from localStorage, filtering out any legacy default sample books.
 */
export function loadBooksFromStorage(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy default sample books if they exist in localStorage
        const userBooks = parsed.filter((b: Book) => b && !DEFAULT_BOOK_IDS.has(b.id));
        return userBooks;
      }
    }
  } catch (e) {
    console.error("Failed to load books from localStorage:", e);
  }
  return [];
}

/**
 * Persists the books array to localStorage.
 */
export function saveBooksToStorage(books: Book[]): void {
  try {
    localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
  } catch (e) {
    console.error("Failed to save books to localStorage:", e);
  }
}

/**
 * Updates bookmark (current word index) for a specific book.
 */
export function updateBookBookmarkInStorage(bookId: string, currentWordIndex: number): Book[] {
  const books = loadBooksFromStorage();
  const updated = books.map((b) => {
    if (b.id === bookId) {
      return {
        ...b,
        currentWordIndex: Math.max(0, currentWordIndex),
        lastReadAt: Date.now(),
      };
    }
    return b;
  });
  saveBooksToStorage(updated);
  return updated;
}

/**
 * Loads all book reading sessions from localStorage.
 */
export function loadBookSessionsFromStorage(): BookReadingSession[] {
  try {
    const raw = localStorage.getItem(BOOK_SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => ({
          id: s.id || `session_${s.timestamp}_${Math.random().toString(36).substring(2, 6)}`,
          bookId: s.bookId || "unknown",
          bookTitle: s.bookTitle || "Custom Reading",
          startWordIndex: Number(s.startWordIndex) || 0,
          endWordIndex: Number(s.endWordIndex) || 0,
          wordsRead: Number(s.wordsRead) || 0,
          durationSeconds: Number(s.durationSeconds) || 0,
          wpm: Number(s.wpm) || 0,
          timestamp: normalizeTimestamp(s.timestamp) || Date.now(),
          dateString: s.dateString || new Date(normalizeTimestamp(s.timestamp) || Date.now()).toISOString().split("T")[0],
          startWordSnippet: s.startWordSnippet || "",
          endWordSnippet: s.endWordSnippet || "",
          progressPercent: Number(s.progressPercent) || 0,
        })).sort((a, b) => a.timestamp - b.timestamp);
      }
    }
  } catch (e) {
    console.error("Failed to load book sessions:", e);
  }
  return [];
}

/**
 * Saves book reading sessions to localStorage.
 */
export function saveBookSessionsToStorage(sessions: BookReadingSession[]): void {
  try {
    localStorage.setItem(BOOK_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save book sessions:", e);
  }
}

/**
 * Formats a Date object into "YYYY-MM-DD".
 */
export function formatDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function exportBookSessionsToJson(sessions: BookReadingSession[]): string {
  return JSON.stringify(sessions, null, 2);
}

export function parseImportedBookSessions(jsonStr: string): BookReadingSession[] {
  try {
    const parsed = JSON.parse(jsonStr);
    const list = Array.isArray(parsed) ? parsed : parsed.sessions || parsed.history;
    if (!Array.isArray(list)) return [];

    return list.map((s: any) => {
      const ts = normalizeTimestamp(s.timestamp) || Date.now();
      return {
        id: s.id || `session_${ts}_${Math.random().toString(36).substring(2, 6)}`,
        bookId: s.bookId || "unknown",
        bookTitle: s.bookTitle || "Imported Reading",
        startWordIndex: Math.max(0, Number(s.startWordIndex) || 0),
        endWordIndex: Math.max(0, Number(s.endWordIndex) || 0),
        wordsRead: Math.max(0, Number(s.wordsRead) || 0),
        durationSeconds: Math.max(0, Number(s.durationSeconds) || 0),
        wpm: Math.max(0, Math.round(Number(s.wpm) || 0)),
        timestamp: ts,
        dateString: s.dateString || formatDateKey(ts),
        startWordSnippet: s.startWordSnippet || "",
        endWordSnippet: s.endWordSnippet || "",
        progressPercent: Number(s.progressPercent) || 0,
      };
    });
  } catch (e) {
    throw new Error("Invalid book sessions JSON structure.");
  }
}
