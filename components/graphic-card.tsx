"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  DoorOpen,
  Droplets,
  Home,
  Image as ImageIcon,
  Map,
  Plane,
  Sprout,
  Stethoscope,
  Table2,
  TrainFront,
} from "lucide-react";
import type { GraphicData, GraphicTable } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CHART_COLORS = [
  "hsl(243 75% 60%)",
  "hsl(199 89% 48%)",
  "hsl(142 72% 45%)",
  "hsl(38 92% 50%)",
];

/* ============================================================
   Nhận diện "loại bảng" để render giống graphic thật trong đề.
   ============================================================ */
type BoardKind = "flight" | "train" | "clinic" | "plain";

function detectBoardKind(table: GraphicTable): BoardKind {
  const firstCol = table.rows.map((r) => (r[0] ?? "").trim());
  const headerText = table.headers.join(" ").toLowerCase();
  const allFlightCodes = firstCol.every((c) => /^[A-Z]{2,3}\s?\d{2,4}$/.test(c));
  const allTimes = firstCol.every((c) => /\d{1,2}:\d{2}/.test(c));

  if (allFlightCodes) return "flight";
  if (allTimes && /(patient|appointment)/.test(headerText)) return "clinic";
  if (allTimes && /(depart|destination)/.test(headerText)) return "train";
  if (allTimes) return "clinic";
  return "plain";
}

/** Lấy tên bảng in hoa trong ngoặc, vd "(WESTGATE CLINIC)" -> "WESTGATE CLINIC". */
function parenthetical(title: string): string {
  const m = title.match(/\(([^)]+)\)/);
  return (m ? m[1] : title).trim();
}

function TypeBadge({ type }: { type: GraphicData["type"] }) {
  const map = {
    table: { icon: Table2, label: "Bảng dữ liệu" },
    chart: { icon: BarChart3, label: "Biểu đồ" },
    description: { icon: Map, label: "Sơ đồ" },
  } as const;
  const { icon: Icon, label } = map[type];
  return (
    <Badge variant="accent">
      <Icon className="h-3.5 w-3.5" /> {label}
    </Badge>
  );
}

/* ============================================================
   Bảng thông tin dạng "signage" — mô phỏng bảng in trong đề TOEIC
   (flight board, train departures, clinic schedule).
   ============================================================ */
