"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { BookOpenText, Info, Mail, MessagesSquare } from "lucide-react";
import type { Passage, PassageDoc } from "@/types";
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

/* ---- Renderer cho từng tài liệu Part 7 ------------------------------------ */
function DocView({ doc }: { doc: PassageDoc }) {
  if (doc.format === "chat") {
    return (
      <div className="space-y-2.5">
        {doc.entries?.map((e, i) => (
          <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-primary">{e.speaker}</span>
              {e.time && <span className="text-[10px] text-muted-foreground">{e.time}</span>}
            </div>
            <p className="text-sm leading-relaxed">{e.text}</p>
          </div>
        ))}
      </div>
    );
  }

  if (doc.format === "email") {
    return (
      <div>
        {doc.header && (
          <div className="mb-3 overflow-hidden rounded-lg border border-border">
            {doc.header.map((h, i) => (
              <div key={i} className="grid grid-cols-[5rem_1fr] border-b border-border last:border-b-0 text-sm">
                <div className="bg-muted/60 px-3 py-1.5 font-medium text-muted-foreground">{h.label}</div>
                <div className="px-3 py-1.5 break-words">{h.value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2 text-sm leading-relaxed">
          {doc.paragraphs?.map((p, i) => (
            <p key={i}>{withBlanks(p)}</p>
          ))}
        </div>
      </div>
    );
  }

  // plain
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {doc.paragraphs?.map((p, i) => (
        <p key={i}>{withBlanks(p)}</p>
      ))}
    </div>
  );
}

function DocLabel({ doc }: { doc: PassageDoc }) {
  const Icon = doc.format === "chat" ? MessagesSquare : doc.format === "email" ? Mail : BookOpenText;
  if (!doc.label) return null;
  return (
    <Badge variant="secondary" className="mb-2">
      <Icon className="h-3.5 w-3.5" /> {doc.label}
    </Badge>
  );
}

/**
 * Card hiển thị đoạn văn dùng chung cho cả nhóm (Part 6 & 7).
 * - documents: nguyên văn Part 7 (chat / email / plain), có thể nhiều tài liệu.
 * - text: nội dung đầy đủ (Part 6) — tô sáng chỗ trống.
 * - reference: mô tả tham chiếu (Part 7 chưa có nguyên văn).
 */
export function PassageCard({ passage }: { passage: Passage }) {
  const hasDocs = passage.documents && passage.documents.length > 0;
  const isReference = passage.type === "reference" && !hasDocs;

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
          {passage.title && !hasDocs && <Badge variant="accent">{passage.title}</Badge>}
        </div>

        {hasDocs ? (
          <div className="max-h-[26rem] space-y-4 overflow-y-auto p-4">
            {passage.documents!.map((doc, i) => (
              <div key={i}>
                <DocLabel doc={doc} />
                <DocView doc={doc} />
              </div>
            ))}
          </div>
        ) : isReference ? (
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
