export enum AppTab {
  SETUP = "SETUP",
  READING = "READING",
  RESULTS = "RESULTS",
  COMPREHENSION = "COMPREHENSION",
  HISTORY = "HISTORY"
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