function SignTable({
  table,
  kind,
  boardTitle,
}: {
  table: GraphicTable;
  kind: BoardKind;
  boardTitle: string;
}) {
  const Icon =
    kind === "flight" ? Plane : kind === "train" ? TrainFront : kind === "clinic" ? Stethoscope : Table2;

  // EASTERN TRAINS có dòng phụ "Departures"; tách ra cho giống ảnh.
  const [mainTitle, subTitle] =
    kind === "train" && /departures/i.test(boardTitle)
      ? [boardTitle.replace(/departures/i, "").trim(), "Departures"]
      : [boardTitle, null];

  const monoFirst = kind === "flight" || kind === "train" || kind === "clinic";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 shadow-sm dark:border-slate-700">
      {/* Tiêu đề bảng (căn giữa, in hoa) */}
      <div className="flex flex-col items-center justify-center gap-0.5 bg-slate-700 py-2 text-center text-slate-50 dark:bg-slate-800">
        <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest">
          <Icon className="h-4 w-4" /> {mainTitle}
        </span>
        {subTitle && <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{subTitle}</span>}
      </div>

      {/* Header cột */}
      <div className="grid grid-cols-[9rem_1fr] bg-slate-600 text-xs font-semibold uppercase tracking-wide text-slate-50 dark:bg-slate-700">
        <div className="border-r border-slate-500/50 px-4 py-2">{table.headers[0]}</div>
        <div className="px-4 py-2">{table.headers[1]}</div>
      </div>

      {/* Các dòng dữ liệu — zebra xám như bảng in */}
      <div>
        {table.rows.map((row, r) => (
          <motion.div
            key={r}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: r * 0.06 }}
            className="grid grid-cols-[9rem_1fr] items-center border-t border-slate-200 bg-slate-50 text-sm odd:bg-white dark:border-slate-700 dark:bg-slate-900 dark:odd:bg-slate-950"
          >
            <div
              className={`border-r border-slate-200 px-4 py-2.5 font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100 ${
                monoFirst ? "font-mono tabular-nums tracking-wide" : ""
              }`}
            >
              {row[0]}
            </div>
            <div className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{row[1]}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Bảng thường (fallback) — table gọn có zebra.
   ============================================================ */
function PlainTable({ table }: { table: GraphicTable }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="bg-muted px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="odd:bg-muted/20">
              {row.map((cell, c) => (
                <td key={c} className="border-t border-border/60 px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Sơ đồ vườn (garden layout) — dựng đúng bố cục ảnh đề:
   Shed & Greenhouse ở mép trên, Fence hai bên, khu 1-2-3-4,
   Pond ở giữa, Gate + House ở mép dưới.
   ============================================================ */
function EdgeBox({ icon: Icon, label, className }: { icon: typeof Home; label: string; className: string }) {
  return (
    <div
      className={`absolute z-10 flex items-center gap-1 rounded-md border border-slate-400 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    >
      <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      {label}
    </div>
  );
}

function AreaChip({ n, className }: { n: number; className: string }) {
  return (
    <div className={`absolute flex flex-col items-center ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-emerald-600 bg-emerald-100 text-base font-bold text-emerald-800 shadow-sm dark:bg-emerald-900/60 dark:text-emerald-100">
        {n}
      </span>
      <span className="mt-0.5 text-[10px] font-medium text-emerald-700/80 dark:text-emerald-300/80">Khu {n}</span>
    </div>
  );
}

function GardenMap() {
  const fence =
    "flex items-center justify-center [writing-mode:vertical-rl] text-[10px] font-semibold uppercase tracking-widest text-slate-500";
  return (
    <div className="flex items-stretch gap-1">
      <div className={fence}>Fence</div>

      <div className="relative aspect-[5/4] flex-1 rounded-lg border-2 border-emerald-700/50 bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-emerald-950/50 dark:to-emerald-900/30">
        {/* Mép trên: Shed (trái), Greenhouse (phải) */}
        <EdgeBox icon={Home} label="Shed" className="-top-3 left-3" />
        <EdgeBox icon={Sprout} label="Greenhouse" className="-top-3 right-3" />

        {/* 4 khu vực trồng cây */}
        <AreaChip n={1} className="left-[15%] top-[16%]" />
        <AreaChip n={2} className="right-[15%] top-[16%]" />
        <AreaChip n={3} className="bottom-[20%] left-[15%]" />
        <AreaChip n={4} className="bottom-[20%] right-[15%]" />

        {/* Pond ở giữa */}
        <div className="absolute left-1/2 top-1/2 flex h-14 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[50%] border border-sky-400 bg-sky-200/70 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-100">
          <Droplets className="h-4 w-4" />
          Pond
        </div>

        {/* Mép dưới: Gate (trái), House (phải) */}
        <EdgeBox icon={DoorOpen} label="Gate" className="-bottom-3 left-4" />
        <EdgeBox icon={Home} label="House" className="-bottom-3 right-4" />
      </div>

      <div className={fence}>Fence</div>
    </div>
  );
}

/* ============================================================
   Card graphic chính — chọn renderer theo dữ liệu.
   ============================================================ */
export function GraphicCard({ graphic }: { graphic: GraphicData }) {
  const isGarden = graphic.type === "description" && /vườn|garden/i.test(graphic.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-accent/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{graphic.title}</span>
          </div>
          <TypeBadge type={graphic.type} />
        </div>

        <div className="p-4">
          {/* --- Bảng: chọn kiểu render theo nội dung --- */}
          {graphic.type === "table" &&
            graphic.table &&
            (() => {
              const kind = detectBoardKind(graphic.table);
              if (kind === "plain") return <PlainTable table={graphic.table} />;
              return (
                <SignTable
                  table={graphic.table}
                  kind={kind}
                  boardTitle={parenthetical(graphic.title)}
                />
              );
            })()}

          {/* --- Biểu đồ cột --- */}
          {graphic.type === "chart" && graphic.chart && (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={graphic.chart.map((d) => ({
                    name: d.label.split("(")[0].trim(),
                    value: d.value,
                  }))}
                  margin={{ top: 20, right: 8, left: -18, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => `${v}%`}
                      fontSize={11}
                    />
                    {graphic.chart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* --- Sơ đồ: bản đồ vườn 2D, còn lại fallback list --- */}
          {graphic.type === "description" &&
            (isGarden ? (
              <GardenMap />
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {graphic.raw.slice(1).map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </Card>
    </motion.div>
  );
}
