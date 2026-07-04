"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import type { AnswerKey, EnrichedQuestion } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccuracyRing } from "@/components/accuracy-ring";

interface ResultScreenProps {
  questions: EnrichedQuestion[];
  answers: Record<number, AnswerKey>;
  onRetryAll: () => void;
  onRetryWrong: (wrong: EnrichedQuestion[]) => void;
}

/** Màn tổng kết sau khi hoàn thành phiên quiz. */
export function ResultScreen({ questions, answers, onRetryAll, onRetryWrong }: ResultScreenProps) {
  const total = questions.length;
  const correct = questions.filter((q) => answers[q.questionNumber] === q.correctAnswer).length;
  const wrong = questions.filter(
    (q) => answers[q.questionNumber] && answers[q.questionNumber] !== q.correctAnswer
  );
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  const praise =
    accuracy >= 90 ? "Xuất sắc! 🎉" : accuracy >= 70 ? "Làm tốt lắm! 👏" : accuracy >= 50 ? "Khá ổn, cố thêm nhé!" : "Cần luyện thêm nhé!";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/20 text-amber-500"
          >
            <Trophy className="h-8 w-8" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold">{praise}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bạn đã hoàn thành phiên luyện tập</p>
          </div>
          <AccuracyRing value={accuracy} label="chính xác" />
        </div>

        <CardContent className="grid grid-cols-3 gap-3 border-t border-border p-6">
          <Stat icon={CheckCircle2} tone="success" label="Đúng" value={correct} />
          <Stat icon={XCircle} tone="danger" label="Sai" value={wrong.length} />
          <Stat icon={Target} tone="primary" label="Tổng" value={total} />
        </CardContent>
      </Card>

      {/* Danh sách câu sai */}
      {wrong.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <XCircle className="h-4 w-4 text-danger" /> Câu trả lời sai ({wrong.length})
            </h2>
            <ul className="space-y-2">
              {wrong.map((q) => {
                const chosen = q.options.find((o) => o.key === answers[q.questionNumber]);
                const correct = q.options.find((o) => o.key === q.correctAnswer);
                return (
                  <li key={q.questionNumber} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-danger">#{q.questionNumber}</span>
                      <span className="flex-1">{q.questionText}</span>
                    </div>
                    <div className="mt-2 space-y-1 pl-6 text-xs">
                      <p className="text-danger">✗ Bạn chọn: {chosen?.text ?? "—"}</p>
                      <p className="text-success">✓ Đáp án đúng: {correct?.text ?? "—"}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Hành động */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Về Dashboard
          </Button>
        </Link>
        <Button variant="secondary" onClick={onRetryAll}>
          <RotateCcw className="h-4 w-4" /> Làm lại toàn bộ
        </Button>
        {wrong.length > 0 && (
          <Button variant="danger" onClick={() => onRetryWrong(wrong)}>
            <XCircle className="h-4 w-4" /> Làm lại câu sai ({wrong.length})
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "success" | "danger" | "primary";
}) {
  const tones = {
    success: "text-success bg-success/10",
    danger: "text-danger bg-danger/10",
    primary: "text-primary bg-primary/10",
  } as const;
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center">
      <span className={cn("grid h-9 w-9 place-items-center rounded-lg", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
