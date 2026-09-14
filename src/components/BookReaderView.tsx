import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Book,
  BookReadingSession,
  BookReaderConfig,
  FontFamily
} from "../types";
import {
  parseHtmlToWords,
  formatWordsIntoLines,
  ParsedWord,
  ParsedLine
} from "../bookData";
import { formatDateKey } from "../bookStorage";
import {
  BookOpen,
  Bookmark,
  Play,
  Square,
  Upload,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckCircle,
  FileText,
  Clock,
  Zap,
  Columns,
  Type,
  Trash2,
  RotateCcw,
  Check,
  Pause,
  AlertCircle
} from "lucide-react";

interface BookReaderViewProps {
  books: Book[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
  onAddBook: (newBook: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onUpdateBookmark: (bookId: string, wordIndex: number) => void;
  onFinishSession: (session: BookReadingSession) => void;
  onSwitchToProgress: () => void;
}

const DEFAULT_CONFIG: BookReaderConfig = {
  columns: 1,
  fontSize: "lg",
  fontFamily: FontFamily.SERIF,
  lineHeight: "relaxed",
  showLineNumbers: true,
  highlightLineHover: true,
  lineWordsTarget: 10,
};

export default function BookReaderView({
  books,
  activeBookId,
  onSelectBook,
  onAddBook,
  onDeleteBook,
  onUpdateBookmark,
  onFinishSession,
  onSwitchToProgress,
}: BookReaderViewProps) {
  const [config, setConfig] = useState<BookReaderConfig>(DEFAULT_CONFIG);
  const [isReadingActive, setIsReadingActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Range markers for current reading session
  const [startWordIndex, setStartWordIndex] = useState<number>(0);
  const [selectedEndWordIndex, setSelectedEndWordIndex] = useState<number | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadAuthor, setUploadAuthor] = useState<string>("Uploaded Document");
  const [uploadHtmlText, setUploadHtmlText] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Session Completed Modal state
  const [completedSession, setCompletedSession] = useState<BookReadingSession | null>(null);

  // Active book lookup
  const activeBook = useMemo(() => {
    return books.find((b) => b.id === activeBookId) || books[0] || null;
  }, [books, activeBookId]);

  // Parse current active book into sequential indexed words
  const parsedData = useMemo(() => {
    if (!activeBook) return { words: [] as ParsedWord[], totalWords: 0, previewSnippet: "" };
    return parseHtmlToWords(activeBook.htmlContent);
  }, [activeBook?.htmlContent]);

  // Sync startWordIndex with saved book bookmark when book changes
  useEffect(() => {
    if (activeBook) {
      const savedIndex = Math.min(activeBook.currentWordIndex || 0, Math.max(0, parsedData.totalWords - 1));
      setStartWordIndex(savedIndex);
      setSelectedEndWordIndex(null);
      setIsReadingActive(false);
      setElapsedSeconds(0);
    }
  }, [activeBook?.id, activeBook?.currentWordIndex, parsedData.totalWords]);

  // Format into SAT/ACT Lines (with 5-line indicators)
  const lines: ParsedLine[] = useMemo(() => {
    return formatWordsIntoLines(parsedData.words, config.lineWordsTarget);
  }, [parsedData.words, config.lineWordsTarget]);

  // Reading Timer Hook
  useEffect(() => {
    let interval: any = null;
    if (isReadingActive && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReadingActive, isPaused]);

  // Auto-scroll to current start word or bookmark
  const readingContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBookmark = useCallback(() => {
    const el = document.getElementById(`book-word-${startWordIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [startWordIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBookmark();
    }, 200);
    return () => clearTimeout(timer);
  }, [activeBookId, startWordIndex, scrollToBookmark]);

  // Start Session Handler
  const handleStartSession = () => {
    setIsReadingActive(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSelectedEndWordIndex(null);
    scrollToBookmark();
  };

  // Click on a word during/before session
  const handleWordClick = (wordIndex: number) => {
    if (!isReadingActive) {
      // Set start word marker
      setStartWordIndex(wordIndex);
      if (activeBook) {
        onUpdateBookmark(activeBook.id, wordIndex);
      }
    } else {
      // During active session, clicking a word sets it as the End Word
      if (wordIndex >= startWordIndex) {
        setSelectedEndWordIndex(wordIndex);
      }
    }
  };

  // Finish Reading Session
  const handleFinishSession = (overrideEndIndex?: number) => {
    if (!activeBook) return;

    const endIndex = overrideEndIndex !== undefined
      ? overrideEndIndex
      : selectedEndWordIndex !== null
      ? selectedEndWordIndex
      : Math.min(startWordIndex + 10, parsedData.totalWords - 1);

    const actualEnd = Math.max(startWordIndex, endIndex);
    const wordsRead = Math.max(1, actualEnd - startWordIndex + 1);
    const durationSec = Math.max(1, elapsedSeconds);
    const calculatedWpm = Math.round((wordsRead / durationSec) * 60);
    const now = Date.now();

    const startSnippet = parsedData.words.slice(startWordIndex, startWordIndex + 5).map((w) => w.word).join(" ");
    const endSnippet = parsedData.words.slice(Math.max(0, actualEnd - 4), actualEnd + 1).map((w) => w.word).join(" ");
    const progressPct = Math.min(100, Math.round(((actualEnd + 1) / Math.max(1, parsedData.totalWords)) * 1000) / 10);

    const session: BookReadingSession = {
      id: `book_session_${now}_${Math.random().toString(36).substring(2, 6)}`,
      bookId: activeBook.id,
      bookTitle: activeBook.title,
      startWordIndex: startWordIndex,
      endWordIndex: actualEnd,
      wordsRead: wordsRead,
      durationSeconds: durationSec,
      wpm: calculatedWpm,
      timestamp: now,
      dateString: formatDateKey(now),
      startWordSnippet: startSnippet,
      endWordSnippet: endSnippet,
      progressPercent: progressPct,
    };

    // Update bookmark in storage so user can resume seamlessly tomorrow
    const newBookmark = Math.min(actualEnd + 1, parsedData.totalWords);
    onUpdateBookmark(activeBook.id, newBookmark);
    setStartWordIndex(newBookmark);
    setSelectedEndWordIndex(null);

    // Save session to history
    onFinishSession(session);

    // Stop timer and show completion scorecard
    setIsReadingActive(false);
    setIsPaused(false);
    setCompletedSession(session);
  };

  // Upload HTML file parser handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setUploadHtmlText(content);
        if (!uploadTitle) {
          const rawName = file.name.replace(/\.[^/.]+$/, "");
          setUploadTitle(rawName);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveUploadedBook = () => {
    if (!uploadHtmlText.trim()) {
      setUploadError("Please provide HTML text or upload an HTML file.");
      return;
    }

    const title = uploadTitle.trim() || "Uploaded Document";
    const author = uploadAuthor.trim() || "Custom Author";
    const parsed = parseHtmlToWords(uploadHtmlText);

    if (parsed.totalWords === 0) {
      setUploadError("Could not detect any readable text words inside this HTML file.");
      return;
    }

    const newBook: Book = {
      id: `custom_book_${Date.now()}`,
      title,
      author,
      description: `Custom uploaded document (${parsed.totalWords.toLocaleString()} words)`,
      htmlContent: uploadHtmlText,
      totalWords: parsed.totalWords,
      currentWordIndex: 0,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
      isCustomUpload: true,
    };

    onAddBook(newBook);
    onSelectBook(newBook.id);
    setIsUploadModalOpen(false);
    setUploadHtmlText("");
    setUploadTitle("");
    setUploadAuthor("Uploaded Document");
    setUploadError(null);
  };

  const progressPercentage = activeBook && parsedData.totalWords > 0
    ? Math.min(100, Math.round(((activeBook.currentWordIndex || 0) / parsedData.totalWords) * 100))
    : 0;

  // Typography font family class
  const getFontFamilyClass = () => {
    switch (config.fontFamily) {
      case FontFamily.SERIF:
        return "font-serif";
      case FontFamily.MONO:
        return "font-mono";
      default:
        return "font-sans";
    }
  };

  const getFontSizeClass = () => {
    switch (config.fontSize) {
      case "sm":
        return "text-xs leading-relaxed";
      case "base":
        return "text-sm leading-relaxed";
      case "lg":
        return "text-base leading-loose";
      case "xl":
        return "text-lg leading-loose";
      case "2xl":
        return "text-xl leading-loose";
      default:
        return "text-base leading-loose";
    }
  };

  return (
    <div className="w-full space-y-4" id="book-reader-view-container">
      {/* 1. TOP SETUP / CONTROLS (Hidden during active Zen reading mode) */}
      {!isReadingActive && (
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
          {/* Header row: Book selection & Quick Upload */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#232731] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Long-Form & SAT/ACT Book Reader
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Read entire books and official standardized passages in clean single-column format. Track your words read and reading velocity over multiple days with auto-bookmarking.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                id="btn-upload-html-book"
                className="px-3.5 py-2 bg-[#1f2430] hover:bg-[#2a3040] border border-[#343b4e] text-indigo-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload HTML / Book</span>
              </button>

              <button
                onClick={onSwitchToProgress}
                id="btn-view-book-progress"
                className="px-3.5 py-2 bg-[#1f2430] hover:bg-[#2a3040] border border-[#343b4e] text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Book Analytics</span>
              </button>
            </div>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-8 space-y-3 bg-[#111317] rounded-xl border border-[#232731] p-6">
              <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Books in Your Library</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Upload an HTML document or book to start reading in single-column format with automatic bookmarking and speed calculation.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Your First HTML / Book</span>
              </button>
            </div>
          ) : (
            <>
              {/* Active Book Selector & Progress Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Select Active Book / Reading Material
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={activeBook?.id || ""}
                      onChange={(e) => onSelectBook(e.target.value)}
                      id="select-active-book"
                      className="w-full bg-[#111317] border border-[#2e3444] text-white font-medium text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} &bull; {b.author} ({b.totalWords.toLocaleString()} words)
                        </option>
                      ))}
                    </select>

                    {activeBook && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Purge and delete "${activeBook.title}" and all its reading sessions/bookmarks?`)) {
                            onDeleteBook(activeBook.id);
                          }
                        }}
                        title="Delete book and purge all history"
                        className="p-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Progress and Bookmark Status */}
                  <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        Bookmark: <strong>Word {startWordIndex.toLocaleString()}</strong> of {parsedData.totalWords.toLocaleString()}
                      </span>
                    </div>
                    <span className="font-mono text-indigo-300 font-bold">
                      {progressPercentage}% Completed
                    </span>
                  </div>

                  {/* Progress track bar */}
                  <div className="w-full bg-[#111317] h-2 rounded-full overflow-hidden border border-[#242935]">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Launch Session CTA Card */}
                <div className="bg-[#111317] border border-[#262c3a] rounded-xl p-4 flex flex-col justify-between gap-3 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Session Readiness
                    </span>
                    <p className="text-xs text-slate-300">
                      Ready to resume from word <strong className="text-indigo-300">#{startWordIndex}</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleStartSession}
                    id="btn-start-book-session"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Reading Session</span>
                  </button>
                </div>
              </div>

              {/* Reader Formatting Preferences Bar */}
              <div className="pt-3 border-t border-[#232731] flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Typography Family */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Typeface:</span>
                  <div className="flex bg-[#111317] p-0.5 rounded-lg border border-[#2a3040]">
                    <button
                      onClick={() => setConfig({ ...config, fontFamily: FontFamily.SERIF })}
                      className={`px-2 py-1 rounded font-serif text-xs transition-colors cursor-pointer ${
                        config.fontFamily === FontFamily.SERIF ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Serif
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, fontFamily: FontFamily.SANS })}
                      className={`px-2 py-1 rounded font-sans text-xs transition-colors cursor-pointer ${
                        config.fontFamily === FontFamily.SANS ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Sans
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, fontFamily: FontFamily.MONO })}
                      className={`px-2 py-1 rounded font-mono text-xs transition-colors cursor-pointer ${
                        config.fontFamily === FontFamily.MONO ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Size:</span>
                  <select
                    value={config.fontSize}
                    onChange={(e) => setConfig({ ...config, fontSize: e.target.value as any })}
                    className="bg-[#111317] border border-[#2a3040] text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="sm">Small (12px)</option>
                    <option value="base">Medium (14px)</option>
                    <option value="lg">Large (16px)</option>
                    <option value="xl">Extra Large (18px)</option>
                    <option value="2xl">2X Large (20px)</option>
                  </select>
                </div>

                {/* Line Numbers Toggle */}
                <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showLineNumbers}
                    onChange={(e) => setConfig({ ...config, showLineNumbers: e.target.checked })}
                    className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Margin Line Numbers (5, 10, 15...)</span>
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. ACTIVE ZEN READING STAGE HUD (Visible ONLY during active session) */}
      {isReadingActive && (
        <div className="sticky top-2 z-40 bg-[#16181d]/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          {/* Left: Active Stopwatch */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111317] border border-[#2a3040] rounded-xl font-mono text-sm sm:text-base font-extrabold text-indigo-400">
              <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>
                {Math.floor(elapsedSeconds / 60)}:
                {String(elapsedSeconds % 60).padStart(2, "0")}
              </span>
            </div>

            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Active Session
              </span>
              <span className="text-white font-bold line-clamp-1">
                Started at Word #{startWordIndex.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Center: Live Word Selection Guidance */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-[#111317] px-3 py-1.5 rounded-xl border border-[#2a3040]">
            {selectedEndWordIndex !== null ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Selected End Word #{selectedEndWordIndex} (
                {(selectedEndWordIndex - startWordIndex + 1).toLocaleString()} words read)
              </span>
            ) : (
              <span className="text-slate-400">
                Click any word in text to mark your end position, or click Finish below.
              </span>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border ${
                isPaused
                  ? "bg-amber-950/60 border-amber-700/60 text-amber-300"
                  : "bg-[#1f2430] border-[#343b4e] text-slate-300 hover:text-white"
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </button>

            <button
              onClick={() => handleFinishSession()}
              id="btn-finish-book-session"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Finish & Calculate WPM</span>
            </button>

            <button
              onClick={() => {
                setIsReadingActive(false);
                setElapsedSeconds(0);
              }}
              className="px-2.5 py-1.5 bg-[#1f2430] hover:bg-[#282e3c] border border-[#2e3544] text-slate-400 hover:text-slate-200 text-xs rounded-xl transition-colors cursor-pointer"
              title="Cancel session without saving"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. PRIMARY READING PASSAGE CANVAS (SINGLE COLUMN) */}
      {activeBook ? (
        <div
          ref={readingContainerRef}
          className="bg-[#16181d] border border-[#232731] rounded-2xl p-6 sm:p-10 shadow-lg select-text min-h-[600px] overflow-x-hidden"
        >
          {/* Book Title & Passage Introduction Header */}
          <div className="border-b border-[#2e3444] pb-5 mb-6 text-center space-y-1 select-none">
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
              SAT / ACT Reading Format &bull; Passage Section
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeBook.title}
            </h1>
            <p className="text-xs text-slate-400 italic">
              By {activeBook.author} &bull; {parsedData.totalWords.toLocaleString()} total words
            </p>
          </div>

          {/* Single-Column Passage Content */}
          <div
            className={`w-full max-w-3xl mx-auto transition-all duration-200 ${getFontFamilyClass()} ${getFontSizeClass()} text-slate-200`}
          >
            {lines.map((line) => {
              const isEveryFifthLine = line.lineNumber % 5 === 0;

              return (
                <div
                  key={`line-${line.lineNumber}`}
                  className={`relative flex items-baseline gap-3 py-0.5 group rounded px-1.5 transition-colors ${
                    config.highlightLineHover ? "hover:bg-[#1f2430]/60" : ""
                  }`}
                >
                  {/* Margin Line Number (Shown every 5 lines) */}
                  {config.showLineNumbers && (
                    <span
                      className={`w-7 shrink-0 text-right select-none font-mono text-[10px] font-bold ${
                        isEveryFifthLine ? "text-indigo-400 font-extrabold" : "text-slate-600 opacity-40"
                      }`}
                    >
                      {isEveryFifthLine ? line.lineNumber : ""}
                    </span>
                  )}

                  {/* Words in Line */}
                  <div className="flex-1 flex flex-wrap gap-x-1.5 items-baseline">
                    {line.words.map((w) => {
                      const isBookmark = w.index === startWordIndex;
                      const isSelectedEnd = w.index === selectedEndWordIndex;
                      const isInActiveRange =
                        isReadingActive &&
                        selectedEndWordIndex !== null &&
                        w.index >= startWordIndex &&
                        w.index <= selectedEndWordIndex;

                      return (
                        <span
                          key={`word-${w.index}`}
                          id={`book-word-${w.index}`}
                          onClick={() => handleWordClick(w.index)}
                          title={`Word #${w.index} (${isBookmark ? "Current Bookmark" : "Click to select"})`}
                          className={`transition-all rounded px-0.5 cursor-pointer ${
                            isBookmark
                              ? "bg-indigo-600 text-white font-bold ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#16181d]"
                              : isSelectedEnd
                              ? "bg-emerald-600 text-white font-bold ring-2 ring-emerald-400"
                              : isInActiveRange
                              ? "bg-indigo-950/80 text-indigo-200"
                              : "hover:bg-indigo-500/20 hover:text-white"
                          }`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Fast Action Footer */}
          {!isReadingActive && (
            <div className="mt-10 pt-6 border-t border-[#232731] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>
                  Bookmark is saved at <strong>Word #{startWordIndex.toLocaleString()}</strong>. Click any word above to move your start position.
                </span>
              </div>

              <button
                onClick={handleStartSession}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-transform hover:scale-[1.01] cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Reading from Bookmark</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* 4. COMPLETED READING SESSION MODAL / SCORECARD */}
      {completedSession && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#16181d] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-indigo-500/40 space-y-6">
            <div className="flex items-center justify-between border-b border-[#232731] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">
                    Reading Session Saved!
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {completedSession.bookTitle} &bull; {completedSession.dateString}
                  </span>
                </div>
              </div>
            </div>

            {/* Scorecard Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Speed WPM */}
              <div className="bg-[#111317] border border-[#242935] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Speed
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-indigo-400">
                  {completedSession.wpm}
                </span>
                <span className="text-[10px] text-slate-500 block font-bold">WPM</span>
              </div>

              {/* Words Read */}
              <div className="bg-[#111317] border border-[#242935] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Volume
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400">
                  {completedSession.wordsRead.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block font-bold">Words</span>
              </div>

              {/* Time */}
              <div className="bg-[#111317] border border-[#242935] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Time
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-pink-400">
                  {Math.floor(completedSession.durationSeconds / 60)}:
                  {String(completedSession.durationSeconds % 60).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-slate-500 block font-bold">Min:Sec</span>
              </div>
            </div>

            {/* Progress Update Notice */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Book Progress Advanced:</span>
                <span className="font-mono text-indigo-300">{completedSession.progressPercent}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Your bookmark is now saved at Word #{completedSession.endWordIndex + 1}. When you return tomorrow, you can continue directly from this exact spot!
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setCompletedSession(null);
                  onSwitchToProgress();
                }}
                className="px-4 py-2.5 bg-[#1f2430] hover:bg-[#282e3c] border border-[#343b4e] text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                View Analytics Charts
              </button>

              <button
                onClick={() => setCompletedSession(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
              >
                Continue Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. UPLOAD HTML / CUSTOM BOOK MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#16181d] rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#2b3140] space-y-5">
            <div className="flex items-center justify-between border-b border-[#232731] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  Upload HTML Book or SAT Passage
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Title & Author Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">
                    Document / Book Title
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. A Christmas Carol"
                    className="w-full bg-[#111317] border border-[#2a3040] text-white p-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">
                    Author / Source
                  </label>
                  <input
                    type="text"
                    value={uploadAuthor}
                    onChange={(e) => setUploadAuthor(e.target.value)}
                    placeholder="e.g. Charles Dickens"
                    className="w-full bg-[#111317] border border-[#2a3040] text-white p-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* File upload picker */}
              <div className="p-4 bg-[#111317] border-2 border-dashed border-[#2e3547] rounded-xl text-center space-y-2">
                <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-slate-300 font-semibold">
                  Upload a <code>.html</code>, <code>.htm</code>, or <code>.txt</code> file from your computer
                </p>
                <label className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept=".html,.htm,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste Raw HTML / Text alternative */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">
                  Or Paste HTML / Text Content Below:
                </label>
                <textarea
                  value={uploadHtmlText}
                  onChange={(e) => setUploadHtmlText(e.target.value)}
                  placeholder="<h2>Chapter 1</h2><p>Paste entire HTML text or classic literature here...</p>"
                  rows={6}
                  className="w-full font-mono text-xs bg-[#111317] border border-[#2a3040] text-slate-200 p-3 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/50 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232731]">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="py-2 px-4 text-xs font-bold text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUploadedBook}
                className="py-2.5 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow cursor-pointer"
              >
                Save & Start Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
