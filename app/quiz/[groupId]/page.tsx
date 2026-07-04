"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { EnrichedQuestion, QuizMode, QuizSetKey } from "@/types";
import { resolveQuestionSet, setLabel } from "@/lib/data";
import { useProgress } from "@/components/providers";
import { QuizRunner } from "@/components/quiz-runner";
import { Button } from "@/components/ui/button";

export default function QuizPage({ params }: { params: { groupId: string } }) {
  const setKey = decodeURIComponent(params.groupId) as QuizSetKey;
  const searchParams = useSearchParams();
  const mode: QuizMode = searchParams.get("mode") === "test" ? "test" : "study";

  const { progress, hydrated } = useProgress();

  // Snapshot tập câu hỏi 1 lần sau khi hydrate — không đổi giữa chừng khi trả lời.
  const [questions, setQuestions] = useState<EnrichedQuestion[] | null>(null);
  useEffect(() => {
    if (hydrated && questions === null) {
      setQuestions(resolveQuestionSet(setKey, progress));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated || questions === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Đang tải bộ câu hỏi…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-muted-foreground">
          Chưa có câu nào cho mục “{setLabel(setKey)}”.
        </p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Về Dashboard</Button>
        </Link>
      </div>
    );
  }

  return <QuizRunner title={setLabel(setKey)} questions={questions} mode={mode} />;
}
