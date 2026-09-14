import React, { useMemo, useState } from "react";
import { Book, BookReadingSession } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import {
  BarChart2,
  TrendingUp,
  Clock,
  BookOpen,
  Calendar,
  Flame,
  Download,
  Upload,
  Trash2,
  Bookmark,
  Play,
  ArrowRight,
  Zap,
  Award,
  RotateCcw
} from "lucide-react";
import { exportBookSessionsToJson } from "../bookStorage";

interface BookProgressViewProps {
  books: Book[];
  sessions: BookReadingSession[];
  onSelectBookAndRead: (bookId: string) => void;
  onDeleteBookAndHistory?: (bookId: string) => void;
  onPurgeBookHistory?: (bookId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onImportSessions: (jsonStr: string) => void;
  onBackToReader: () => void;
}

export default function BookProgressView({
  books,
  sessions,
  onSelectBookAndRead,
  onDeleteBookAndHistory,
  onPurgeBookHistory,
  onDeleteSession,
  onClearAllSessions,
  onImportSessions,
  onBackToReader,
}: BookProgressViewProps) {
  const [importJsonText, setImportJsonText] = useState<string>("");
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{ type: "delete" | "purge"; bookId: string } | null>(null);

  // Overall aggregate metrics
  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalWords: 0,
        totalSeconds: 0,
        avgWpm: 0,
        peakWpm: 0,
        streakDays: 0,
        totalSessions: 0,
      };
    }

    const totalWords = sessions.reduce((acc, s) => acc + s.wordsRead, 0);
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const avgWpm = totalSeconds > 0 ? Math.round((totalWords / totalSeconds) * 60) : 0;
    const peakWpm = Math.max(...sessions.map((s) => s.wpm));

    // Calculate unique reading days & active streak
    const uniqueDates = Array.from(new Set(sessions.map((s) => s.dateString))).sort();

    return {
      totalWords,
      totalSeconds,
      avgWpm,
      peakWpm,
      streakDays: uniqueDates.length,
      totalSessions: sessions.length,
    };
  }, [sessions]);

  // Group words read by date for the daily bar chart
  const dailyChartData = useMemo(() => {
    const map = new Map<string, { date: string; words: number; avgWpm: number; count: number; totalWpm: number }>();

    sessions.forEach((s) => {
      const dateKey = s.dateString;
      const existing = map.get(dateKey);
      if (!existing) {
        map.set(dateKey, {
          date: dateKey.slice(5), // "MM-DD"
          words: s.wordsRead,
          avgWpm: s.wpm,
          count: 1,
          totalWpm: s.wpm,
        });
      } else {
        existing.words += s.wordsRead;
        existing.count += 1;
        existing.totalWpm += s.wpm;
        existing.avgWpm = Math.round(existing.totalWpm / existing.count);
      }
    });

    return Array.from(map.values());
  }, [sessions]);

  // WPM trend chart data
  const wpmTrendData = useMemo(() => {
    return sessions.map((s, idx) => ({
      index: idx + 1,
      date: s.dateString.slice(5),
      wpm: s.wpm,
      bookTitle: s.bookTitle,
      words: s.wordsRead,
    }));
  }, [sessions]);

  const handleExport = () => {
    try {
      const json = exportBookSessionsToJson(sessions);
      navigator.clipboard?.writeText(json);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `book_reading_progress_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  const handleImportSubmit = () => {
    try {
      if (!importJsonText.trim()) {
        setImportError("Please enter valid JSON text.");
        return;
      }
      onImportSessions(importJsonText);
      setIsImportModalOpen(false);
      setImportJsonText("");
      setImportError(null);
    } catch (e: any) {
      setImportError(e?.message || "Failed to parse imported JSON.");
    }
  };

  return (
    <div className="w-full space-y-6" id="book-progress-view-container">
      {/* 1. Header Bar with Navigation Back to Reader */}
      <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Long-Form Reading Progress & Daily Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Track daily words read, sustained velocity over full chapters, and multi-day book bookmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={sessions.length === 0}
            className="px-3 py-2 bg-[#1f2430] hover:bg-[#282e3c] border border-[#343b4e] text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-[#1f2430] hover:bg-[#282e3c] border border-[#343b4e] text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import</span>
          </button>

          <button
            onClick={onBackToReader}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Go to Reader</span>
          </button>
        </div>
      </div>

      {/* 2. Top Aggregate Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Words Read */}
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Words Read
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400">
              {stats.totalWords.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold">words</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Across {stats.totalSessions} sessions</span>
        </div>

        {/* Sustained Average Speed */}
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Average Speed
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-indigo-400">
              {stats.avgWpm}
            </span>
            <span className="text-xs text-slate-400 font-semibold">WPM</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Peak: {stats.peakWpm} WPM</span>
        </div>

        {/* Reading Time */}
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Time Invested
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-pink-400">
              {Math.floor(stats.totalSeconds / 60)}m {stats.totalSeconds % 60}s
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">Focused immersion</span>
        </div>

        {/* Active Reading Days */}
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Reading Days
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
              {stats.streakDays}
            </span>
            <span className="text-xs text-slate-400 font-semibold">days</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Consistent habit</span>
        </div>
      </div>

      {/* 3. Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Words Read Bar Chart */}
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Daily Words Read Volume</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">By Date</span>
          </div>

          <div className="h-60 w-full">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232731" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111317",
                      borderColor: "#2e3444",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} words`, "Volume"]}
                  />
                  <Bar dataKey="words" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Complete your first book reading session to view daily charts.
              </div>
            )}
          </div>
        </div>

        {/* Speed (WPM) Velocity Trend */}
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Reading Velocity (WPM) Progression</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Session by Session</span>
          </div>

          <div className="h-60 w-full">
            {wpmTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wpmTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232731" vertical={false} />
                  <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Sessions', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111317",
                      borderColor: "#2e3444",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} WPM (${item.payload.bookTitle})`,
                      "Speed",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="wpm"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Complete your first book reading session to view velocity trends.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bookshelf & Bookmark Status Card */}
      <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#232731] pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Your Active Bookshelf</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{books.length} Books</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((b) => {
            const pct = b.totalWords > 0
              ? Math.min(100, Math.round(((b.currentWordIndex || 0) / b.totalWords) * 100))
              : 0;
            const bookSessionCount = sessions.filter((s) => s.bookId === b.id).length;

            return (
              <div
                key={b.id}
                className="bg-[#111317] border border-[#242935] rounded-xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-sm line-clamp-1">{b.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f2430] text-indigo-300 font-bold shrink-0">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 italic">By {b.author}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{b.description || "Uploaded custom document"}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {bookSessionCount} recorded sessions &bull; {b.totalWords.toLocaleString()} total words
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#1f2430]">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Word {b.currentWordIndex?.toLocaleString() || 0} / {b.totalWords.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[#1b1f28] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    <button
                      onClick={() => onSelectBookAndRead(b.id)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Continue Reading</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {onPurgeBookHistory && (
                        <button
                          onClick={() => {
                            if (confirmingAction?.type === "purge" && confirmingAction.bookId === b.id) {
                              onPurgeBookHistory(b.id);
                              setConfirmingAction(null);
                            } else {
                              setConfirmingAction({ type: "purge", bookId: b.id });
                            }
                          }}
                          title="Purge all reading logs and reset bookmark for this book"
                          className="flex-1 py-1 px-2 bg-[#191d26] hover:bg-amber-950/40 text-slate-400 hover:text-amber-300 border border-[#282f3e] hover:border-amber-700/50 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{confirmingAction?.type === "purge" && confirmingAction.bookId === b.id ? "Confirm?" : "Purge History"}</span>
                        </button>
                      )}

                      {onDeleteBookAndHistory && (
                        <button
                          onClick={() => {
                            if (confirmingAction?.type === "delete" && confirmingAction.bookId === b.id) {
                              onDeleteBookAndHistory(b.id);
                              setConfirmingAction(null);
                            } else {
                              setConfirmingAction({ type: "delete", bookId: b.id });
                            }
                          }}
                          title="Delete book and purge all history"
                          className="py-1 px-2.5 bg-[#191d26] hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-[#282f3e] hover:border-rose-800/60 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{confirmingAction?.type === "delete" && confirmingAction.bookId === b.id ? "Confirm?" : "Delete"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Chronological Session Logs Table */}
      <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#232731] pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Book Reading Logs</h3>
          </div>

          {sessions.length > 0 && (
            <button
              onClick={onClearAllSessions}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#111317] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#242935]">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Book / Passage</th>
                  <th className="py-3 px-3">Word Range</th>
                  <th className="py-3 px-3">Words Read</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Speed (WPM)</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242935]">
                {[...sessions].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-[#1b1f28]/60 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">{s.dateString}</td>
                    <td className="py-3 px-3 font-bold text-white max-w-[200px] truncate">{s.bookTitle}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      #{s.startWordIndex} &rarr; #{s.endWordIndex}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {s.wordsRead.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-indigo-400">
                      {s.wpm} WPM
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDeleteSession(s.id)}
                        className="p-1.5 hover:bg-rose-950/60 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete session log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 space-y-1">
            <p>No book sessions recorded yet.</p>
            <p>Start reading in the SAT/Book Reader tab to build your analytics profile!</p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#16181d] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2b3140] space-y-4">
            <div className="flex items-center justify-between border-b border-[#232731] pb-3">
              <h3 className="font-bold text-white text-base">Import Book Sessions</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste the exported JSON session data below:
            </p>

            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON here..."
              rows={6}
              className="w-full font-mono text-xs bg-[#111317] border border-[#2a3040] text-slate-200 p-3 rounded-xl focus:outline-none focus:border-indigo-500"
            />

            {importError && (
              <p className="text-xs text-rose-400 font-bold">{importError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232731]">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="py-2 px-3 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="py-2 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow cursor-pointer"
              >
                Import Sessions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
