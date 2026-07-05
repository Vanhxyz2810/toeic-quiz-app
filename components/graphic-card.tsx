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
  Coffee,
  DoorOpen,
  Droplets,
  Gem,
  Home,
  Image as ImageIcon,
  Map,
  Monitor,
  Newspaper,
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
type BoardKind = "flight" | "train" | "clinic" | "menu" | "magazine" | "gem" | "plain";

function detectBoardKind(table: GraphicTable): BoardKind {
  const h = table.headers;
  if (h[0] === "Flight") return "flight";
  if (h[2] === "Platform") return "train";
  if (h[1] === "Price") return h[0] === "Magazine" ? "magazine" : "menu";
  if (h[1] === "Birthstone") return "gem";

  // Bảng markdown đề 1 (header gốc trong nguồn).
  const firstCol = table.rows.map((r) => (r[0] ?? "").trim());
  const headerText = h.join(" ").toLowerCase();
  const allTimes = firstCol.every((c) => /\d{1,2}:\d{2}/.test(c));
  if (allTimes && /(patient|appointment)/.test(headerText)) return "clinic";
  if (allTimes && /(depart|destination)/.test(headerText)) return "train";
  if (allTimes) return "clinic";
  return "plain";
}

const KIND_META: Record<Exclude<BoardKind, "plain">, { icon: typeof Plane; heading: string }> = {
  flight: { icon: Plane, heading: "DEPARTURES" },
  train: { icon: TrainFront, heading: "DEPARTURES" },
  clinic: { icon: Stethoscope, heading: "SCHEDULE" },
  menu: { icon: Coffee, heading: "MENU" },
  magazine: { icon: Newspaper, heading: "MAGAZINES" },
  gem: { icon: Gem, heading: "BIRTHSTONES" },
};

/** Lấy tên bảng trong ngoặc, vd "(WESTGATE CLINIC)" -> "WESTGATE CLINIC". */
function parenthetical(title: string): string {
  const m = title.match(/\(([^)]+)\)/);
  return (m ? m[1] : title).replace(/^Graphic\s*-\s*/i, "").trim();
}

/** Tiêu đề tiếng Việt (có dấu) -> dùng heading mặc định theo loại board. */
function hasVietnamese(s: string): boolean {
  return /[àáảãạăâđèéẻẽẹêìíỉĩịòóỏõọôơùúủũụưỳýỷỹỵ]/i.test(s);
}

