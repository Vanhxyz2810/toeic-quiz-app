"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  FlaskConical,
  GraduationCap,
} from "lucide-react";
import type { AnswerKey, EnrichedQuestion, QuizMode } from "@/types";
import { useProgress } from "@/components/providers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuestionCard } from "@/components/question-card";
import { ResultScreen } from "@/components/result-screen";

interface QuizRunnerProps {
  title: string;
  questions: EnrichedQuestion[];
  mode: QuizMode;
}

export function QuizRunner({ title, questions: initialQuestions, mode }: QuizRunnerProps) {
  const { progress, answer, toggleBookmark, clearAnswers } = useProgress();

  // Cho phép làm lại một tập con (câu sai) mà không rời trang.
  const [questions, setQuestions] = useState(initialQuestions);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [finished, setFinished] = useState(false);

  // Đáp án của phiên hiện tại (độc lập với localStorage cho tới khi ghi nhận).
  const [session, setSession] = useState<Record<number, AnswerKey>>({});
  // Study mode: đã "check" câu nào (mới reveal câu đó).
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const current = questions[index];
  const answeredCount = Object.keys(session).length;
  const selected = current ? session[current.questionNumber] : undefined;
  const isRevealed = mode === "study" && !!current && checked.has(current.questionNumber);

  const canGoNext = index < questions.length - 1;
  const canGoPrev = index > 0;

  const allAnswered = questions.every((q) => session[q.questionNumber]);

  function handleSelect(key: AnswerKey) {
    if (!current) return;
    if (mode === "study" && checked.has(current.questionNumber)) return; // khóa sau khi check
    setSession((s) => ({ ...s, [current.questionNumber]: key }));

    if (mode === "study") {
      // Study: check ngay -> reveal + ghi nhận tiến độ.
      setChecked((c) => new Set(c).add(current.questionNumber));
      answer(current.questionNumber, key);
    }
  }

  function goTo(next: number) {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  }

  function handleSubmit() {
    // Test mode: ghi nhận toàn bộ đáp án đã chọn xuống tiến độ.
    for (const q of questions) {
      const a = session[q.questionNumber];
      if (a) answer(q.questionNumber, a);
    }
    setFinished(true);
  }

  function restart(qs: EnrichedQuestion[]) {
    setQuestions(qs);
    setSession({});
    setChecked(new Set());
    setIndex(0);
    setFinished(false);
  }

  const modeBadge = useMemo(
    () =>
      mode === "study" ? (
        <Badge variant="accent"><GraduationCap className="h-3.5 w-3.5" /> Study</Badge>
      ) : (
        <Badge variant="secondary"><FlaskConical className="h-3.5 w-3.5" /> Test</Badge>
      ),
    [mode]
  );

  // ---- Empty / Result states ----
  if (!questions.length) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Không có câu hỏi nào trong nhóm này.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Về Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <ResultScreen
        questions={questions}
        answers={session}
        onRetryAll={() => restart(initialQuestions)}
        onRetryWrong={(wrong) => {
          // Xóa đáp án cũ của các câu sai để làm lại "sạch".
          clearAnswers(wrong.map((q) => q.questionNumber));
          restart(wrong);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Thanh trên: back + tiêu đề + tiến độ */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Thoát</Button>
        </Link>
        <div className="flex items-center gap-2">
          {current.graphicData && <Badge variant="outline">Có graphic</Badge>}
          {modeBadge}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{title}</span>
          <span className="tabular-nums text-muted-foreground">
            Câu {index + 1}/{questions.length}
          </span>
        </div>
        <Progress value={((index + 1) / questions.length) * 100} />
        {mode === "test" && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Đã chọn {answeredCount}/{questions.length} câu · sẽ chấm điểm khi nộp bài.
          </p>
        )}
      </div>

      {/* Câu hỏi (fade/slide khi chuyển) */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.questionNumber}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <QuestionCard
              question={current}
              selected={selected}
              revealed={isRevealed}
              bookmarked={progress.bookmarks.includes(current.questionNumber)}
              onSelect={handleSelect}
              onToggleBookmark={() => toggleBookmark(current.questionNumber)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Điều hướng */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="outline" onClick={() => goTo(index - 1)} disabled={!canGoPrev}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        {canGoNext ? (
          <Button
            onClick={() => goTo(index + 1)}
            // Study mode khuyến khích trả lời trước khi qua câu (không bắt buộc)
            className={cn(mode === "study" && !isRevealed && "opacity-90")}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="success" onClick={handleSubmit} disabled={mode === "test" && !allAnswered}>
            <CheckCheck className="h-4 w-4" /> Nộp bài &amp; xem kết quả
          </Button>
        )}
      </div>
    </div>
  );
}
