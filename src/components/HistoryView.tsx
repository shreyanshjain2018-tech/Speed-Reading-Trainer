import React, { useState } from "react";
import type { ReadingSessionStats } from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  LineChart,
} from "recharts";
import {
  TrendingUp,
  Brain,
  Zap,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  Award,
  ChevronLeft,
  ChevronRight,
  Database,
  BarChart2,
  RefreshCw,
  Cloud,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Sparkles,
  FileJson,
  X,
} from "lucide-react";
import { getWpmFeedback } from "../utils";
import type { User } from "../firebase";

function normalizeTimestamp(ts: any): number {
  if (typeof ts === "number") return ts;
  if (!ts) return 0;
  if (typeof ts.toDate === "function") {
    try {
      return ts.toDate().getTime();
    } catch (e) {}
  }
  if (typeof ts.seconds === "number") {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1000000);
  }
  if (typeof ts.seconds === "string") {
    const s = Number(ts.seconds);
    if (!isNaN(s)) return s * 1000;
  }
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) return parsed;
    const num = Number(ts);
    if (!isNaN(num)) return num;
  }
  return 0;
}

interface HistoryViewProps {
  history: ReadingSessionStats[];
  onClearHistory: () => void;
  onDeleteSession: (timestamp: number) => void;
  onBack: () => void;
  currentUser?: User | null;
  isSyncing?: boolean;
  syncStatus?: string | null;
  syncError?: string | null;
  onManualSync?: () => void;
  onSignIn?: () => void;
  onRestorePreRecorded?: () => void;
  onImportSessions?: (json: string) => void;
  onExportSessions?: () => void;
}

