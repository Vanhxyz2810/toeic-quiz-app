"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { BookOpenText, Info } from "lucide-react";
import type { Passage } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Tô sáng các chỗ trống dạng (131) trong đoạn văn Part 6. */
function withBlanks(line: string) {
  const parts = line.split(/(\(\d{3}\))/g);
  return parts.map((p, i) =>
    /^\(\d{3}\)$/.test(p) ? (
      <span
        key={i}
        className="mx-0.5 inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary"
      >
        {p}
      </span>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

/**
 * Card hiển thị đoạn văn dùng chung cho cả nhóm câu (Part 6 & 7).
 * - text: nội dung đầy đủ (Part 6) — cuộn được, tô sáng chỗ trống.
 * - reference: mô tả tham chiếu (Part 7) — đề gốc không kèm nguyên văn.
 */
export function PassageCard({ passage }: { passage: Passage }) {
  const isReference = passage.type === "reference";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-accent/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpenText className="h-4 w-4 text-primary" />
            <span>Đoạn văn</span>
          </div>
          {passage.title && <Badge variant="accent">{passage.title}</Badge>}
        </div>

        {isReference ? (
          <div className="p-4">
            <div className="flex gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
              <p>{passage.content.join(" ")}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground/80">
              * Đề gốc không kèm nguyên văn đoạn đọc — đây là mô tả tham chiếu để định hướng câu hỏi.
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-4">
            <div className="space-y-2 text-sm leading-relaxed">
              {passage.content.map((line, i) => (
                <p key={i} className={/^(To:|From:|Re:|Subject:|Date:|Pages:)/.test(line) ? "text-muted-foreground" : ""}>
                  {withBlanks(line)}
                </p>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
