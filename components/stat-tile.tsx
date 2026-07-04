import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "danger" | "muted";
}

const tones = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  danger: "text-danger bg-danger/10",
  muted: "text-muted-foreground bg-muted",
} as const;

/** Ô thống kê nhỏ dùng trên dashboard. */
export function StatTile({ icon: Icon, label, value, hint, tone = "primary" }: StatTileProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid h-11 w-11 place-items-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
