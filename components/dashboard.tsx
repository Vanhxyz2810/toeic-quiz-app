"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  ListChecks,
  ListOrdered,
  RotateCcw,
  Search,
  Shuffle,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { useProgress } from "@/components/providers";
import { groups, parts, resolveQuestionSet } from "@/lib/data";
import { cn, pct } from "@/lib/utils";
import type { QuizMode } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatTile } from "@/components/stat-tile";
import { AccuracyRing } from "@/components/accuracy-ring";
import { QuickStart } from "@/components/quick-start";

export function Dashboard() {
  const { stats, progress, reset, hydrated } = useProgress();
  const [mode, setMode] = useState<QuizMode>("study");
  const [shuffleGroups, setShuffleGroups] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [query, setQuery] = useState("");

  // Query string chung cho mọi link quiz: mode + tùy chọn đảo.
  const qs = `mode=${mode}${shuffleGroups ? "&sg=1" : ""}${shuffleOptions ? "&so=1" : ""}`;

  const wrongCount = resolveQuestionSet("wrong", progress).length;
  const bookmarkCount = resolveQuestionSet("bookmarked", progress).length;
  const graphicCount = resolveQuestionSet("graphic").length;

  // Lọc nhóm theo search (số câu hoặc keyword trong đề).
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.title.toLowerCase().includes(q)) return true;
      return g.questions.some(
        (qs) =>
          String(qs.questionNumber) === q ||
          qs.questionText.toLowerCase().includes(q) ||
          qs.options.some((o) => o.text.toLowerCase().includes(q))
      );
    });
  }, [query]);

  return (
    <div className="space-y-8">
      {/* ---------------- Overview ---------------- */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[auto,1fr] md:items-center">
            <div className="flex items-center justify-center">
              <AccuracyRing value={hydrated ? stats.completion : 0} />
            </div>
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">Bảng điều khiển học tập</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Luyện nghe TOEIC Part 3 &amp; 4 — chọn một chế độ bên dưới để bắt đầu.
                  Tiến độ được lưu tự động trên trình duyệt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile icon={Layers} label="Tổng số câu" value={stats.total} tone="muted" />
                <StatTile icon={ListChecks} label="Đã làm" value={stats.answered} tone="primary" />
                <StatTile icon={CheckCircle2} label="Câu đúng" value={stats.correct} tone="success" />
                <StatTile icon={Target} label="Độ chính xác" value={`${stats.accuracy}%`} tone="danger" />
              </div>
            </div>
          </div>
        </Card>
      </motion.section>

      {/* ---------------- Chọn chế độ + Quick start ---------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Bắt đầu nhanh</h2>
          <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm">
            {(["study", "test"] as QuizMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "study" ? "Study Mode" : "Test Mode"}
              </button>
            ))}
          </div>
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {mode === "study"
              ? "Study: chọn xong hiện đúng/sai ngay + giải thích."
              : "Test: làm hết rồi mới chấm điểm, giống thi thật."}
          </p>
          <span className="text-muted-foreground/40">·</span>
          {/* Toggle đảo nhóm hội thoại */}
          <button
            onClick={() => setShuffleGroups((v) => !v)}
            aria-pressed={shuffleGroups}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              shuffleGroups
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Shuffle className="h-3.5 w-3.5" /> Đảo thứ tự hội thoại
          </button>
          {/* Toggle đảo đáp án */}
          <button
            onClick={() => setShuffleOptions((v) => !v)}
            aria-pressed={shuffleOptions}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              shuffleOptions
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <ListOrdered className="h-3.5 w-3.5" /> Đảo đáp án A/B/C/D
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          Đảo hội thoại chỉ xáo thứ tự các đoạn — 3 câu trong một đoạn luôn đi cùng nhau.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickStart href="/quiz/all" icon={BookOpen} title="Toàn bộ đề" subtitle="Tất cả câu Part 3 & 4" count={stats.total} mode={mode} query={qs} />
          <QuickStart href="/quiz/part-3" icon={Layers} title="Part 3" subtitle="Conversations" count={resolveQuestionSet("part-3").length} mode={mode} query={qs} />
          <QuickStart href="/quiz/part-4" icon={Layers} title="Part 4" subtitle="Short talks" count={resolveQuestionSet("part-4").length} mode={mode} query={qs} tone="success" />
          <QuickStart href="/quiz/graphic" icon={ImageIcon} title="Câu có graphic" subtitle="Bảng biểu & sơ đồ" count={graphicCount} mode={mode} query={qs} tone="amber" />
          <QuickStart href="/quiz/wrong" icon={XCircle} title="Ôn câu sai" subtitle="Chỉ những câu đã trả lời sai" count={wrongCount} mode={mode} query={qs} tone="danger" disabled={wrongCount === 0} />
          <QuickStart href="/quiz/bookmarked" icon={Bookmark} title="Câu đã đánh dấu" subtitle="Danh sách bookmark của bạn" count={bookmarkCount} mode={mode} query={qs} tone="primary" disabled={bookmarkCount === 0} />
        </div>
      </section>

      {/* ---------------- Search + danh sách nhóm ---------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Luyện theo nhóm câu</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm số câu hoặc từ khóa…"
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {parts.map((part) => {
          const partGroups = filteredGroups.filter((g) => g.part === part);
          if (!partGroups.length) return null;
          return (
            <div key={part} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{part}</Badge>
                <span className="text-xs text-muted-foreground">{partGroups.length} nhóm</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {partGroups.map((g) => {
                  const total = g.questions.length;
                  const answered = g.questions.filter((q) => progress.answers[q.questionNumber]).length;
                  const correct = g.questions.filter(
                    (q) => progress.answers[q.questionNumber] === q.correctAnswer
                  ).length;
                  const done = answered === total;
                  return (
                    <Link key={g.id} href={`/quiz/${g.id}?${qs}`}>
                      <motion.div whileHover={{ y: -3 }} className="h-full">
                        <Card className={cn("h-full transition-colors hover:border-primary/40", done && "border-success/40")}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base">{g.title}</CardTitle>
                              {g.hasGraphic && (
                                <Badge variant="accent">
                                  <ImageIcon className="h-3.5 w-3.5" /> Graphic
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{total} câu</span>
                              {done ? (
                                <span className="inline-flex items-center gap-1 font-medium text-success">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {correct}/{total} đúng
                                </span>
                              ) : (
                                <span>{answered}/{total} đã làm</span>
                              )}
                            </div>
                            <Progress value={pct(answered, total)} indicatorClassName={done ? "bg-success" : undefined} />
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy câu nào khớp với “{query}”.
            </CardContent>
          </Card>
        )}
      </section>

      {/* ---------------- Footer actions ---------------- */}
      {stats.answered > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-500" />
            Bạn đã hoàn thành {stats.completion}% chương trình. Tiếp tục nhé!
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Đặt lại tiến độ
          </Button>
        </section>
      )}
    </div>
  );
}
