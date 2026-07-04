"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronDown,
  Lightbulb,
  X,
} from "lucide-react";
import { useState } from "react";
import type { AnswerKey, EnrichedQuestion } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GraphicCard } from "@/components/graphic-card";

interface QuestionCardProps {
  question: EnrichedQuestion;
  selected?: AnswerKey;
  /** true khi đã "check" (study mode) hoặc đã submit (test mode) -> hiện đúng/sai. */
  revealed: boolean;
  bookmarked: boolean;
  onSelect: (key: AnswerKey) => void;
  onToggleBookmark: () => void;
}

export function QuestionCard({
  question,
  selected,
  revealed,
  bookmarked,
  onSelect,
  onToggleBookmark,
}: QuestionCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const correct = question.correctAnswer;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr] xl:gap-6">
      {/* Graphic (nếu có) hiển thị phía trên câu hỏi */}
      {question.graphicData && <GraphicCard graphic={question.graphicData} />}

      <div>
        {/* Header câu hỏi */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {question.questionNumber}
            </span>
            <h2 className="pt-1 text-lg font-semibold leading-snug">{question.questionText}</h2>
          </div>
          <button
            onClick={onToggleBookmark}
            aria-label={bookmarked ? "Bỏ đánh dấu" : "Đánh dấu câu khó"}
            className={cn(
              "shrink-0 rounded-lg p-2 transition-colors",
              bookmarked ? "bg-amber-400/15 text-amber-500" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Bookmark className={cn("h-5 w-5", bookmarked && "fill-current")} />
          </button>
        </div>

        {/* Danh sách đáp án */}
        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const isSelected = selected === opt.key;
            const isCorrect = opt.key === correct;
            // Trạng thái màu sau khi reveal
            const state = !revealed
              ? isSelected
                ? "selected"
                : "idle"
              : isCorrect
                ? "correct"
                : isSelected
                  ? "wrong"
                  : "idle";

            return (
              <motion.button
                key={opt.key}
                type="button"
                disabled={revealed}
                onClick={() => onSelect(opt.key)}
                whileTap={revealed ? undefined : { scale: 0.99 }}
                animate={state === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  state === "idle" && "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                  state === "selected" && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  state === "correct" && "border-success bg-success/10",
                  state === "wrong" && "border-danger bg-danger/10"
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold transition-colors",
                    state === "idle" && "border-border text-muted-foreground",
                    state === "selected" && "border-primary text-primary",
                    state === "correct" && "border-success bg-success text-success-foreground",
                    state === "wrong" && "border-danger bg-danger text-danger-foreground"
                  )}
                >
                  {opt.key}
                </span>
                <span className="flex-1 text-sm sm:text-base">{opt.text}</span>

                {/* Icon phản hồi */}
                <AnimatePresence>
                  {state === "correct" && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-success"
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </motion.span>
                  )}
                  {state === "wrong" && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-danger"
                    >
                      <X className="h-5 w-5" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Kết quả + giải thích (chỉ sau khi reveal) */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3">
                {selected === correct ? (
                  <Badge variant="success" className="px-3 py-1 text-sm">
                    <Check className="h-4 w-4" /> Chính xác!
                  </Badge>
                ) : (
                  <Badge variant="danger" className="px-3 py-1 text-sm">
                    <X className="h-4 w-4" /> Đáp án đúng là ({correct})
                  </Badge>
                )}

                <button
                  onClick={() => setShowExplanation((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-primary"
                >
                  <Lightbulb className="h-4 w-4" />
                  {showExplanation ? "Ẩn giải thích" : "Xem giải thích"}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showExplanation && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        {question.explanation?.trim()
                          ? question.explanation
                          : "Chưa có giải thích cho câu này."}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
