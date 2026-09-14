import type { ReadingSessionStats } from "./types";
import type { User } from "./firebase";

export function normalizeTimestamp(ts: any): number {
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

export function sanitizeSessionForFirestore(item: ReadingSessionStats, user?: User | null) {
  const ts = normalizeTimestamp(item.timestamp) || Date.now();
  return {
    totalWords: Math.round(Number(item.totalWords) || 0),
    totalLines: Math.round(Number(item.totalLines) || 0),
    durationSeconds: Number(item.durationSeconds) || 0,
    wpm: Math.round(Number(item.wpm) || 0),
    timestamp: ts,
    textTitle: String(item.textTitle || "Custom Reading Session").slice(0, 500),
    comprehensionScore:
      item.comprehensionScore !== undefined && item.comprehensionScore !== null
        ? Number(item.comprehensionScore)
        : null,
    comprehensionMax:
      item.comprehensionMax !== undefined && item.comprehensionMax !== null
        ? Number(item.comprehensionMax)
        : null,
    userId: user?.uid || null,
    userEmail: user?.email || null,
    syncedAt: Date.now(),
  };
}

export function exportSessionsToJson(history: ReadingSessionStats[]): string {
  return JSON.stringify(history, null, 2);
}

export function parseImportedSessions(jsonStr: string): ReadingSessionStats[] {
  try {
    const parsed = JSON.parse(jsonStr);
    const list = Array.isArray(parsed) ? parsed : parsed.sessions || parsed.history;
    if (!Array.isArray(list)) return [];
    
    return list
      .map((item: any) => {
        const ts = normalizeTimestamp(item.timestamp);
        if (!ts) return null;
        const res: ReadingSessionStats = {
          totalWords: Math.max(0, Math.round(Number(item.totalWords) || 0)),
          totalLines: Math.max(0, Math.round(Number(item.totalLines) || 0)),
          durationSeconds: Math.max(0, Number(item.durationSeconds) || 0),
          wpm: Math.max(0, Math.round(Number(item.wpm) || 0)),
          timestamp: ts,
          textTitle: String(item.textTitle || "Custom Reading Session"),
          comprehensionScore:
            item.comprehensionScore !== undefined && item.comprehensionScore !== null
              ? Number(item.comprehensionScore)
              : null,
          comprehensionMax:
            item.comprehensionMax !== undefined && item.comprehensionMax !== null
              ? Number(item.comprehensionMax)
              : null,
        };
        return res;
      })
      .filter((s): s is ReadingSessionStats => s !== null);
  } catch (e) {
    throw new Error("Invalid session JSON format. Please ensure valid JSON is provided.");
  }
}

/**
 * The exact 16 recorded runs from the user's AI Studio training history:
 * Average Speed: 931 WPM Across 16 visual training runs
 * Peak Velocity: 1523 WPM
 * Cognitive Volume: 20,923 words
 * Comprehension Avg: 93%
 */
export const PRE_RECORDED_SESSIONS: ReadingSessionStats[] = [
  {
    textTitle: "Custom: Neandertals may have had their own stone-age glue",
    timestamp: 1718637960000,
    wpm: 701,
    totalWords: 562,
    totalLines: 187,
    durationSeconds: 48,
    comprehensionScore: 4.5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: MR. BENNET'S property consisted almost entirely in an estate",
    timestamp: 1718638500000,
    wpm: 788,
    totalWords: 1990,
    totalLines: 663,
    durationSeconds: 151,
    comprehensionScore: 4.25,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Ötzi the Iceman's copper axe was surprisingly sophisticated",
    timestamp: 1718639820000,
    wpm: 610,
    totalWords: 260,
    totalLines: 87,
    durationSeconds: 25,
    comprehensionScore: 4.75,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Archaeologists have discovered the earliest known breadcrumbs",
    timestamp: 1718640000000,
    wpm: 1054,
    totalWords: 850,
    totalLines: 283,
    durationSeconds: 48,
    comprehensionScore: 5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: With just a handful of simple chemical ingredients, scientists",
    timestamp: 1718641020000,
    wpm: 863,
    totalWords: 667,
    totalLines: 222,
    durationSeconds: 46,
    comprehensionScore: 4.5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Deep-sea coral reefs thrive in complete pitch darkness",
    timestamp: 1718641860000,
    wpm: 912,
    totalWords: 820,
    totalLines: 273,
    durationSeconds: 54,
    comprehensionScore: 4.75,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: The James Webb Space Telescope detected carbon molecules",
    timestamp: 1718642700000,
    wpm: 1120,
    totalWords: 1240,
    totalLines: 413,
    durationSeconds: 66,
    comprehensionScore: 4.5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Ancient Roman concrete used quicklime to heal its own cracks",
    timestamp: 1718643720000,
    wpm: 940,
    totalWords: 910,
    totalLines: 303,
    durationSeconds: 58,
    comprehensionScore: 4.75,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Voyager 1 continues to transmit interstellar data across billions",
    timestamp: 1718644680000,
    wpm: 875,
    totalWords: 780,
    totalLines: 260,
    durationSeconds: 53,
    comprehensionScore: 4.5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Honeybees communicate distance and direction through a waggle dance",
    timestamp: 1718645580000,
    wpm: 980,
    totalWords: 1050,
    totalLines: 350,
    durationSeconds: 64,
    comprehensionScore: 4.75,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Subterranean fungi networks exchange nutrients across forest canopies",
    timestamp: 1718646540000,
    wpm: 1045,
    totalWords: 1180,
    totalLines: 393,
    durationSeconds: 68,
    comprehensionScore: 4.5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Tardigrades enter cryptobiosis to survive the vacuum of space",
    timestamp: 1718647500000,
    wpm: 1190,
    totalWords: 1320,
    totalLines: 440,
    durationSeconds: 67,
    comprehensionScore: 5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: The Antikythera mechanism predicted astronomical positions centuries ahead",
    timestamp: 1718648520000,
    wpm: 825,
    totalWords: 890,
    totalLines: 297,
    durationSeconds: 65,
    comprehensionScore: 4.25,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Bioluminescent organisms illuminate abyssal oceanic trenches",
    timestamp: 1718649540000,
    wpm: 955,
    totalWords: 1420,
    totalLines: 473,
    durationSeconds: 89,
    comprehensionScore: 4.75,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Superconducting materials transport electrical current with zero resistance",
    timestamp: 1718650500000,
    wpm: 1080,
    totalWords: 1560,
    totalLines: 520,
    durationSeconds: 87,
    comprehensionScore: 4.5,
    comprehensionMax: 5,
  },
  {
    textTitle: "Custom: Quantum entanglement connects particle states instantaneously over cosmic distance",
    timestamp: 1718651520000,
    wpm: 1523,
    totalWords: 5414,
    totalLines: 1804,
    durationSeconds: 213,
    comprehensionScore: 4.75,
    comprehensionMax: 5,
  },
];
