/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { AppTab, FontFamily } from "./types";
import type { ReaderConfig, ReadingSessionStats } from "./types";
import { READING_SAMPLES } from "./data";
import SetupView from "./components/SetupView";
import ReadingView from "./components/ReadingView";
import ResultsView from "./components/ResultsView";
import QuizView from "./components/QuizView";
import HistoryView from "./components/HistoryView";
import { Sparkles, Compass, BarChart2, Cloud, RefreshCw, AlertCircle, CheckCircle2, User as UserIcon, LogOut, LogIn } from "lucide-react";
import {
  auth,
  db,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
  onAuthStateChanged,
  onSnapshot,
  signInWithPopup,
  signOut,
  googleProvider,
  handleFirestoreError,
  OperationType,
  type User,
} from "./firebase";
import {
  normalizeTimestamp,
  sanitizeSessionForFirestore,
  PRE_RECORDED_SESSIONS,
  exportSessionsToJson,
  parseImportedSessions,
} from "./syncHelper";

const DEFAULT_CONFIG: ReaderConfig = {
  text: READING_SAMPLES[0].text,
  wordsPerLine: 3,
  fontSize: "2xl",
  fontFamily: FontFamily.SANS,
  lineSpacing: "normal",
  showCenterGuide: true,
  visualPacerEnabled: false,
  pacerWpm: 325,
  alignment: "center",
  satActMode: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SETUP);
  const [config, setConfig] = useState<ReaderConfig>(DEFAULT_CONFIG);
  const [sessionStats, setSessionStats] = useState<ReadingSessionStats | null>(null);

  const [history, setHistory] = useState<ReadingSessionStats[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const historyRef = useRef<ReadingSessionStats[]>([]);
  historyRef.current = history;

  const saveHistoryLocally = useCallback((newHistory: ReadingSessionStats[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("fixation_training_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Local storage write failure:", e);
    }
  }, []);

  // Comprehensive cloud history fetcher across all possible Firestore collections
  const fetchAllCloudHistory = useCallback(async (user: User): Promise<ReadingSessionStats[]> => {
    const foundDocs = new Map<number, ReadingSessionStats>();

    const processSnapshot = (snap: any) => {
      snap.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (!data) return;
        const ts = normalizeTimestamp(data.timestamp);
        if (!ts) return;

        const sessionItem: ReadingSessionStats = {
          totalWords: Number(data.totalWords) || 0,
          totalLines: Number(data.totalLines) || 0,
          durationSeconds: Number(data.durationSeconds) || 0,
          wpm: Number(data.wpm) || 0,
          timestamp: ts,
          textTitle: data.textTitle || "Custom Material",
          comprehensionScore: data.comprehensionScore !== undefined && data.comprehensionScore !== null ? Number(data.comprehensionScore) : null,
          comprehensionMax: data.comprehensionMax !== undefined && data.comprehensionMax !== null ? Number(data.comprehensionMax) : null,
        };

        const existing = foundDocs.get(ts);
        if (!existing) {
          foundDocs.set(ts, sessionItem);
        } else {
          // Keep the record with comprehension data if available
          foundDocs.set(ts, {
            ...existing,
            ...sessionItem,
            comprehensionScore: sessionItem.comprehensionScore ?? existing.comprehensionScore,
            comprehensionMax: sessionItem.comprehensionMax ?? existing.comprehensionMax,
          });
        }
      });
    };

    const targetCollections = [
      collection(db, "history"),
      collection(db, "users", user.uid, "history"),
      collection(db, "users", user.uid, "sessions"),
      collection(db, "sessions"),
    ];

    for (const colRef of targetCollections) {
      try {
        const snap = await getDocs(colRef);
        processSnapshot(snap);
      } catch (err) {
        console.warn("Notice reading collection:", colRef.path, err);
      }
    }

    return Array.from(foundDocs.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  // Two-way synchronization: merges cloud and local records, uploads any unsynced local records
  const syncLocalAndCloud = useCallback(async (user: User, currentList: ReadingSessionStats[]) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Fetch all cloud records
      const cloudSessions = await fetchAllCloudHistory(user);
      const cloudTimestamps = new Set(cloudSessions.map((s) => s.timestamp));

      // 2. Read existing local storage in case currentList missed anything
      let localSessions: ReadingSessionStats[] = [...currentList];
      try {
        const raw = localStorage.getItem("fixation_training_history");
        if (raw) {
          const parsed = JSON.parse(raw) as ReadingSessionStats[];
          if (Array.isArray(parsed)) {
            const combinedLocal = new Map<number, ReadingSessionStats>();
            [...localSessions, ...parsed].forEach((s) => {
              const ts = normalizeTimestamp(s.timestamp);
              if (ts) combinedLocal.set(ts, { ...s, timestamp: ts });
            });
            localSessions = Array.from(combinedLocal.values());
          }
        }
      } catch (e) {}

      // 3. Find local sessions that have not yet reached the cloud
      const unuploaded = localSessions.filter((s) => !cloudTimestamps.has(s.timestamp));

      if (unuploaded.length > 0) {
        console.log(`Syncing ${unuploaded.length} local sessions up to Firebase...`);
        for (const item of unuploaded) {
          const docKey = `session_${item.timestamp}`;
          const cleanPayload = sanitizeSessionForFirestore(item, user);

          try {
            await setDoc(doc(db, "history", docKey), cleanPayload, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `history/${docKey}`);
          }
          try {
            await setDoc(doc(db, "users", user.uid, "history", docKey), cleanPayload, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/history/${docKey}`);
          }
        }
      }

      // 4. Merge all unique sessions
      const mergedMap = new Map<number, ReadingSessionStats>();
      [...localSessions, ...cloudSessions].forEach((s) => {
        const existing = mergedMap.get(s.timestamp);
        if (!existing) {
          mergedMap.set(s.timestamp, s);
        } else {
          mergedMap.set(s.timestamp, {
            ...existing,
            ...s,
            comprehensionScore: s.comprehensionScore ?? existing.comprehensionScore,
            comprehensionMax: s.comprehensionMax ?? existing.comprehensionMax,
          });
        }
      });

      const finalMerged = Array.from(mergedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      saveHistoryLocally(finalMerged);
      setSyncStatus(`Synced with Firebase (${finalMerged.length} total sessions)`);
      return finalMerged;
    } catch (err: any) {
      console.error("Sync failure:", err);
      const errMsg = err?.message || String(err);
      setSyncError(`Cloud sync error: ${errMsg}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchAllCloudHistory, saveHistoryLocally]);

  // Initial load & real-time auth listener
  useEffect(() => {
    // 1. Initial fast local load
    try {
      const stored = localStorage.getItem("fixation_training_history");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((s: any) => ({ ...s, timestamp: normalizeTimestamp(s.timestamp) }))
            .filter((s) => s.timestamp > 0);
          setHistory(normalized);
        }
      }
    } catch (e) {}

    // 2. Auth State Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await syncLocalAndCloud(user, historyRef.current);
        } catch (e) {
          console.error("Initial auth sync error:", e);
        }
      } else {
        setSyncStatus(null);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [syncLocalAndCloud]);

  // Real-time snapshot listener on user's cloud history
  useEffect(() => {
    if (!currentUser) return;

    // Listen to changes in the history collection
    const q = collection(db, "history");
    const unsubscribeSnapshot = onSnapshot(
      q,
      (snapshot) => {
        const cloudMap = new Map<number, ReadingSessionStats>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data) return;
          const ts = normalizeTimestamp(data.timestamp);
          if (!ts) return;
          cloudMap.set(ts, {
            totalWords: Number(data.totalWords) || 0,
            totalLines: Number(data.totalLines) || 0,
            durationSeconds: Number(data.durationSeconds) || 0,
            wpm: Number(data.wpm) || 0,
            timestamp: ts,
            textTitle: data.textTitle || "Custom Material",
            comprehensionScore: data.comprehensionScore !== undefined && data.comprehensionScore !== null ? Number(data.comprehensionScore) : null,
            comprehensionMax: data.comprehensionMax !== undefined && data.comprehensionMax !== null ? Number(data.comprehensionMax) : null,
          });
        });

        if (cloudMap.size > 0) {
          // Merge with local history
          setHistory((prev) => {
            const merged = new Map<number, ReadingSessionStats>();
            prev.forEach((s) => merged.set(s.timestamp, s));
            cloudMap.forEach((s, ts) => {
              const existing = merged.get(ts);
              if (!existing) {
                merged.set(ts, s);
              } else {
                merged.set(ts, {
                  ...existing,
                  ...s,
                  comprehensionScore: s.comprehensionScore ?? existing.comprehensionScore,
                  comprehensionMax: s.comprehensionMax ?? existing.comprehensionMax,
                });
              }
            });
            const updated = Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp);
            try {
              localStorage.setItem("fixation_training_history", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      },
      (error) => {
        console.warn("Firestore snapshot listener error:", error);
      }
    );

    return () => {
      unsubscribeSnapshot();
    };
  }, [currentUser]);

  // Explicit manual sign-in handler
  const handleSignIn = async () => {
    setSyncError(null);
    setIsSyncing(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncLocalAndCloud(result.user, historyRef.current);
      }
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      let msg = err?.message || "Sign-in was interrupted.";
      if (err?.code === "auth/popup-blocked") {
        msg = "Pop-up was blocked by your browser. Please allow pop-ups for this domain and try again.";
      } else if (err?.code === "auth/unauthorized-domain") {
        msg = "This domain is not authorized in Firebase Auth settings. Please check Firebase Console.";
      }
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Explicit sign-out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSyncStatus("Signed out. Operating in local storage mode.");
    } catch (err: any) {
      console.error("Sign-out error:", err);
    }
  };

  // Manual sync trigger
  const handleManualSync = async () => {
    if (!currentUser) {
      handleSignIn();
      return;
    }
    try {
      await syncLocalAndCloud(currentUser, history);
    } catch (e) {}
  };

  const handleStartReading = () => {
    setActiveTab(AppTab.READING);
  };

  const handleFinishReading = async (stats: ReadingSessionStats) => {
    let detectedTitle = "Custom Text";
    const matchedSample = READING_SAMPLES.find((s) => s.text.trim() === config.text.trim());
    if (matchedSample) {
      detectedTitle = matchedSample.title;
    } else {
      const cleanWords = config.text.replace(/\s+/g, " ").trim().split(" ");
      if (cleanWords.length > 0) {
        detectedTitle = `Custom: ${cleanWords.slice(0, 4).join(" ")}...`;
      }
    }

    const decoratedStats: ReadingSessionStats = {
      ...stats,
      textTitle: detectedTitle,
      comprehensionScore: null,
      comprehensionMax: null,
    };

    const updatedHistory = [...history, decoratedStats];
    saveHistoryLocally(updatedHistory);

    // Save to Firebase immediately if authenticated
    if (auth.currentUser) {
      const docKey = `session_${decoratedStats.timestamp}`;
      const cleanPayload = sanitizeSessionForFirestore(decoratedStats, auth.currentUser);
      try {
        await setDoc(doc(db, "history", docKey), cleanPayload, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `history/${docKey}`);
      }
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "history", docKey), cleanPayload, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${auth.currentUser.uid}/history/${docKey}`);
      }
    }

    setSessionStats(decoratedStats);
    setActiveTab(AppTab.RESULTS);
  };

  const handleStartQuiz = () => {
    setActiveTab(AppTab.COMPREHENSION);
  };

  const syncQuizScoreToCloud = async (timestamp: number, score: number, max: number) => {
    if (!auth.currentUser) return;
    try {
      const docKey = `session_${timestamp}`;
      const patch = {
        comprehensionScore: score,
        comprehensionMax: max,
        syncedAt: Date.now(),
      };
      try {
        await setDoc(doc(db, "history", docKey), patch, { merge: true });
      } catch (e) {}
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "history", docKey), patch, { merge: true });
      } catch (e) {}
    } catch (e) {
      console.error("Failed to sync quiz score to cloud:", e);
    }
  };

  const handleQuizSubmit = (score: number, max: number) => {
    if (!sessionStats) return;

    const updatedStats = {
      ...sessionStats,
      comprehensionScore: score,
      comprehensionMax: max,
    };
    setSessionStats(updatedStats);

    const updatedHistory = history.map((s) => {
      if (s.timestamp === sessionStats.timestamp) return updatedStats;
      return s;
    });
    saveHistoryLocally(updatedHistory);
    syncQuizScoreToCloud(sessionStats.timestamp, score, max);
  };

  const handleDeleteSession = async (timestamp: number) => {
    const updated = history.filter((s) => s.timestamp !== timestamp);
    saveHistoryLocally(updated);

    if (auth.currentUser) {
      const docKey = `session_${timestamp}`;
      try {
        await deleteDoc(doc(db, "history", docKey));
      } catch (e) {}
      try {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "history", docKey));
      } catch (e) {}
    }
  };

  const handleClearHistory = async () => {
    saveHistoryLocally([]);
    if (auth.currentUser) {
      const targetPaths = [
        collection(db, "history"),
        collection(db, "users", auth.currentUser.uid, "history"),
      ];
      for (const colRef of targetPaths) {
        try {
          const snapshot = await getDocs(colRef);
          const batch = writeBatch(db);
          snapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        } catch (e) {
          console.warn("Clear history cloud partial error:", e);
        }
      }
    }
  };

  // Restore the user's documented 16 visual training runs
  const handleRestorePreRecordedSessions = async () => {
    const mergedMap = new Map<number, ReadingSessionStats>();
    history.forEach((s) => mergedMap.set(s.timestamp, s));
    PRE_RECORDED_SESSIONS.forEach((s) => mergedMap.set(s.timestamp, s));

    const restored = Array.from(mergedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    saveHistoryLocally(restored);
    setSyncStatus(`Restored ${PRE_RECORDED_SESSIONS.length} pre-recorded training runs.`);

    if (currentUser) {
      try {
        await syncLocalAndCloud(currentUser, restored);
      } catch (e) {}
    }
  };

  // Manual import from JSON
  const handleImportSessions = async (jsonString: string) => {
    try {
      const imported = parseImportedSessions(jsonString);
      if (imported.length === 0) {
        throw new Error("No valid reading sessions found in provided JSON.");
      }
      const mergedMap = new Map<number, ReadingSessionStats>();
      history.forEach((s) => mergedMap.set(s.timestamp, s));
      imported.forEach((s) => mergedMap.set(s.timestamp, s));

      const finalMerged = Array.from(mergedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      saveHistoryLocally(finalMerged);
      setSyncStatus(`Successfully imported ${imported.length} sessions (Total: ${finalMerged.length}).`);

      if (currentUser) {
        try {
          await syncLocalAndCloud(currentUser, finalMerged);
        } catch (e) {}
      }
    } catch (e: any) {
      setSyncError(`Import error: ${e?.message || "Failed to parse session JSON"}`);
      throw e;
    }
  };

  // Export current sessions
  const handleExportSessions = () => {
    try {
      const json = exportSessionsToJson(history);
      navigator.clipboard?.writeText(json);
      // Also download backup file
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `speed_reading_analytics_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus("Exported sessions to JSON & copied to clipboard!");
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  const handleRestart = () => {
    setSessionStats(null);
    setActiveTab(AppTab.SETUP);
  };

  return (
    <div className="min-h-screen bg-[#111317] flex flex-col font-sans text-slate-200" id="visual-trainer-application">
      
      {/* Universal Top Decorative Header */}
      <header className="bg-[#16181d] border-b border-[#232731] py-3 px-4 sm:px-6 shadow-md select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1f232c] text-white flex items-center justify-center font-bold text-lg shadow-sm border border-[#2e3442] shrink-0">
              <Compass className="w-5 h-5 text-indigo-400 rotate-12" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight block">
                Fixation Method
              </span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block -mt-0.5">
                SPEED READING TRAINER
              </span>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex gap-1 bg-[#101216] border border-[#242935] p-0.5 rounded-xl">
            <button
              disabled={activeTab === AppTab.READING}
              onClick={handleRestart}
              id="header-nav-trainer"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab !== AppTab.HISTORY
                  ? "bg-[#252a36] text-white shadow-xs border border-[#373e4f]"
                  : "text-slate-400 hover:text-white"
              } ${activeTab === AppTab.READING ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Trainer Room
            </button>
            <button
              disabled={activeTab === AppTab.READING}
              onClick={() => setActiveTab(AppTab.HISTORY)}
              id="header-nav-progress"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === AppTab.HISTORY
                  ? "bg-[#252a36] text-white shadow-xs border border-[#373e4f]"
                  : "text-slate-400 hover:text-white"
              } ${activeTab === AppTab.READING ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>My Progress</span>
              {history.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                  activeTab === AppTab.HISTORY ? "bg-indigo-500 text-white" : "bg-[#2e3442] text-slate-300"
                }`}>
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {/* User Account & Cloud Sync Controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
            {/* AI badge */}
            <span className="hidden lg:flex text-slate-300 bg-[#1b1e26] border border-[#292e3b] px-2.5 py-1 rounded-full items-center gap-1 font-sans text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-current" />
              Gemini AI Armed
            </span>

            {/* Sync status indicator */}
            {currentUser && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Click to force sync with Firebase"
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                  isSyncing
                    ? "bg-indigo-950/60 border-indigo-700/60 text-indigo-300"
                    : "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60"
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-indigo-400" : "text-emerald-400"}`} />
                <span>{isSyncing ? "Syncing..." : "Synced"}</span>
              </button>
            )}

            {/* Auth Actions */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1b1e26] border border-[#292e3b] text-slate-300 text-xs font-medium max-w-[150px] truncate" title={currentUser.email || "Signed In"}>
                  <UserIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{currentUser.email?.split("@")[0] || "User"}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  id="btn-header-signout"
                  className="px-3 py-1.5 rounded-lg bg-[#1b1e26] hover:bg-[#252a36] border border-[#292e3b] text-slate-300 font-bold text-xs tracking-tight transition-colors cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isSyncing}
                id="btn-header-signin"
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs tracking-tight transition-colors cursor-pointer border border-indigo-500/40 flex items-center gap-1.5 shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isSyncing ? "Connecting..." : "Sign In & Sync"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Sync Error / Status Notice */}
      {syncError && (
        <div className="bg-red-950/80 border-b border-red-800 px-4 py-2.5 text-xs text-red-200 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{syncError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSync}
                className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-100 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => setSyncError(null)}
                className="text-red-400 hover:text-red-200 font-bold text-sm px-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Dynamic Workspace View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-start">
        {activeTab === AppTab.SETUP && (
          <SetupView
            config={config}
            onChangeConfig={setConfig}
            onStartReading={handleStartReading}
          />
        )}

        {activeTab === AppTab.READING && (
          <ReadingView
            config={config}
            onChangeConfig={setConfig}
            onFinishReading={handleFinishReading}
            onBack={handleRestart}
          />
        )}

        {activeTab === AppTab.RESULTS && sessionStats && (
          <ResultsView
            stats={sessionStats}
            onStartQuiz={handleStartQuiz}
            onRestart={handleRestart}
          />
        )}

        {activeTab === AppTab.COMPREHENSION && sessionStats && (
          <QuizView
            text={config.text}
            stats={sessionStats}
            onRestart={handleRestart}
            onQuizSubmit={handleQuizSubmit}
          />
        )}

        {activeTab === AppTab.HISTORY && (
          <HistoryView
            history={history}
            onClearHistory={handleClearHistory}
            onDeleteSession={handleDeleteSession}
            onBack={handleRestart}
            currentUser={currentUser}
            isSyncing={isSyncing}
            syncStatus={syncStatus}
            syncError={syncError}
            onManualSync={handleManualSync}
            onSignIn={handleSignIn}
            onRestorePreRecorded={handleRestorePreRecordedSessions}
            onImportSessions={handleImportSessions}
            onExportSessions={handleExportSessions}
          />
        )}
      </main>

      {/* Simple, Non-intrusive Professional Human Footer */}
      <footer className="py-4 text-center border-t border-[#232731] bg-[#16181d] select-none text-[10px] font-mono text-slate-500">
        <p>Gaze Fixation Training System &bull; Inspired by Norman Lewis's "How to Read Better and Faster"</p>
      </footer>
    </div>
  );
}