export default function HistoryView({
  history,
  onClearHistory,
  onDeleteSession,
  onBack,
  currentUser,
  isSyncing = false,
  syncStatus,
  syncError,
  onManualSync,
  onSignIn,
  onRestorePreRecorded,
  onImportSessions,
  onExportSessions,
}: HistoryViewProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importModalError, setImportModalError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
        setImportModalError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importJsonText.trim()) {
      setImportModalError("Please paste your JSON session array or upload a backup file.");
      return;
    }
    if (!onImportSessions) return;
    try {
      onImportSessions(importJsonText);
      setIsImportModalOpen(false);
      setImportJsonText("");
      setImportModalError(null);
    } catch (err: any) {
      setImportModalError(err?.message || "Failed to import sessions. Verify JSON format.");
    }
  };
  // Safe empty check
  const isEmpty = history.length === 0;

  // Calculate high-level core statistics
  const totalSessions = history.length;
  const avgWpm = totalSessions
    ? Math.round(history.reduce((acc, curr) => acc + curr.wpm, 0) / totalSessions)
    : 0;

  const maxWpm = totalSessions
    ? Math.max(...history.map((s) => s.wpm))
    : 0;

  const totalWordsRead = history.reduce((acc, curr) => acc + curr.totalWords, 0);

  // Comprehension stats (only sessions with quiz completed)
  const quizSessions = history.filter(
    (s) => s.comprehensionScore !== undefined && s.comprehensionScore !== null
  );
  const avgCompPercent = quizSessions.length
    ? Math.round(
        (quizSessions.reduce(
          (acc, curr) =>
            acc +
            (curr.comprehensionScore! / (curr.comprehensionMax || 5)),
          0
        ) /
          quizSessions.length) *
          100
      )
    : null;

  // Format historical data for Recharts
  const chartData = [...history]
    .map((s) => ({ ...s, timestamp: normalizeTimestamp(s.timestamp) }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((session, index) => {
      const date = new Date(session.timestamp);
      const label = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const compPercent =
        session.comprehensionScore !== undefined && session.comprehensionScore !== null
          ? Math.round(
              (session.comprehensionScore / (session.comprehensionMax || 5)) * 100
            )
          : null;

      return {
        id: session.timestamp,
        index: index + 1,
        label,
        "Reading Speed (WPM)": session.wpm,
        "Comprehension %": compPercent,
        words: session.totalWords,
        title: session.textTitle || "Custom Material",
        err: compPercent !== null ? Math.round(session.wpm * (compPercent / 100)) : null,
      };
    });

  // Latest feedback
  const latestWpm = history.length > 0 ? history[history.length - 1].wpm : 0;
  const latestFeedback = latestWpm ? getWpmFeedback(latestWpm) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="progress-history-dashboard">
      {/* Top Breadcrumb Nav and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="space-y-1">
          <button
            onClick={onBack}
            id="btn-back-to-trainer"
            className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Trainer Setup
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 pt-2">
            <BarChart2 className="w-8 h-8 text-indigo-600" />
            My Speed Reading Analytics
          </h1>
          <p className="text-xs text-slate-400">
            Monitor your gaze speed, attention span metrics, and cognitive retention curves over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Cloud Sync Status / Button */}
          {onManualSync && (
            <button
              onClick={currentUser ? onManualSync : onSignIn}
              disabled={isSyncing}
              id="btn-sync-firebase"
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                currentUser
                  ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
              } ${isSyncing ? "opacity-70 cursor-wait" : ""}`}
              title={currentUser ? "Force sync all sessions with Firebase" : "Sign in to sync with Firebase"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
              {isSyncing
                ? "Syncing..."
                : currentUser
                ? "Sync with Cloud"
                : "Sign In & Sync Cloud"}
            </button>
          )}

          {/* Export JSON Button */}
          {!isEmpty && onExportSessions && (
            <button
              onClick={onExportSessions}
              id="btn-export-sessions"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Export session data as a downloadable JSON file and copy to clipboard"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export JSON
            </button>
          )}

          {/* Import JSON Button */}
          {onImportSessions && (
            <button
              onClick={() => {
                setImportModalError(null);
                setIsImportModalOpen(true);
              }}
              id="btn-import-sessions"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Import session history from a JSON backup or transferred clipboard"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" /> Import JSON
            </button>
          )}

          {!isEmpty && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to permanently erase all speed reading session logs?"
                  )
                ) {
                  onClearHistory();
                }
              }}
              id="btn-purge-history"
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Purge History Logs
            </button>
          )}
        </div>
      </div>

      {/* Sync Status / Error Banner */}
      {syncError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{syncError}</span>
          </div>
          {onManualSync && (
            <button
              onClick={currentUser ? onManualSync : onSignIn}
              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {syncStatus && !syncError && (
        <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 flex items-center gap-2 text-xs text-indigo-800">
          <CheckCircle className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>{syncStatus}</span>
        </div>
      )}

      {isEmpty ? (
        /* HELPFUL RECOVERY & EMPTY STATE */
        <div className="space-y-6 select-none">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <Database className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h3 className="text-xl font-bold text-slate-800">No Analytics in this Browser Window Yet</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-sans">
                If you completed reading runs inside the AI Studio preview window, modern browsers store them in that window's local sandbox until synced to Google Cloud.
              </p>
            </div>

            {/* Recovery Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-2">
              {/* Option 1: One-Click Restore Pre-Recorded Runs */}
              {onRestorePreRecorded && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Restore Recorded Runs</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                      Instantly restore your <strong>16 visual training runs</strong> (931 Avg WPM, 1523 Peak WPM, 20,923 words) and push them straight to your Firebase database.
                    </p>
                  </div>
                  <button
                    onClick={onRestorePreRecorded}
                    id="btn-restore-runs-empty"
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Restore 16 Recorded Runs
                  </button>
                </div>
              )}

              {/* Option 2: Auto-Sync via AI Studio Tab */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Cloud className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Auto-Sync from AI Studio</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                    Switch back to the <strong>AI Studio preview tab</strong> and refresh it once. It will automatically upload any cached sessions to your Google account, and they will appear here instantly!
                  </p>
                </div>
                <button
                  onClick={currentUser ? onManualSync : onSignIn}
                  id="btn-cloud-sync-empty"
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Check Cloud Sync
                </button>
              </div>
            </div>

            {/* Launch Trainer Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onBack}
                id="cta-start-reading-btn"
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-xs transition-transform hover:scale-[1.01] cursor-pointer flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Launch Fixation Trainer
              </button>

              {onImportSessions && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  id="cta-import-json-btn"
                  className="py-2.5 px-5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  Import from JSON
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* REAL DIAGNOSTIC DATA AND CHARTS SHOWCASE */
        <div className="space-y-8 animate-fadeIn">
          
          {/* Key Metrics Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            {/* Avg Speed */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                Average Speed
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-extrabold text-indigo-700">
                  {avgWpm}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">WPM</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                Across {totalSessions} visual training runs.
              </p>
            </div>

            {/* Peak Wpm */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                Peak Velocity
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-extrabold text-emerald-600">
                  {maxWpm}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">WPM</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                Your highest registered fixation scanning speed.
              </p>
            </div>

            {/* Total volume */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                Cognitive Volume
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-extrabold text-slate-800">
                  {totalWordsRead.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">words</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                Total aggregate information absorbed down columns.
              </p>
            </div>

            {/* Comprehension Rating */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                Comprehension Avg
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-extrabold text-pink-600">
                  {avgCompPercent !== null ? `${avgCompPercent}%` : "N/A"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                {quizSessions.length > 0
                  ? `Computed from ${quizSessions.length} active AI quizzes.`
                  : "Submit an AI quiz to trace retention."}
              </p>
            </div>
          </div>

          {/* Visual Speed Curve & Comprehension Dual Chart container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none">
            {/* Real React Charts (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Speed timeline (Line Chart) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-800 text-sm">Velocity Progress curve</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Chronological performance history (WPM)
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="index"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        wrapperStyle={{ outline: "none" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Reading Speed (WPM)"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorWpm)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comprehension vs Speed correlation chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-pink-500" />
                    <h3 className="font-bold text-slate-800 text-sm">
                      Comprehension & Speed Tradeoff
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Does high velocity degrade recall?
                  </span>
                </div>

                {quizSessions.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
                    <span className="text-xs font-bold text-slate-700">No Assessment Data</span>
                    <p className="text-[11px] text-slate-400 max-w-xs font-sans">
                      We need AI quiz results to map retention. Complete an active quiz after reading to unlock this chart.
                    </p>
                  </div>
                ) : (
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="index"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                        />
                        <YAxis
                          yAxisId="left"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                          domain={[0, 'auto']}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                          domain={[0, 100]}
                          unit="%"
                        />
                        <Tooltip content={<DualTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          yAxisId="left"
                          dataKey="Reading Speed (WPM)"
                          fill="#4f46e5"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="Comprehension %"
                          fill="#ec4899"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Side column: Latest speed categorization AND logs (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Latest Run Profile Coaching Box */}
              {latestFeedback && (
                <div className={`p-5 rounded-2xl border-2 ${latestFeedback.color} space-y-2`}>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4.5 h-4.5 fill-current shrink-0" />
                    <span className="text-[10px] uppercase font-bold tracking-wider font-sans">
                      Active Rhythm Status:
                    </span>
                  </div>
                  <h4 className="font-bold text-sm leading-normal">{latestFeedback.category}</h4>
                  <p className="text-[11px] leading-relaxed font-sans">{latestFeedback.description}</p>
                </div>
              )}

              {/* Chronicle Log Book */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">
                    Chronological Logs
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-sm">
                    {history.length} runs
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {chartData.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors space-y-2 text-left"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-xs line-clamp-1">
                            {session.title}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            {session.label}
                          </span>
                        </div>
                        <button
                          onClick={() => onDeleteSession(session.id)}
                          id={`delete-btn-${session.id}`}
                          className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-slate-50 shrink-0 transition-colors"
                          title="Delete Session Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500 font-semibold">
                        <span className="flex items-center gap-0.5 text-slate-700">
                          <Zap className="w-3 h-3 text-indigo-500" /> {session["Reading Speed (WPM)"]} WPM
                        </span>
                        <span>{session.words} words</span>
                        {session["Comprehension %"] !== null ? (
                          <span className="text-pink-600 flex items-center gap-0.5">
                            <Brain className="w-3 h-3" /> {session["Comprehension %"]}% comp
                          </span>
                        ) : (
                          <span className="text-slate-300">No comprehension quiz</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* JSON Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Import Reading Sessions</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Paste your exported JSON session array below, or choose a <code>.json</code> backup file from your computer:
            </p>

            <div className="space-y-2">
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='[{"textTitle": "...", "wpm": 931, "timestamp": 1718637960000, ...}]'
                rows={6}
                className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center gap-1.5 cursor-pointer text-indigo-600 hover:text-indigo-700 font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload JSON file</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[10px] text-slate-400">Supports standard speed reader exports</span>
              </div>
            </div>

            {importModalError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{importModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="py-2 px-4 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                className="py-2 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
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

/**
 * Custom tooltips for clean charts
 */
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-left space-y-1.5 shadow-md max-w-xs">
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
          Session #{data.index} &bull; {data.label}
        </span>
        <h4 className="font-bold text-xs leading-normal font-sans line-clamp-1">{data.title}</h4>
        <div className="flex items-center justify-between text-xs font-mono pt-1">
          <span className="text-slate-400">Total volume:</span>
          <strong>{data.words} words</strong>
        </div>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-indigo-400 font-semibold">Speed:</span>
          <strong className="text-indigo-300">{data["Reading Speed (WPM)"]} WPM</strong>
        </div>
      </div>
    );
  }
  return null;
}

function DualTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-left space-y-1.5 shadow-md">
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
          Correlation Check
        </span>
        <h4 className="font-bold text-xs leading-normal font-sans text-slate-200 line-clamp-1">{data.title}</h4>
        <div className="space-y-1 pt-1 font-mono text-xs">
          <div className="flex justify-between gap-6">
            <span className="text-indigo-400">Speed (WPM):</span>
            <strong className="text-indigo-300">{data["Reading Speed (WPM)"]} WPM</strong>
          </div>
          {data["Comprehension %"] !== null ? (
            <>
              <div className="flex justify-between gap-6">
                <span className="text-pink-400">Comprehension %:</span>
                <strong className="text-pink-300">{data["Comprehension %"]}%</strong>
              </div>
              <div className="flex justify-between gap-6 border-t border-slate-800 pt-1 mt-1 font-sans text-xs">
                <span className="text-emerald-400 font-semibold">Effective Speed:</span>
                <strong className="text-emerald-300 font-mono">{data.err} WPM</strong>
              </div>
            </>
          ) : (
            <div className="text-[10px] text-slate-400 italic">Quiz was skipped.</div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
