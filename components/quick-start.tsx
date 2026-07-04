"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizMode } from "@/types";

interface QuickStartProps {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  count: number;
  mode: QuizMode;
  /** Query string (không kèm dấu ?) — mode + tùy chọn đảo. */
  query: string;
  tone?: "primary" | "success" | "danger" | "amber";
  disabled?: boolean;
}

const tones = {
  primary: "from-primary/15 to-primary/5 text-primary",
  success: "from-success/15 to-success/5 text-success",
  danger: "from-danger/15 to-danger/5 text-danger",
  amber: "from-amber-400/20 to-amber-400/5 text-amber-500",
} as const;

/** Thẻ bắt đầu nhanh một chế độ quiz. */
export function QuickStart({
  href,
  icon: Icon,
  title,
  subtitle,
  count,
  mode,
  query,
  tone = "primary",
  disabled,
}: QuickStartProps) {
  const body = (
    <motion.div
      whileHover={disabled ? undefined : { y: -3 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-colors",
        disabled ? "cursor-not-allowed opacity-55" : "hover:border-primary/40"
      )}
    >
      <div
        className={cn(
          "mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br",
          tones[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {count} câu · {mode === "study" ? "Study" : "Test"}
      </p>
    </motion.div>
  );

  if (disabled) return <div>{body}</div>;
  return (
    <Link href={`${href}?${query}`} className="block h-full">
      {body}
    </Link>
  );
}
