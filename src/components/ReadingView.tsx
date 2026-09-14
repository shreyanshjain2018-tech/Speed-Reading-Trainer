import { useState, useEffect, useRef } from "react";
import type { ReaderConfig, ReadingSessionStats } from "../types";
import { FontFamily } from "../types";
import { chunkTextIntoFixationLines, countWords, calculateWpm } from "../utils";
import { Play, Pause, RotateCcw, Check, Eye, EyeOff, Sliders, Settings2, HelpCircle } from "lucide-react";

interface ReadingViewProps {
  config: ReaderConfig;
  onChangeConfig: (config: ReaderConfig) => void;
  onFinishReading: (stats: ReadingSessionStats) => void;
  onBack: () => void;
}

export default function ReadingView({
  config,
  onChangeConfig,
  onFinishReading,
  onBack,
}: ReadingViewProps) {
  // Parsing lines
  const paragraphs = chunkTextIntoFixationLines(config.text, config.wordsPerLine);
  
  // Flatten lines for linear pointer tracking (useful for pacer)
  const flattenedLines = paragraphs.flatMap((p) => p.lines);
  const totalLines = flattenedLines.length;
  const totalWordsCount = countWords(config.text);

  // Stop watch and active metrics
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pacerLineIndex, setPacerLineIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Milliseconds per line calculation
  const getMsPerLine = () => {
    // Math: WPM = totalWords / (minutes)
    // words per line = config.wordsPerLine
    // lines read per minute = WPM / wordsPerLine
    // milliseconds per line = (60 * 1000) / lines read per minute
    //                       = (60,000 * wordsPerLine) / WPM
    return (60000 * config.wordsPerLine) / config.pacerWpm;
  };

  // Setup stopwatch loop
  useEffect(() => {
    if (isPlaying) {
      const tickRate = 20; // 50hz updates for silky smooth pacer scrolling
      const startTime = Date.now() - elapsedMs;

      timerRef.current = setInterval(() => {
        const currentElapsed = Date.now() - startTime;
        setElapsedMs(currentElapsed);

        if (config.visualPacerEnabled) {
          const msPerLine = getMsPerLine();
          const targetIndex = Math.floor(currentElapsed / msPerLine);
          if (targetIndex < totalLines) {
            setPacerLineIndex(targetIndex);
          } else {
            setPacerLineIndex(totalLines - 1);
          }
        }
      }, tickRate);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, elapsedMs, config.visualPacerEnabled, config.pacerWpm, config.wordsPerLine, totalLines]);

  // Sync scroll with active line when pacer is enabled (custom centered offset formula)
  useEffect(() => {
    if (config.visualPacerEnabled && isPlaying && containerRef.current) {
      const activeEl = document.getElementById(`line-group-${pacerLineIndex}`);
      if (activeEl) {
        const container = containerRef.current;
        const targetScrollTop =
          activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        
        // Use smooth behavior for lower WPMs, but auto for high speed to prevent jank
        const isHighSpeed = config.pacerWpm > 400;
        container.scrollTo({
          top: targetScrollTop,
          behavior: isHighSpeed ? "auto" : "smooth",
        });
      }
    }
  }, [pacerLineIndex, config.visualPacerEnabled, isPlaying, config.pacerWpm]);

  // Support hotkeys (Space to play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // prevent page scrolling on space
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setElapsedMs(0);
    setPacerLineIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLineClick = (idx: number) => {
    setPacerLineIndex(idx);
    const msPerLine = getMsPerLine();
    // Reset elapsed timer to start of this line
    setElapsedMs(idx * msPerLine);
  };

  const handleFinished = () => {
    setIsPlaying(false);
    const finalSeconds = elapsedMs / 1000;
    const stats_duration = Math.max(0.5, finalSeconds); // enforce minimum 0.5 sec to prevent division issues
    const finalWpm = calculateWpm(totalWordsCount, stats_duration);

    onFinishReading({
      totalWords: totalWordsCount,
      totalLines: totalLines,
      durationSeconds: stats_duration,
      wpm: finalWpm,
      timestamp: Date.now(),
    });
  };

  // Sizing mapping helper
  const sizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg/relaxed",
    xl: "text-xl/relaxed",
    "2xl": "text-2xl/relaxed",
    "3xl": "text-3xl/relaxed",
    "4xl": "text-4xl/relaxed",
  };

  const familyClasses = {
    [FontFamily.SANS]: "font-sans font-medium tracking-tight text-slate-200",
    [FontFamily.SERIF]: "font-serif tracking-normal leading-relaxed text-slate-200",
    [FontFamily.MONO]: "font-mono tracking-normal text-slate-200",
  };

  const elapsedSecondsCount = Math.floor(elapsedMs / 1000);
  const elapsedMinutes = Math.floor(elapsedSecondsCount / 60);
  const elapsedSecondsPart = elapsedSecondsCount % 60;
  const displayTime = `${elapsedMinutes.toString().padStart(2, "0")}:${elapsedSecondsPart
    .toString()
    .padStart(2, "0")}`;

  // Calculate live average speed up to this point
  const currentLiveWpm = isPlaying && elapsedMs > 500
    ? calculateWpm(totalWordsCount, elapsedMs / 1000)
    : 0;

  if (isPlaying) {
    return (
      <div 
        className="fixed inset-0 bg-[#111317] z-50 flex flex-col h-screen w-screen animate-fadeIn select-none text-slate-200" 
        id="fullscreen-training-pane"
      >
        {/* Main Column Training Stage Pane (Scroll Area) */}
        <div className="relative flex-1 bg-[#111317] overflow-hidden">
          {/* Outer scrolling container centering the narrow column strictly */}
          <div
            ref={containerRef}
            className="h-full overflow-y-auto px-6 py-48 select-none"
            id="narrow-column-scroll-viewport-fullscreen"
          >
            <div className={`max-w-md mx-auto relative ${config.satActMode ? "pl-16 pr-4 border-l border-[#242935]" : ""}`}>
              
              {/* SAT & ACT line numbering instruction / test header if in SAT ACT mode */}
              {config.satActMode && (
                <div className="absolute -top-16 left-0 right-0 border-b border-[#381a23] pb-2 mb-6 pointer-events-none select-none">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block font-sans">
                    ACT/SAT Diagnostic Passage
                  </span>
                  <p className="text-[9px] text-slate-500 font-sans">
                    Refer to line indicators in left margin for comprehension alignment.
                  </p>
                </div>
              )}

              {/* Norman Lewis guide line down the center of the column */}
              {config.showCenterGuide && !config.satActMode && (
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-indigo-500/30 -translate-x-1/2 pointer-events-none z-0" />
              )}

              {/* Structured words by paragraphs */}
              <div className="space-y-8 relative z-10 pb-56">
                {paragraphs.map((paragraph) => (
                  <div key={paragraph.id} className="mb-6">
                    {/* Paragraph container */}
                    <div className={config.satActMode ? "text-justify leading-relaxed" : "space-y-4"}>
                      {paragraph.lines.map((line) => {
                        // Find actual flattened index to determine pacer state
                        const flatIdx = flattenedLines.findIndex((l) => l.id === line.id);
                        const isPacedActive = config.visualPacerEnabled && flatIdx === pacerLineIndex;
                        const isPassed = config.visualPacerEnabled && flatIdx < pacerLineIndex;
                        const lineNo = flatIdx + 1;

                        const baseClasses = `transition-all duration-150 cursor-pointer relative ${
                          config.alignment === "left" ? "text-left" : "text-center"
                        } ${
                          config.visualPacerEnabled
                            ? isPacedActive
                              ? "bg-indigo-950/80 font-bold text-indigo-200 border-indigo-400 ring-2 ring-indigo-500/50 rounded-md shadow-sm"
                              : isPassed
                              ? "opacity-30 blur-[0.2px]"
                              : "opacity-60"
                            : "hover:bg-[#1a1d26] rounded-md"
                        }`;

                        // For SAT/ACT mode, we render spans inline with horizontal padding.
                        if (config.satActMode) {
                          return (
                            <span
                              key={line.id}
                              id={`line-group-${flatIdx}`}
                              onClick={() => handleLineClick(flatIdx)}
                              className={`inline px-1 py-0.5 mx-0.5 ${baseClasses}`}
                            >
                              {/* Show line numbers every 10 word groups, floating in left margin conceptually */}
                              {(lineNo % 10 === 0 || lineNo === 1) && (
                                <span className="absolute -left-16 text-[9px] font-mono font-bold text-slate-400 select-none hidden md:inline-block">
                                  L-{lineNo}
                                </span>
                              )}
                              <span
                                className={`${sizeClasses[config.fontSize]} ${familyClasses[config.fontFamily]} select-none pointer-events-none`}
                              >
                                {line.words}{" "}
                              </span>
                            </span>
                          );
                        }

                        // Default Normal Mode (Vertical stacked blocks)
                        return (
                          <div
                            key={line.id}
                            id={`line-group-${flatIdx}`}
                            onClick={() => handleLineClick(flatIdx)}
                            className={`py-1.5 px-3 rounded-lg block ${
                              config.alignment === "left" ? "pl-6" : ""
                            } ${baseClasses} ${isPacedActive && !config.satActMode ? "scale-[1.03] border-l-4 border-indigo-500" : ""}`}
                          >
                            <span
                              className={`${sizeClasses[config.fontSize]} ${
                                familyClasses[config.fontFamily]
                              } select-none pointer-events-none`}
                            >
                              {line.words}
                            </span>
                            {/* Soft visual indicator bullet on the left for vertical posture gaze tracking */}
                            {isPacedActive && config.alignment === "left" && (
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Minimal visual progress indicators on top edge in fullscreen */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-xs pointer-events-none opacity-50 font-mono select-none text-slate-400">
            <span>Volume: {totalWordsCount} words</span>
            {config.visualPacerEnabled && <span>Pacer active ({config.pacerWpm} WPM)</span>}
          </div>
        </div>

        {/* Floating Minimal HUD footer housing ONLY Pause and Done buttons */}
        <div className="bg-[#16181d] border-t border-[#232731] text-white py-4 px-6 flex items-center justify-between shadow-2xl z-50 select-none">
          {/* Pause Button */}
          <button
            onClick={handleTogglePlay}
            id="fullscreen-pause-btn"
            className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            Pause Reading
          </button>

          {/* Words & elapsed time info indicator */}
          <div className="text-xs font-mono text-slate-400">
            Reading time: <span className="text-white font-bold">{displayTime}</span>
          </div>

          {/* Done Button */}
          <button
            onClick={handleFinished}
            id="fullscreen-done-btn"
            className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Check className="w-4 h-4" />
            I'm Done Reading!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[450px]" id="reading-trainer-stage">
      {/* Dynamic Header Controls Bar */}
      <div className="bg-[#16181d] border border-[#232731] text-white rounded-t-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm z-10 select-none">
        <button
          onClick={onBack}
          id="btn-back-setup"
          className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#252a36] transition-colors border border-transparent hover:border-[#373e4f]"
        >
          &larr; Exit Trainer
        </button>

        <div className="flex items-center gap-6">
          {/* Stopwatch Display */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Time Elapsed
            </span>
            <span className="text-xl font-mono font-bold text-slate-100">
              {displayTime}
            </span>
          </div>

          {/* Current Stats indicator */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Words Count
            </span>
            <span className="text-xl font-mono font-bold text-indigo-400">
              {totalWordsCount}
            </span>
          </div>

          {config.visualPacerEnabled && (
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-sans">
                Target Speed
              </span>
              <span className="text-xl font-mono font-bold text-pink-400">
                {config.pacerWpm} <span className="text-xs">WPM</span>
              </span>
            </div>
          )}
        </div>

        {/* Live Finish triggers */}
        <button
          onClick={handleFinished}
          id="btn-complete-reading"
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm px-6 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Check className="w-4 h-4 cursor-pointer" />
          I'm Done Reading!
        </button>
      </div>

      {/* Main Column Training Stage Pane (Scroll Area) */}
      <div className="relative flex-1 bg-[#111317] border-x border-[#232731] overflow-hidden">
        {/* Hotkey Info Overlay / Pause overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-[#111317]/95 flex flex-col items-center justify-center text-center p-6 z-20 select-none animate-fadeIn">
            <div className="max-w-md space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#1b1e28] border border-[#2c3242] flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {elapsedMs > 0 ? "Training Paused" : "Ready to Train?"}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Position your gaze squarely on the first line. Click{" "}
                <strong className="text-slate-200 font-semibold">Start Stopwatch</strong> (or press
                the <kbd className="px-1.5 py-0.5 bg-[#1f232c] border border-[#2e3442] rounded-xs font-mono text-[10px] text-slate-300 font-bold">Space</kbd> key) to active the text, begin stopwatch, or engage your visual target pacer.
              </p>
              <button
                onClick={handleTogglePlay}
                id="btn-overlay-start"
                className="inline-flex py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-sm cursor-pointer hover:shadow-lg hover:shadow-indigo-600/20 transition-all"
              >
                {elapsedMs > 0 ? "Resume Training" : "Start Stopwatch"}
              </button>
            </div>
          </div>
        )}

        {/* Outer scrolling container centering the narrow column strictly */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-4 py-36 select-none"
          id="narrow-column-scroll-viewport"
        >
          <div className={`max-w-md mx-auto relative ${config.satActMode ? "pl-16 pr-4 border-l border-[#242935]" : ""}`}>
            
            {/* SAT & ACT line numbering instruction if in SAT ACT mode */}
            {config.satActMode && (
              <div className="absolute -top-16 left-0 right-0 border-b border-[#381a23] pb-2 mb-6 pointer-events-none select-none">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block font-sans">
                  ACT/SAT Diagnostic Passage Layout
                </span>
                <p className="text-[9px] text-slate-500 font-sans">
                  Refer to line indicators in left margin for comprehension alignment.
                </p>
              </div>
            )}

            {/* Norman Lewis guide line down the center of the column */}
            {config.showCenterGuide && !config.satActMode && (
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-indigo-500/30 -translate-x-1/2 pointer-events-none z-0" />
            )}

            {/* Structured words by paragraphs */}
            <div className="space-y-8 relative z-10 pb-32">
              {paragraphs.map((paragraph) => (
                <div key={paragraph.id} className="mb-6">
                  {/* Paragraph container */}
                  <div className={config.satActMode ? "text-justify leading-relaxed" : "space-y-4"}>
                    {paragraph.lines.map((line) => {
                      // Find actual flattened index to determine pacer state
                      const flatIdx = flattenedLines.findIndex((l) => l.id === line.id);
                      const isPacedActive = config.visualPacerEnabled && flatIdx === pacerLineIndex;
                      const isPassed = config.visualPacerEnabled && flatIdx < pacerLineIndex;
                      const lineNo = flatIdx + 1;

                      const baseClasses = `transition-all duration-150 cursor-pointer relative ${
                        config.alignment === "left" ? "text-left" : "text-center"
                      } ${
                        config.visualPacerEnabled
                          ? isPacedActive
                            ? "bg-indigo-950/80 font-bold text-indigo-200 border-indigo-400 ring-2 ring-indigo-500/50 rounded-md shadow-sm"
                            : isPassed
                            ? "opacity-30 blur-[0.2px]"
                            : "opacity-60"
                          : "hover:bg-[#1a1d26] rounded-md"
                      }`;

                      // For SAT/ACT mode, we render spans inline with horizontal padding.
                      if (config.satActMode) {
                        return (
                          <span
                            key={line.id}
                            id={`line-group-${flatIdx}`}
                            onClick={() => handleLineClick(flatIdx)}
                            className={`inline px-1 py-0.5 mx-0.5 ${baseClasses}`}
                          >
                            {/* Show line numbers every 10 word groups, floating in left margin conceptually */}
                            {(lineNo % 10 === 0 || lineNo === 1) && (
                              <span className="absolute -left-16 text-[9px] font-mono font-bold text-slate-500 select-none hidden md:inline-block">
                                L-{lineNo}
                              </span>
                            )}
                            <span
                              className={`${sizeClasses[config.fontSize]} ${familyClasses[config.fontFamily]} select-none pointer-events-none`}
                            >
                              {line.words}{" "}
                            </span>
                          </span>
                        );
                      }

                      // Default Normal Mode (Vertical stacked blocks)
                      return (
                        <div
                          key={line.id}
                          id={`line-group-${flatIdx}`}
                          onClick={() => handleLineClick(flatIdx)}
                          className={`py-1.5 px-3 rounded-lg block ${
                            config.alignment === "left" ? "pl-6" : ""
                          } ${baseClasses} ${isPacedActive && !config.satActMode ? "scale-[1.03] border-l-4 border-indigo-500" : ""}`}
                        >
                          <span
                            className={`${sizeClasses[config.fontSize]} ${
                              familyClasses[config.fontFamily]
                            } select-none pointer-events-none`}
                          >
                            {line.words}
                          </span>
                          {/* Soft visual indicator bullet on the left for vertical posture gaze tracking */}
                          {isPacedActive && config.alignment === "left" && (
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Dashboard Controls Bar */}
      <div className="bg-[#16181d] border-t border-[#232731] rounded-b-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm select-none">
        
        {/* Play/Pause/Rewind Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            id="bar-play-pause-toggle"
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xs transition-all cursor-pointer ${
              isPlaying
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
            title="Press Spacebar to Play or Pause"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleReset}
            id="bar-reset-timer"
            className="w-9 h-9 rounded-xl border border-[#2b3140] bg-[#101216] hover:bg-[#1f232d] text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Rewind to First Line"
          >
            <RotateCcw className="w-4 h-4 cursor-pointer" />
          </button>
        </div>

        {/* Guide Controls */}
        <div className="flex items-center gap-3">
          {/* Guide Line Toggle button */}
          <button
            onClick={() => onChangeConfig({ ...config, showCenterGuide: !config.showCenterGuide })}
            id="bar-toggle-guide"
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-sans flex items-center gap-1 transition-all cursor-pointer ${
              config.showCenterGuide
                ? "bg-[#252a36] text-white border-[#373e4f] shadow-2xs"
                : "bg-[#101216] text-slate-400 hover:bg-[#181b22] border-[#242935]"
            }`}
          >
            {config.showCenterGuide ? (
              <>
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Guide Line On
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                Guide Line Off
              </>
            )}
          </button>

          {/* Visual Pacer toggle */}
          <button
            onClick={() => onChangeConfig({ ...config, visualPacerEnabled: !config.visualPacerEnabled })}
            id="bar-toggle-pacer"
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-sans flex items-center gap-1 transition-all cursor-pointer ${
              config.visualPacerEnabled
                ? "bg-pink-950/60 text-pink-300 border-pink-700/50 shadow-2xs"
                : "bg-[#101216] text-slate-400 hover:bg-[#181b22] border-[#242935]"
            }`}
          >
            {config.visualPacerEnabled ? (
              <>
                <Settings2 className="w-3.5 h-3.5 text-pink-400" />
                Pacer Highlight On
              </>
            ) : (
              <>
                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                Pacer Highlight Off
              </>
            )}
          </button>
        </div>

        {/* Live Adjustments Slider (only if pacer active) */}
        {config.visualPacerEnabled ? (
          <div className="flex items-center gap-4 bg-[#101216] px-3 py-1.5 rounded-xl border border-[#242935]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Live Target WPM:
            </span>
            <input
              type="range"
              className="w-32 h-1 bg-[#252a36] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              min={100}
              max={800}
              step={25}
              value={config.pacerWpm}
              onChange={(e) => onChangeConfig({ ...config, pacerWpm: parseInt(e.target.value) })}
              id="bar-slider-pacer"
            />
            <span className="text-xs font-mono font-bold text-indigo-400 min-w-[54px] text-right">
              {config.pacerWpm} WPM
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mr-2">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Click any word group line to move timing focus.</span>
          </div>
        )}
      </div>
    </div>
  );
}
