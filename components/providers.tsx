"use client";

import { ThemeProvider } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AnswerKey, Progress } from "@/types";
import { allQuestions } from "@/lib/data";
import { loadProgress, saveProgress, clearProgress } from "@/lib/storage";

/* --------------------------------------------------------------------------
   Progress context: nguồn dữ liệu duy nhất cho tiến độ học, đồng bộ localStorage.
   -------------------------------------------------------------------------- */
interface ProgressCtx {
  progress: Progress;
  hydrated: boolean;
  answer: (uid: string, key: AnswerKey) => void;
  toggleBookmark: (uid: string) => void;
  reset: () => void;
  /** Xóa đáp án của một tập câu (dùng khi "làm lại câu sai"). */
  clearAnswers: (uids: string[]) => void;
  stats: {
    total: number;
    answered: number;
    correct: number;
    wrong: number;
    accuracy: number;
    completion: number;
  };
}

const Ctx = createContext<ProgressCtx | null>(null);

export function useProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress phải nằm trong <Providers>");
  return ctx;
}

function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>({ answers: {}, bookmarks: [] });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate từ localStorage sau khi mount (tránh mismatch SSR).
  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  // Persist mỗi khi progress đổi (chỉ sau khi đã hydrate).
  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [progress, hydrated]);

  const answer = (uid: string, key: AnswerKey) =>
    setProgress((p) => ({
      ...p,
      answers: { ...p.answers, [uid]: key },
    }));

  const toggleBookmark = (uid: string) =>
    setProgress((p) => ({
      ...p,
      bookmarks: p.bookmarks.includes(uid)
        ? p.bookmarks.filter((n) => n !== uid)
        : [...p.bookmarks, uid],
    }));

  const clearAnswers = (uids: string[]) =>
    setProgress((p) => {
      const answers = { ...p.answers };
      for (const n of uids) delete answers[n];
      return { ...p, answers };
    });

  const reset = () => {
    clearProgress();
    setProgress({ answers: {}, bookmarks: [] });
  };

  // Thống kê tổng quan (derived) cho dashboard.
  const stats = useMemo(() => {
    const total = allQuestions.length;
    let answered = 0;
    let correct = 0;
    for (const q of allQuestions) {
      const a = progress.answers[q.uid];
      if (!a) continue;
      answered++;
      if (a === q.correctAnswer) correct++;
    }
    const wrong = answered - correct;
    return {
      total,
      answered,
      correct,
      wrong,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      completion: total ? Math.round((answered / total) * 100) : 0,
    };
  }, [progress.answers]);

  const value = useMemo<ProgressCtx>(
    () => ({ progress, hydrated, answer, toggleBookmark, reset, clearAnswers, stats }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress, hydrated, stats]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ProgressProvider>{children}</ProgressProvider>
    </ThemeProvider>
  );
}
