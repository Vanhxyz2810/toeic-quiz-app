"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/** Header dính trên cùng, có logo + toggle theme. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">TOEIC Quiz</p>
            <p className="text-xs text-muted-foreground">Part 3–7 · 2 Practice Tests</p>
          </div>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