/** Cột nên dùng font mono: giờ, mã hiệu, giá tiền. */
function isMonoCol(table: GraphicTable, c: number): boolean {
  return table.rows.every(
    (r) => /\d{1,2}:\d{2}/.test(r[c] ?? "") || /^[A-Z]{2,3}\s?\d{2,4}$/.test((r[c] ?? "").trim()) || /^\$\s?\d/.test((r[c] ?? "").trim())
  );
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
   Bảng "signage" — mô phỏng bảng in trong đề TOEIC (hỗ trợ 2-3 cột).
   ============================================================ */
function SignTable({
  table,
  kind,
  boardTitle,
}: {
  table: GraphicTable;
  kind: Exclude<BoardKind, "plain">;
  boardTitle: string;
}) {
  const { icon: Icon, heading } = KIND_META[kind];
  const cols = table.headers.length;
  const monoCols = table.headers.map((_, c) => isMonoCol(table, c));

  // Tiêu đề: dùng tên trong đề nếu là tiếng Anh, ngược lại heading mặc định.
  const rawTitle = boardTitle && !hasVietnamese(boardTitle) ? boardTitle : heading;
  const [mainTitle, subTitle] = /departures/i.test(rawTitle) && rawTitle.toLowerCase() !== "departures"
    ? [rawTitle.replace(/departures/i, "").trim(), "Departures"]
    : [rawTitle, null];

  // Cột đầu hẹp khi chứa giờ/mã hiệu; ngược lại cột đầu rộng, cột sau hẹp.
  const gridTemplateColumns =
    cols === 3 ? "1fr 6.5rem 7.5rem" : monoCols[0] ? "10rem 1fr" : "1fr 8rem";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 shadow-sm dark:border-slate-700">
      <div className="flex flex-col items-center justify-center gap-0.5 bg-slate-700 py-2 text-center text-slate-50 dark:bg-slate-800">
        <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest">
          <Icon className="h-4 w-4" /> {mainTitle}
        </span>
        {subTitle && (
          <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{subTitle}</span>
        )}
      </div>

      <div
        className="grid bg-slate-600 text-xs font-semibold uppercase tracking-wide text-slate-50 dark:bg-slate-700"
        style={{ gridTemplateColumns }}
      >
        {table.headers.map((h, i) => (
          <div key={i} className={i < cols - 1 ? "border-r border-slate-500/50 px-4 py-2" : "px-4 py-2"}>
            {h}
          </div>
        ))}
      </div>

      <div>
        {table.rows.map((row, r) => (
          <motion.div
            key={r}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: r * 0.06 }}
            className="grid items-center border-t border-slate-200 bg-slate-50 text-sm odd:bg-white dark:border-slate-700 dark:bg-slate-900 dark:odd:bg-slate-950"
            style={{ gridTemplateColumns }}
          >
            {row.map((cell, c) => (
              <div
                key={c}
                className={[
                  "px-4 py-2.5",
                  c < cols - 1 ? "border-r border-slate-200 dark:border-slate-700" : "",
                  c === 0 ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-700 dark:text-slate-200",
                  monoCols[c] ? "font-mono tabular-nums tracking-wide" : "",
                ].join(" ")}
              >
                {cell}
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Bảng thường (fallback).
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
   Sơ đồ vườn (garden layout) — đề 1, câu 98-100.
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
        <EdgeBox icon={Home} label="Shed" className="-top-3 left-3" />
        <EdgeBox icon={Sprout} label="Greenhouse" className="-top-3 right-3" />
        <AreaChip n={1} className="left-[15%] top-[16%]" />
        <AreaChip n={2} className="right-[15%] top-[16%]" />
        <AreaChip n={3} className="bottom-[20%] left-[15%]" />
        <AreaChip n={4} className="bottom-[20%] right-[15%]" />
        <div className="absolute left-1/2 top-1/2 flex h-14 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[50%] border border-sky-400 bg-sky-200/70 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-100">
          <Droplets className="h-4 w-4" />
          Pond
        </div>
        <EdgeBox icon={DoorOpen} label="Gate" className="-bottom-3 left-4" />
        <EdgeBox icon={Home} label="House" className="-bottom-3 right-4" />
      </div>
      <div className={fence}>Fence</div>
    </div>
  );
}

/* ============================================================
   Sơ đồ văn phòng (office map) — đề 2, câu 68-70, theo ảnh đề gốc:
   hành lang NGANG ở giữa; phòng 3, 1 hàng trên; phòng 4, 2 hàng dưới;
   Entrance góc trên phải; Reception desk nằm chéo góc dưới phải.
   ============================================================ */
function RoomBox({ n }: { n: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-indigo-500/50 bg-indigo-50 py-4 dark:bg-indigo-950/40">
      <DoorOpen className="h-4 w-4 text-indigo-500" />
      <span className="mt-1 text-base font-bold text-indigo-800 dark:text-indigo-200">{n}</span>
    </div>
  );
}

function OfficeMap() {
  return (
    <div className="rounded-xl border-2 border-slate-400/60 bg-white p-3 dark:bg-slate-900/50">
      <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-x-2">
        {/* Hàng trên: Room 3 | Room 1 | Entrance (góc trên phải) */}
        <RoomBox n={3} />
        <RoomBox n={1} />
        <div className="flex items-start justify-end">
          <div className="flex items-center gap-1 rounded-md border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <DoorOpen className="h-3.5 w-3.5" /> Entrance
          </div>
        </div>

        {/* Hành lang ngang xuyên giữa, dẫn từ Entrance vào các phòng */}
        <div className="col-span-3 my-2 flex h-9 items-center justify-center rounded-md bg-slate-200/80 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
          Hallway →
        </div>

        {/* Hàng dưới: Room 4 | Room 2 | Reception desk (nằm chéo) */}
        <RoomBox n={4} />
        <RoomBox n={2} />
        <div className="flex items-end justify-end pb-1 pr-1">
          <div className="flex -rotate-12 items-center gap-1 rounded-md border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
            <Monitor className="h-3.5 w-3.5" /> Reception desk
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Card graphic chính — chọn renderer theo dữ liệu.
   ============================================================ */
export function GraphicCard({ graphic }: { graphic: GraphicData }) {
  const isGarden = graphic.type === "description" && /vườn|garden/i.test(graphic.title);
  const isOffice = graphic.type === "description" && /văn phòng|office/i.test(graphic.title);

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

          {/* --- Sơ đồ: vườn / văn phòng / fallback list --- */}
          {graphic.type === "description" &&
            (isGarden ? (
              <GardenMap />
            ) : isOffice ? (
              <OfficeMap />
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
