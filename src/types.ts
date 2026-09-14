export enum AppTab {
  SETUP = "SETUP",
  READING = "READING",
  RESULTS = "RESULTS",
  COMPREHENSION = "COMPREHENSION",
  HISTORY = "HISTORY"
}

export enum MainAppMode {
  FIXATION = "FIXATION",
  BOOK_READER = "BOOK_READER"
}

export enum BookReaderTab {
  READER = "READER",
  PROGRESS = "PROGRESS"
}

export enum FontFamily {
  SANS = "SANS",
  SERIF = "SERIF",
  MONO = "MONO"
}

export type WordGroup = {
  id: string;
  words: string;
};

export interface ReaderConfig {
  text: string;
  wordsPerLine: number; // 2, 3, 4, 5 words per line
  fontSize: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  fontFamily: FontFamily;
  lineSpacing: "tight" | "normal" | "relaxed" | "loose";
  showCenterGuide: boolean;
  visualPacerEnabled: boolean;
  pacerWpm: number; // Words Per Minute for the pacing line highlight
  alignment: "left" | "center";
  satActMode: boolean; // SAT & ACT style passage with line numbering
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizState {
  questions: QuizQuestion[];
  userAnswers: { [key: number]: number }; // questionIndex -> optionIndex
  submitted: boolean;
  score: number | null;
}

export interface ReadingSessionStats {
  totalWords: number;
  totalLines: number;
  durationSeconds: number;
  wpm: number;
  timestamp: number;
  textTitle?: string;
  comprehensionScore?: number | null; // e.g. 3/5 is 0.6
  comprehensionMax?: number | null; // e.g. 5
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  htmlContent: string;
  plainText?: string;
  totalWords: number;
  currentWordIndex: number; // Current bookmark index (0-based)
  createdAt: number;
  lastReadAt: number;
  isCustomUpload?: boolean;
}

export interface BookReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  startWordIndex: number;
  endWordIndex: number;
  wordsRead: number;
  durationSeconds: number;
  wpm: number;
  timestamp: number;
  dateString: string; // "YYYY-MM-DD"
  startWordSnippet?: string;
  endWordSnippet?: string;
  progressPercent?: number;
}

export interface BookReaderConfig {
  columns: 1 | 2; // Single or Double SAT Column
  fontSize: "sm" | "base" | "lg" | "xl" | "2xl";
  fontFamily: FontFamily;
  lineHeight: "tight" | "normal" | "relaxed" | "loose";
  showLineNumbers: boolean;
  highlightLineHover: boolean;
  lineWordsTarget: number; // 7 - 12 words per line (standard SAT/ACT formatting)
}
