import React, { useState } from "react";
import { ReadingSample, READING_SAMPLES } from "../data";
import type { ReaderConfig } from "../types";
import { FontFamily } from "../types";
import { countWords } from "../utils";
import { BookOpen, Sliders, Settings, Play, Eye, FileText, Check } from "lucide-react";

interface SetupViewProps {
  config: ReaderConfig;
  onChangeConfig: (config: ReaderConfig) => void;
  onStartReading: () => void;
}

export default function SetupView({
  config,
  onChangeConfig,
  onStartReading,
}: SetupViewProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");

  const wordCount = countWords(config.text);

  const handleSelectSample = (sample: ReadingSample) => {
    setSelectedSampleId(sample.id);
    onChangeConfig({
      ...config,
      text: sample.text,
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSelectedSampleId(""); // reset selected sample if they type custom
    onChangeConfig({
      ...config,
      text: e.target.value,
    });
  };

  const updateConfigVal = <K extends keyof ReaderConfig>(
    key: K,
    val: ReaderConfig[K]
  ) => {
    onChangeConfig({
      ...config,
      [key]: val,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none" id="setup-view-root">
      {/* Intro Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Visual Fixation Trainer
        </h1>
        <p className="max-w-2xl mx-auto font-sans text-base text-slate-400">
          Train your eyes to scan downwards in vertical bursts rather than reading
          word-by-word horizontally. Inspired by Norman Lewis's classic reading method,
          this tool prepares your gaze for rapid visual comprehension.
        </p>
      </div>

      {/* Grid: 1. Text Paste, 2. Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Text input and Samples (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#16181d] p-5 rounded-2xl border border-[#232731] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="reading-input-text"
                className="font-semibold text-slate-200 flex items-center gap-2"
              >
                <FileText className="w-5 h-5 text-indigo-400" />
                Reading Material
              </label>
              <span className="text-xs font-mono font-medium text-slate-400 bg-[#101216] border border-[#232731] px-2 py-0.5 rounded-sm">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </span>
            </div>

            <textarea
              id="reading-input-text"
              className="w-full h-64 p-4 border border-[#292e3b] rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-600 transition-shadow bg-[#101216] text-slate-200"
              placeholder="Paste your custom reading material here, or select one of the classic speed reading exercises below..."
              value={config.text}
              onChange={handleTextChange}
            />
          </div>

          {/* Quick Samples Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Practice Preset Exercises & Excerpts
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {READING_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  id={`btn-sample-${sample.id}`}
                  className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between h-36 cursor-pointer ${
                    selectedSampleId === sample.id
                      ? "border-indigo-500 bg-[#1c1f2b] ring-1 ring-indigo-500"
                      : "border-[#242935] bg-[#16181d] hover:border-[#373e4f] hover:bg-[#1a1d24]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {sample.topic}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                          sample.difficulty === "Easy"
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                            : sample.difficulty === "Medium"
                            ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                            : "bg-purple-950/60 text-purple-400 border-purple-800/40"
                        }`}
                      >
                        {sample.difficulty}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-200 line-clamp-2">
                      {sample.title}
                    </h4>
                  </div>
                  {selectedSampleId === sample.id ? (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 mt-2">
                      <Check className="w-3.5 h-3.5" /> Loading exercise
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 mt-2 hover:text-slate-300">
                      Click to use &rarr;
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Config & visual parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#16181d] p-6 rounded-2xl border border-[#232731] shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-[#232731] pb-3">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-slate-100">Trainer Parameters</h2>
            </div>

            {/* SAT & ACT Exam Simulator Arrangement (Moved to Top for Prominence) */}
            <div className="flex items-center justify-between p-3 bg-[#25151c] border border-[#441c29] rounded-xl transition-colors">
              <div>
                <span className="text-sm font-bold text-rose-400 block">
                  SAT & ACT Test Mode Layout
                </span>
                <span className="text-[11px] text-rose-400/80 leading-normal font-medium">
                  Enables classic passage blocks with margin line numbers (Line 5, 10, etc.)
                </span>
              </div>
              <button
                onClick={() => {
                  onChangeConfig({
                    ...config,
                    satActMode: !config.satActMode,
                    // For SAT/ACT authenticity, default to Serif classic font when toggled on
                    fontFamily: !config.satActMode ? FontFamily.SERIF : config.fontFamily
                  });
                }}
                id="toggle-sat-act-mode"
                className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-150 ease-in-out focus:outline-none flex-shrink-0 cursor-pointer ${
                  config.satActMode ? "bg-rose-500" : "bg-[#381a23]"
                }`}
              >
                <div
                  className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                    config.satActMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Column Width: Words Per Line */}
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-transparent">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Words per Fixation (Segmented tabs)
                </label>
                <span className="text-xs font-mono font-bold text-indigo-300 bg-[#1e2230] border border-indigo-500/30 px-2 py-0.5 rounded-md">
                  {config.wordsPerLine} {config.wordsPerLine === 1 ? "word" : "words"} / glance
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Select your focus span. 1 is for single-word saccadic focus; 2 to 3 is Norman Lewis's optimal pacing; 4+ expands peripheral visual bounds.
              </p>
              
              <div className="flex p-1 bg-[#101216] border border-[#242935] rounded-xl relative">
                {[1, 2, 3, 4, 5, 6].map((w) => (
                  <button
                    key={w}
                    onClick={() => updateConfigVal("wordsPerLine", w)}
                    id={`btn-words-width-${w}`}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                      config.wordsPerLine === w
                        ? "bg-[#252a36] text-white shadow-xs border border-[#373e4f]"
                        : "text-slate-400 hover:text-white hover:bg-[#181b22]"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Style: Family, Size, Alignment */}
            <div className="space-y-4 pt-2 border-t border-[#232731]">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                Visual Typography Setup
              </label>

              {/* Font Family */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400">Card Font:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateConfigVal("fontFamily", FontFamily.SANS)}
                    id="btn-font-sans"
                    className={`py-1.5 px-2 text-xs rounded-md transition-all cursor-pointer ${
                      config.fontFamily === FontFamily.SANS
                        ? "bg-[#252a36] text-white border border-[#373e4f] font-sans font-medium"
                        : "bg-[#101216] hover:bg-[#191c24] text-slate-400 border border-[#242935] font-sans"
                    }`}
                  >
                    Clean Sans
                  </button>
                  <button
                    onClick={() => updateConfigVal("fontFamily", FontFamily.SERIF)}
                    id="btn-font-serif"
                    className={`py-1.5 px-2 text-xs rounded-md transition-all cursor-pointer ${
                      config.fontFamily === FontFamily.SERIF
                        ? "bg-[#252a36] text-white border border-[#373e4f] font-serif font-medium"
                        : "bg-[#101216] hover:bg-[#191c24] text-slate-400 border border-[#242935] font-serif"
                    }`}
                  >
                    Serif Classic
                  </button>
                  <button
                    onClick={() => updateConfigVal("fontFamily", FontFamily.MONO)}
                    id="btn-font-mono"
                    className={`py-1.5 px-2 text-xs rounded-md transition-all cursor-pointer ${
                      config.fontFamily === FontFamily.MONO
                        ? "bg-[#252a36] text-white border border-[#373e4f] font-mono font-medium"
                        : "bg-[#101216] hover:bg-[#191c24] text-slate-400 border border-[#242935] font-mono"
                    }`}
                  >
                    Monospace
                  </button>
                </div>
              </div>

              {/* Font Size & Alignment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400">Font Size:</span>
                  <select
                    className="w-full text-xs p-2 border border-[#292e3b] bg-[#101216] text-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={config.fontSize}
                    onChange={(e) =>
                      updateConfigVal("fontSize", e.target.value as any)
                    }
                    id="select-font-size"
                  >
                    <option value="base">Medium (16px)</option>
                    <option value="lg">Large (18px)</option>
                    <option value="xl">X-Large (20px)</option>
                    <option value="2xl">2X-Large (24px)</option>
                    <option value="3xl">3X-Large (30px)</option>
                    <option value="4xl">4X-Large (36px)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400">Alignment:</span>
                  <div className="flex gap-1.5 border border-[#242935] p-0.5 bg-[#101216] rounded-md">
                    <button
                      onClick={() => updateConfigVal("alignment", "center")}
                      id="alignment-center"
                      className={`flex-1 text-[10px] uppercase font-bold py-1 px-1 rounded-sm text-center transition-all cursor-pointer ${
                        config.alignment === "center"
                          ? "bg-[#252a36] text-white shadow-2xs border border-[#373e4f]"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Centered
                    </button>
                    <button
                      onClick={() => updateConfigVal("alignment", "left")}
                      id="alignment-left"
                      className={`flex-1 text-[10px] uppercase font-bold py-1 px-1 rounded-sm text-center transition-all cursor-pointer ${
                        config.alignment === "left"
                          ? "bg-[#252a36] text-white shadow-2xs border border-[#373e4f]"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Left-aligned
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Helpers toggle center-guide line, etc */}
            <div className="space-y-3 pt-4 border-t border-[#232731]">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                Eye Tracking Aids
              </label>

              {/* Guiding Line */}
              <div className="flex items-center justify-between p-2 hover:bg-[#1a1d26] rounded-lg transition-colors">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">
                    Gaze Line Guide
                  </span>
                  <span className="text-[10px] text-slate-400 leading-normal">
                    Displays a subtle vertical guide line down the column center
                  </span>
                </div>
                <button
                  onClick={() => updateConfigVal("showCenterGuide", !config.showCenterGuide)}
                  id="toggle-guide-line"
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-150 ease-in-out focus:outline-none cursor-pointer ${
                    config.showCenterGuide ? "bg-indigo-600" : "bg-[#2a2f3c]"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                      config.showCenterGuide ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Automated Visual Pacer */}
              <div className="flex items-center justify-between p-2 hover:bg-[#1a1d26] rounded-lg transition-colors">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">
                    Visual Pacing Highlight
                  </span>
                  <span className="text-[10px] text-slate-400 leading-normal">
                    Paces a soft highlight line-by-line automatically
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateConfigVal("visualPacerEnabled", !config.visualPacerEnabled)
                  }
                  id="toggle-visual-pacer"
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-150 ease-in-out focus:outline-none cursor-pointer ${
                    config.visualPacerEnabled ? "bg-indigo-600" : "bg-[#2a2f3c]"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                      config.visualPacerEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Target WPM (if Pacer is active) */}
              {config.visualPacerEnabled && (
                <div className="p-3 bg-[#101216] border border-[#242935] rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Pacing Target WPM speed:
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {config.pacerWpm} WPM
                    </span>
                  </div>
                  <input
                    type="range"
                    className="w-full h-1.5 bg-[#252a36] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    min={100}
                    max={800}
                    step={25}
                    value={config.pacerWpm}
                    onChange={(e) => updateConfigVal("pacerWpm", parseInt(e.target.value))}
                    id="slider-pacer-wpm"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>100 WPM (Leisure)</span>
                    <span>300 WPM (Average)</span>
                    <span>800 WPM (Ultra)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Large Action trigger */}
          <button
            onClick={onStartReading}
            disabled={wordCount === 0}
            id="start-training-trigger"
            className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all ${
              wordCount > 0
                ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg shadow-indigo-600/20 hover:scale-[1.01]"
                : "bg-[#181b22] text-slate-600 cursor-not-allowed"
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            Enter Reading Trainer ({wordCount} words)
          </button>
        </div>
      </div>
    </div>
  );
}
