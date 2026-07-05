"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpenText,
  CheckCheck,
  FlaskConical,
  GraduationCap,
  Image as ImageIcon,
} from "lucide-react";
import type { AnswerKey, EnrichedQuestion, QuizBlock, QuizMode } from "@/types";
import { useProgress } from "@/components/providers";
import { groupIntoBlocks } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { QuestionCard } from "@/components/question-card";
import { GraphicCard } from "@/components/graphic-card";
import { PassageCard } from "@/components/passage-card";
import { ResultScreen } from "@/components/result-screen";

interface QuizRunnerProps {
  title: string;
  blocks: QuizBlock[];
  mode: QuizMode;
}

export function QuizRunner({ title, blocks: initialBlocks, mode }: QuizRunnerProps) {
  const { progress, answer, toggleBookmark, clearAnswers } = useProgress();

  const [blocks, setBlocks] = useState(initialBlocks);
  const [index, setIndex] = useState(0); // chỉ số BLOCK (hội thoại) hiện tại
  const [direction, setDirection] = useState(1);
  const [finished, setFinished] = useState(false);

  // Đáp án phiên hiện tại — key theo uid, giá trị là KEY GỐC (chấm chuẩn dù đã đảo).
  const [session, setSession] = useState<Record<string, AnswerKey>>({});
  // Study mode: các câu đã "check" (mới reveal).
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const current = blocks[index];
  const allQuestions = useMemo(() => blocks.flatMap((b) => b.questions), [blocks]);
  const answeredCount = allQuestions.filter((q) => session[q.uid]).length;
  const allAnswered = allQuestions.every((q) => session[q.uid]);

  const canPrev = index > 0;
  const canNext = index < blocks.length - 1;

  function handleSelect(q: EnrichedQuestion, key: AnswerKey) {
    if (mode === "study" && checked.has(q.uid)) return; // khóa sau khi check
    setSession((s) => ({ ...s, [q.uid]: key }));
    if (mode === "study") {
      setChecked((c) => new Set(c).add(q.uid));
      answer(q.uid, key); // ghi nhận ngay
    }
  }

  function goTo(next: number) {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit() {
    for (const q of allQuestions) {
      const a = session[q.uid];
      if (a) answer(q.uid, a);
    }
    setFinished(true);
  }

  function restart(newBlocks: QuizBlock[]) {
    setBlocks(newBlocks);
    setSession({});
    setChecked(new Set());
    setIndex(0);
    setFinished(false);
  }

  const modeBadge =
    mode === "study" ? (
      <Badge variant="accent"><GraduationCap className="h-3.5 w-3.5" /> Study</Badge>
    ) : (
      <Badge variant="secondary"><FlaskConical className="h-3.5 w-3.5" /> Test</Badge>
    );

  // ---- Empty / Result ----
  if (!blocks.length) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Không có câu hỏi nào.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Về Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <ResultScreen
        questions={allQuestions}
        answers={session}
        onRetryAll={() => restart(initialBlocks)}
        onRetryWrong={(wrong) => {
          clearAnswers(wrong.map((q) => q.uid));
          // Gom lại thành block theo hội thoại để vẫn học 3 câu liên quan cùng nhau.
          restart(groupIntoBlocks(wrong));
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Thanh trên */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Thoát</Button>
        </Link>
        <div className="flex items-center gap-2">
          {current.graphicData && (
            <Badge variant="outline"><ImageIcon className="h-3.5 w-3.5" /> Có graphic</Badge>
          )}
          {current.passage && (
            <Badge variant="outline"><BookOpenText className="h-3.5 w-3.5" /> Có đoạn văn</Badge>
          )}
          {modeBadge}
        </div>
      </div>

      {/* Tiến độ theo hội thoại */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{title}</span>
          <span className="tabular-nums text-muted-foreground">
            Đoạn {index + 1}/{blocks.length}
          </span>
        </div>
        <Progress value={((index + 1) / blocks.length) * 100} />
        {mode === "test" && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Đã chọn {answeredCount}/{allQuestions.length} câu · chấm điểm khi nộp bài.
          </p>
        )}
      </div>

      {/* Một hội thoại: graphic (1 lần) + 3 câu liên quan */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="space-y-4"
          >
            {/* Nhãn nhóm */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{current.part}</Badge>
              <span className="text-sm font-semibold">{current.title}</span>
              {current.questions.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  · {current.questions.length} câu liên quan
                </span>
              )}
            </div>

            {/* Đoạn văn / graphic dùng chung cho cả nhóm */}
            {current.passage && <PassageCard passage={current.passage} />}
            {current.graphicData && <GraphicCard graphic={current.graphicData} />}

            {/* Các câu trong hội thoại */}
            <Card className="divide-y divide-border">
              {current.questions.map((q) => (
                <div key={q.uid} className="p-4 sm:p-5">
                  <QuestionCard
                    question={q}
                    selected={session[q.uid]}
                    revealed={mode === "study" && checked.has(q.uid)}
                    bookmarked={progress.bookmarks.includes(q.uid)}
                    onSelect={(key) => handleSelect(q, key)}
                    onToggleBookmark={() => toggleBookmark(q.uid)}
                    showGraphic={false}
                  />
                </div>
              ))}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Điều hướng theo hội thoại */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="outline" onClick={() => goTo(index - 1)} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" /> Đoạn trước
        </Button>
        {canNext ? (
          <Button onClick={() => goTo(index + 1)}>
            Đoạn tiếp <ChevronRight className="h-4 w-4" />
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
