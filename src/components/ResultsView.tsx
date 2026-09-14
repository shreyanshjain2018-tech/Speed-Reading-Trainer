import type { ReadingSessionStats } from "../types";
import { getWpmFeedback } from "../utils";
import { Calendar, Clock, Gauge, Sparkles, RefreshCw } from "lucide-react";

interface ResultsViewProps {
  stats: ReadingSessionStats;
  onStartQuiz: () => void;
  onRestart: () => void;
}

export default function ResultsView({
  stats,
  onStartQuiz,
  onRestart,
}: ResultsViewProps) {
  const feedback = getWpmFeedback(stats.wpm);

  return (
    <div className="max-w-2xl mx-auto space-y-8 select-none" id="results-view-workbench">
      {/* Visual Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-800">Reading Session Completed</h1>
        <p className="text-xs text-slate-400">Excellent discipline. Let's analyze your metrics and test your retention.</p>
      </div>

      {/* Prominent Make Quiz Action at top */}
      <div className="bg-indigo-600 text-white rounded-2xl p-6 relative overflow-hidden space-y-4 shadow-xl translate-y-2">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/50 rounded-full translate-x-12 -translate-y-12 blur-2xl" />

        <div className="space-y-1.5 relative z-10 text-center pb-2">
          <h3 className="font-extrabold text-lg flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-200 fill-current" />
            Check Your Comprehension
          </h3>
          <p className="text-xs text-indigo-100 leading-relaxed font-sans max-w-md mx-auto">
            Reading fast requires high retention. Click below to use AI to generate 5 tailored quiz questions covering the core concepts of this text.
          </p>
        </div>

        <div className="flex justify-center relative z-10">
          <button
            onClick={onStartQuiz}
            id="results-generate-quiz-btn"
            className="py-4 px-8 bg-white text-indigo-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-extrabold text-base shadow-lg hover:scale-[1.03] hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-current cursor-pointer text-indigo-500" />
            Make Quiz with AI
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        
        {/* Speed Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-1 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
            <Gauge className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Reading Speed
          </span>
          <span className="text-4xl font-extrabold text-slate-800 font-mono tracking-tight block">
            {stats.wpm}
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Words per minute</span>
        </div>

        {/* Time Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-1 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Time Taken
          </span>
          <span className="text-4xl font-extrabold text-slate-800 font-mono tracking-tight block">
            {Math.round(stats.durationSeconds)}s
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Elapsed Seconds</span>
        </div>

        {/* Volume Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-1 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Total Content
          </span>
          <span className="text-4xl font-extrabold text-slate-800 font-mono tracking-tight block">
            {stats.totalWords}
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Words Total</span>
        </div>
      </div>

      {/* Speed Feedback Panel */}
      <div className={`p-6 rounded-2xl border-2 ${feedback.color} space-y-2`}>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider opacity-70">
            Speed Profile:
          </span>
          <strong className="text-sm font-bold">{feedback.category}</strong>
        </div>
        <p className="text-xs leading-relaxed opacity-90 font-sans">
          {feedback.description}
        </p>
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={onRestart}
          id="results-restart-setup"
          className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 hover:bg-slate-100 px-6 py-3 rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Setup New Text or Retry
        </button>
      </div>
    </div>
  );
}
