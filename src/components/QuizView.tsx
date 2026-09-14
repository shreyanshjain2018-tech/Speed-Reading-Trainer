import { useState, useEffect } from "react";
import type { QuizState, ReadingSessionStats, QuizQuestion } from "../types";
import { Sparkles, HelpCircle, Check, AlertCircle, RefreshCw, Trophy, Gauge, Award } from "lucide-react";

interface QuizViewProps {
  text: string;
  stats: ReadingSessionStats;
  onRestart: () => void;
  onQuizSubmit?: (score: number, max: number) => void;
}

export default function QuizView({ text, stats, onRestart, onQuizSubmit }: QuizViewProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    userAnswers: {},
    submitted: false,
    score: null,
  });

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Fetch the questions from the backend API upon view mount
  useEffect(() => {
    let active = true;

    async function fetchQuiz() {
      try {
        setLoading(true);
        setErrorMsg("");

        const response = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !Array.isArray(data.quiz) || data.quiz.length === 0) {
          throw new Error("Invalid response format received from Gemini backend.");
        }

        if (active) {
          setQuizState({
            questions: data.quiz,
            userAnswers: {},
            submitted: false,
            score: null,
          });
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error fetching quiz:", err);
        if (active) {
          setErrorMsg(err?.message || "Something went wrong while generating the quiz.");
          setLoading(false);
        }
      }
    }

    fetchQuiz();

    return () => {
      active = false;
    };
  }, [text]);

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (quizState.submitted) return; // ignore choices if already marked

    setQuizState((prev) => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [questionIdx]: optionIdx,
      },
    }));
  };

  const handleSubmitQuiz = () => {
    // Audit that all questions are answered
    if (Object.keys(quizState.userAnswers).length < quizState.questions.length) {
      alert("Please answer all 5 questions before submitting.");
      return;
    }

    let score = 0;
    quizState.questions.forEach((q, idx) => {
      if (quizState.userAnswers[idx] === q.correctIndex) {
        score++;
      }
    });

    setQuizState((prev) => ({
      ...prev,
      submitted: true,
      score,
    }));

    if (onQuizSubmit) {
      onQuizSubmit(score, quizState.questions.length);
    }
  };

  // Metric: Effective Reading Rate (ERR)
  // Formula: WPM * (comprehensionScore / totalQuestionsCount)
  const scorePercent = quizState.score !== null ? (quizState.score / quizState.questions.length) : 0;
  const effectiveReadingRate = Math.round(stats.wpm * scorePercent);

  // Active question details
  const activeQuestion: QuizQuestion | undefined = quizState.questions[activeQuestionIdx];
  const totalQuestions = quizState.questions.length;
  const isSelected = (idx: number) => quizState.userAnswers[activeQuestionIdx] === idx;

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="comprehension-quiz-root">
      
      {/* Quiz Progress header with small Stats recap */}
      <div className="bg-[#16181d] border border-[#232731] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xs select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1f232d] text-indigo-400 rounded-lg border border-[#2e3442]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Comprehension Assessment</h3>
            <p className="text-xs text-slate-400">Verifying retention for {stats.totalWords} words</p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs font-semibold text-slate-400">
          <span>Speed: <strong className="text-slate-200 font-bold">{stats.wpm} WPM</strong></span>
          <span>Time: <strong className="text-slate-200 font-bold">{Math.round(stats.durationSeconds)}s</strong></span>
        </div>
      </div>

      {loading && (
        <div className="bg-[#16181d] border border-[#232731] rounded-2xl p-12 text-center space-y-6 shadow-xs select-none">
          <div className="relative w-20 h-20 mx-auto">
            {/* Pulsing loading target rings */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-[#1e222d] border border-[#2e3445] flex items-center justify-center text-indigo-400">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-bold text-lg">AI Comprehension Synthesis</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed font-sans">
              Gemini is digesting the material you just read to construct a custom 5-question multiple choice challenge...
            </p>
          </div>

          {/* Practice reading suggestions */}
          <div className="max-w-md mx-auto p-4 bg-[#111317] rounded-xl border border-[#232731] text-left space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Speed Reading Coach Tip:
            </span>
            <p className="text-xs text-slate-300 leading-normal font-sans">
              "To improve both retention and speed, focus on visual triggers. Do not pronounce words
              silently in your throat relative to vocal cords (sub-vocalization). Instead, leap downwards down the column using only your eye's instantaneous recognition."
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#16181d] border border-red-900/40 rounded-2xl p-8 text-center space-y-4 shadow-sm select-none">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/50 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-white">Quiz Generation Failed</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {errorMsg}
            </p>
          </div>
          <button
            onClick={onRestart}
            id="error-restart-btn"
            className="inline-flex py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Go Back & Setup
          </button>
        </div>
      )}

      {!loading && !errorMsg && quizState.questions.length > 0 && (
        <>
          {quizState.submitted ? (
            /* AFTER SUBMISSION RESULTS WORKBENCH */
            <div className="space-y-6 select-none">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Result Card 1: Score breakdown */}
                <div className="bg-[#16181d] p-5 rounded-2xl border border-[#232731] shadow-2xs text-center space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">
                    Test Score
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-4xl font-extrabold text-indigo-400 font-mono">
                      {quizState.score}/{totalQuestions}
                    </span>
                    <span className="text-sm text-slate-400">correct</span>
                  </div>
                  <div className="pt-2 text-xs font-medium font-sans">
                    {scorePercent >= 0.8 ? (
                      <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                        Superb Retention!
                      </span>
                    ) : scorePercent >= 0.6 ? (
                      <span className="text-blue-300 bg-blue-950/60 border border-blue-800/40 px-2.5 py-1 rounded-full">
                        Good comprehension
                      </span>
                    ) : (
                      <span className="text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1 rounded-full">
                        Needs Practice
                      </span>
                    )}
                  </div>
                </div>

                {/* Result Card 2: Speed metrics overview */}
                <div className="bg-[#16181d] p-5 rounded-2xl border border-[#232731] shadow-2xs text-center space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">
                    Raw Speed
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-slate-100 font-mono">
                      {stats.wpm}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-bold">WPM</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal font-sans">
                    Measured duration: {Math.round(stats.durationSeconds)} seconds
                  </p>
                </div>

                {/* Result Card 3: EFFECTIVE READING RATE (ERR) */}
                <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-700/40 shadow-sm text-center relative overflow-hidden space-y-2">
                  
                  {/* Subtle geometric pattern */}
                  <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full translate-x-6 -translate-y-6" />

                  <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    Effective Speed
                  </span>
                  <div className="flex items-baseline justify-center gap-1 relative z-10">
                    <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                      {effectiveReadingRate}
                    </span>
                    <span className="text-xs text-indigo-300 uppercase font-bold">WPM</span>
                  </div>
                  <p className="text-[11px] text-indigo-200 leading-normal font-sans">
                    Calculated by multiplying Speed &times; Comprehension Score. This is your true reading capability.
                  </p>
                </div>
              </div>

              {/* Questionnaire breakdown */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Detailed Diagnostic Breakdown
                </h3>
                {quizState.questions.map((q, qIdx) => {
                  const userSel = quizState.userAnswers[qIdx];
                  const isCorrect = userSel === q.correctIndex;

                  return (
                    <div
                      key={qIdx}
                      id={`diagnostic-question-${qIdx}`}
                      className={`p-6 rounded-2xl border ${
                        isCorrect
                          ? "bg-[#16181d] border-emerald-800/40 shadow-2xs"
                          : "bg-[#16181d] border-rose-900/40 shadow-2xs"
                      } space-y-4`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5 shrink-0 ${
                            isCorrect
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                              : "bg-rose-950 text-rose-300 border border-rose-700/50"
                          }`}
                        >
                          {qIdx + 1}
                        </span>
                        <h4 className="font-bold text-slate-200 text-sm leading-normal">
                          {q.question}
                        </h4>
                      </div>

                      {/* Displaying options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-9">
                        {q.options.map((opt, oIdx) => {
                          const optionLetter = ["A", "B", "C", "D"][oIdx];
                          const isUserSelection = userSel === oIdx;
                          const isCorrectOption = q.correctIndex === oIdx;

                          return (
                            <div
                              key={oIdx}
                              id={`diagnostic-${qIdx}-option-${oIdx}`}
                              className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                                isCorrectOption
                                  ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-200 font-semibold"
                                  : isUserSelection
                                  ? "bg-rose-950/50 border-rose-700/60 text-rose-200 font-medium"
                                  : "bg-[#111317] border-[#242935] text-slate-400"
                              }`}
                            >
                              <span>
                                <strong className="font-mono text-[10px] mr-1.5 opacity-60">
                                  {optionLetter}.
                                </strong>
                                {opt}
                              </span>
                              {isCorrectOption && (
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                              )}
                              {!isCorrectOption && isUserSelection && (
                                <span className="text-[10px] text-rose-400 font-bold ml-1.5">Your answer</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      <div className="pl-9 pt-1.5">
                        <div className="p-3.5 bg-[#111317] rounded-xl border border-[#242935] text-xs text-slate-300 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wider block">
                            Tutor Explanation:
                          </span>
                          <p className="leading-relaxed font-sans">{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* End Actions panel */}
              <div className="pt-4 flex justify-center">
                <button
                  onClick={onRestart}
                  id="final-restart-btn"
                  className="py-3 px-8 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 cursor-pointer" />
                  Load New Text or Restart Setup
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE EXAM RUNNING VIEW */
            <div className="bg-[#16181d] border border-[#232731] rounded-2xl shadow-xs select-none p-6 md:p-8 space-y-6">
              
              {/* Question pagination timeline indicator */}
              <div className="flex gap-1.5 items-center justify-between border-b border-[#232731] pb-4">
                <div className="flex gap-1.5 items-center">
                  {quizState.questions.map((_, i) => {
                    const isPassed = i < activeQuestionIdx;
                    const isCurrent = i === activeQuestionIdx;
                    const hasAnswer = quizState.userAnswers[i] !== undefined;

                    return (
                      <button
                        key={i}
                        onClick={() => setActiveQuestionIdx(i)}
                        id={`btn-page-${i}`}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-indigo-600 text-white"
                            : hasAnswer
                            ? "bg-indigo-950/70 text-indigo-300 border border-indigo-700/50"
                            : "bg-[#111317] hover:bg-[#1a1d26] text-slate-400 border border-[#242935]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-mono font-bold bg-[#111317] text-slate-400 px-2.5 py-1 rounded-md border border-[#242935]">
                  Question {activeQuestionIdx + 1} of {totalQuestions}
                </span>
              </div>

              {/* Current Question Block */}
              {activeQuestion && (
                <div className="space-y-6 animate-fadeIn">
                  <h3 className="font-extrabold text-white text-base md:text-lg leading-relaxed">
                    {activeQuestion.question}
                  </h3>

                  {/* MCQ option choices list */}
                  <div className="grid grid-cols-1 gap-3">
                    {activeQuestion.options.map((opt, oIdx) => {
                      const letter = ["A", "B", "C", "D"][oIdx];
                      const selected = isSelected(oIdx);

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(activeQuestionIdx, oIdx)}
                          id={`option-selector-${activeQuestionIdx}-${oIdx}`}
                          className={`p-4 rounded-xl text-left text-xs transition-all border flex items-center gap-3 cursor-pointer ${
                            selected
                              ? "bg-indigo-950/80 border-indigo-500 text-indigo-200 font-semibold ring-1 ring-indigo-400/50"
                              : "bg-[#111317] hover:bg-[#1b1e28] text-slate-300 border-[#242935]"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full font-mono font-bold text-[11px] flex items-center justify-center ${
                              selected
                                ? "bg-indigo-600 text-white"
                                : "bg-[#1f232d] text-slate-400 border border-[#2c3242]"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigating and Submitting */}
              <div className="flex items-center justify-between border-t border-[#232731] pt-6">
                <button
                  disabled={activeQuestionIdx === 0}
                  onClick={() => setActiveQuestionIdx((prev) => prev - 1)}
                  id="quiz-btn-prev"
                  className={`text-xs font-semibold px-4 py-2 border rounded-xl transition-colors cursor-pointer ${
                    activeQuestionIdx === 0
                      ? "text-slate-600 border-[#232731] cursor-not-allowed"
                      : "text-slate-300 border-[#2b3140] hover:bg-[#1f232d]"
                  }`}
                >
                  &larr; Previous Category
                </button>

                {activeQuestionIdx < totalQuestions - 1 ? (
                  <button
                    onClick={() => setActiveQuestionIdx((prev) => prev + 1)}
                    id="quiz-btn-next"
                    className="text-xs font-semibold px-4 py-2 bg-[#252a36] hover:bg-[#303746] text-white rounded-xl transition-colors cursor-pointer border border-[#373e4f]"
                  >
                    Next Category &rarr;
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(quizState.userAnswers).length < totalQuestions}
                    id="quiz-btn-submit"
                    className={`text-xs font-bold px-6 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all ${
                      Object.keys(quizState.userAnswers).length === totalQuestions
                        ? "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white cursor-pointer hover:scale-[1.02]"
                        : "bg-[#1f232d] text-slate-500 border border-[#292f3d] cursor-not-allowed"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    Submit Answers ({Object.keys(quizState.userAnswers).length}/{totalQuestions})
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
