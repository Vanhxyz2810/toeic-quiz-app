// @ts-check
/**
 * Parser: gộp 2 đề practice test -> data/questions.json
 *   - Test 1: data.txt (Part 3 & 4) + data2.txt (Part 5, 6, 7)
 *   - Test 2: practice_test2.txt (Part 3 -> 7, format [Mã nhóm: ...])
 *
 * Vì số câu của 2 đề trùng nhau (32-200), mỗi câu có thêm:
 *   - uid: khóa duy nhất toàn cục ("32" cho đề 1 — giữ tương thích tiến độ cũ,
 *          "t2-32" cho đề 2) — dùng cho progress/bookmark.
 *   - test: "test1" | "test2".
 * Group id đề 2 có tiền tố "t2-" (vd "t2-q-32-34").
 *
 * Chạy: node scripts/parse-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_T1_34 = resolve(ROOT, "data.txt");
const SRC_T1_567 = resolve(ROOT, "data2.txt");
const SRC_T2 = resolve(ROOT, "practice_test2.txt");
const SRC_P7 = resolve(ROOT, "data", "part7-passages.json"); // nguyên văn Part 7
const OUT = resolve(ROOT, "data", "questions.json");
const GROUP_SIZE_34 = 3;

// ---- Regex dùng chung --------------------------------------------------------
const RE_QUESTION = /^(\d+)\.\s*(.*)$/;
const RE_OPTION = /^\(([A-D])\)\s*(.*)$/;
const RE_ANSWER = /^Đáp án đúng:\s*\(([A-D])\)/i;

/* ============================================================================
   Helpers graphic (dùng chung cho cả 2 đề)
   ============================================================================ */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parseMarkdownTable(block) {
  const rows = block
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
  if (rows.length < 2) return null;
  const isSep = (r) => r.every((c) => /^:?-{3,}:?$/.test(c));
  return { headers: rows[0], rows: rows.slice(1).filter((r) => !isSep(r)) };
}

/** Suy ra header phù hợp cho bảng "A | B" / "A | B | C" theo nội dung + tiêu đề. */
function inferHeaders(rows, title) {
  const cols = rows[0].length;
  if (cols === 3) {
    if (rows.every((r) => /\d{1,2}:\d{2}/.test(r[1]))) return ["Destination", "Time", "Platform"];
    return ["Cột 1", "Cột 2", "Cột 3"];
  }
  if (rows.every((r) => /^[A-Z]{2,3}\s?\d{2,4}$/.test(r[0].trim()))) return ["Flight", "Destination"];
  if (rows.every((r) => /\$\s?\d/.test(r[1]))) {
    return /tạp chí|magazine/i.test(title) ? ["Magazine", "Price"] : ["Item", "Price"];
  }
  if (rows.every((r) => MONTHS.includes(r[0].trim()))) return ["Month", "Birthstone"];
  return ["Thông tin", "Chi tiết"];
}

function parsePipePairs(block, title) {
  const rows = block
    .filter((l) => l.includes("|") && !l.trim().startsWith("|"))
    .map((l) => l.split("|").map((c) => c.trim()));
  if (!rows.length) return null;
  return { headers: inferHeaders(rows, title), rows };
}

function parseBarChart(block) {
  const data = [];
  for (const l of block) {
    const m = l.match(/^(.*?):\s*~?\s*(\d+)\s*%/);
    if (m) data.push({ label: m[1].trim(), value: Number(m[2]) });
  }
  return data.length ? data : null;
}

function buildGraphicData(block, title) {
  const raw = block.slice();
  if (block.some((l) => l.trim().startsWith("|"))) {
    const table = parseMarkdownTable(block);
    if (table) return { type: "table", title, table, raw };
  }
  const chart = parseBarChart(block);
  if (chart) return { type: "chart", title, chart, raw };
  if (block.some((l) => /\S\s*\|\s*\S/.test(l))) {
    const table = parsePipePairs(block, title);
    if (table) return { type: "table", title, table, raw };
  }
  return { type: "description", title, raw };
}

/** Nhãn loại tài liệu từ tail marker, vd "(Đoạn văn 1 - FAX)" -> "FAX". */
function docLabel(tail) {
  const t = (tail || "").replace(/^\(|\)$/g, "").trim();
  if (t.includes("-")) return t.split("-").pop().trim();
  return t;
}

/* ============================================================================
   TEST 1 — Part 3 & 4 (data.txt): gom 3 câu/hội thoại, graphic theo "Look at"
   ============================================================================ */
const RE_PART_34 = /^PART\s+([34])/i;
const RE_GROUP_34 = /^Questions?\s+(\d+)\s*[-–]\s*(\d+)(.*)$/i;
const RE_GRAPHIC_FLAG = /Hình ảnh|Bảng biểu|graphic/i;
const RE_LOOK_GRAPHIC = /Look at the graphic/i;

function parsePart34(raw) {
  const lines = raw.split(/\r?\n/);
  const flat = [];
  let currentPart = "PART 3";
  let q = null;
  let pendingGraphicLines = null;
  let pendingGraphic = null;
  const push = () => { if (q) flat.push(q); q = null; };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const mPart = line.match(RE_PART_34);
    if (mPart) { push(); currentPart = `PART ${mPart[1]}`; pendingGraphicLines = null; continue; }

    const mGroup = line.match(RE_GROUP_34);
    if (mGroup) { push(); pendingGraphicLines = RE_GRAPHIC_FLAG.test(mGroup[3] || "") ? [] : null; continue; }

    const mQ = line.match(RE_QUESTION);
    if (mQ) {
      if (pendingGraphicLines && pendingGraphicLines.length) {
        const first = pendingGraphicLines[0];
        const title = /[:：]/.test(first) ? first.replace(/[:：]\s*$/, "") : "Graphic";
        pendingGraphic = buildGraphicData(pendingGraphicLines, title);
      }
      pendingGraphicLines = null;
      push();
      const text = mQ[2].trim();
      q = { number: Number(mQ[1]), text, options: [], answer: null, part: currentPart, graphicRef: null };
      if (pendingGraphic && RE_LOOK_GRAPHIC.test(text)) { q.graphicRef = pendingGraphic; pendingGraphic = null; }
      continue;
    }
    const mO = line.match(RE_OPTION);
    if (mO && q) { q.options.push({ key: mO[1], text: mO[2].trim() }); continue; }
    const mA = line.match(RE_ANSWER);
    if (mA && q) { q.answer = mA[1]; continue; }

    if (pendingGraphicLines) pendingGraphicLines.push(line);
    else if (q && !q.options.length) q.text += " " + line;
  }
  push();

  const byPart = new Map();
  for (const item of flat) {
    if (!byPart.has(item.part)) byPart.set(item.part, []);
    byPart.get(item.part).push(item);
  }
  const groups = [];
  for (const [part, qs] of byPart) {
    qs.sort((a, b) => a.number - b.number);
    for (let i = 0; i < qs.length; i += GROUP_SIZE_34) {
      const chunk = qs.slice(i, i + GROUP_SIZE_34);
      const from = chunk[0].number, to = chunk[chunk.length - 1].number;
      const graphicData = chunk.find((c) => c.graphicRef)?.graphicRef ?? null;
      groups.push({
        id: `q-${from}-${to}`, test: "test1", part, title: `Questions ${from}-${to}`, range: [from, to],
        hasGraphic: !!graphicData, graphicData, passage: null,
        questions: chunk.map((c) => ({
          uid: String(c.number), questionNumber: c.number, questionText: c.text, options: c.options,
          correctAnswer: c.answer, hasGraphic: !!graphicData, explanation: "",
        })),
      });
    }
  }
  return groups;
}

/* ============================================================================
   TEST 1 — Part 5, 6, 7 (data2.txt): marker "[Mã nhóm: Passage X-Y]"
   ============================================================================ */
const RE_PART_567 = /^PART\s+([567])\b/i;
const RE_MARK_567 = /^\[Mã nhóm:\s*Passage\s+(\d+)\s*[-–]\s*(\d+)\]\s*(.*)$/i;
const RE_PASSAGE_CONTENT = /^Nội dung đoạn văn:/i;
const RE_PASSAGE_REF = /^Đoạn văn tham chiếu:\s*(.*)$/i;

function parsePart567(raw) {
  const lines = raw.split(/\r?\n/);
  const groups = [];
  let part = null;
  let group = null;
  let q = null;
  let passageLines = null;
  let pendingLabel = "";

  const toQ = (item) => ({
    uid: String(item.number),
    questionNumber: item.number,
    questionText: item.text.trim() || `Chọn đáp án phù hợp cho chỗ trống (${item.number}).`,
    options: item.options, correctAnswer: item.answer, hasGraphic: false, explanation: "",
  });
  const pushQuestion = () => {
    if (!q) return;
    if (part === "PART 5") {
      groups.push({
        id: `q-${q.number}`, test: "test1", part, title: `Question ${q.number}`, range: [q.number, q.number],
        hasGraphic: false, graphicData: null, passage: null, questions: [toQ(q)],
      });
    } else if (group) group.questions.push(toQ(q));
    q = null;
  };
  const pushGroup = () => {
    pushQuestion();
    if (group && group.questions.length) groups.push(group);
    group = null; passageLines = null; pendingLabel = "";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const mPart = line.match(RE_PART_567);
    if (mPart) { pushGroup(); part = `PART ${mPart[1]}`; continue; }
    if (!part) continue;

    const mMark = line.match(RE_MARK_567);
    if (mMark) {
      pushGroup();
      const from = Number(mMark[1]), to = Number(mMark[2]);
      pendingLabel = docLabel(mMark[3]);
      group = {
        id: `q-${from}-${to}`, test: "test1", part, title: `Questions ${from}-${to}`, range: [from, to],
        hasGraphic: false, graphicData: null, passage: null, questions: [],
      };
      continue;
    }

    if (RE_PASSAGE_CONTENT.test(line)) { passageLines = []; continue; }

    const mRef = line.match(RE_PASSAGE_REF);
    if (mRef) {
      if (group) group.passage = { type: "reference", title: "Đoạn văn tham chiếu", content: [mRef[1].trim()] };
      continue;
    }

    const mQ = line.match(RE_QUESTION);
    if (mQ) {
      if (passageLines && passageLines.length && group) {
        group.passage = { type: "text", title: pendingLabel || "Đoạn văn", content: passageLines.slice() };
      }
      passageLines = null;
      pushQuestion();
      q = { number: Number(mQ[1]), text: mQ[2] || "", options: [], answer: null };
      continue;
    }

    const mO = line.match(RE_OPTION);
    if (mO && q) { q.options.push({ key: mO[1], text: mO[2].trim() }); continue; }
    const mA = line.match(RE_ANSWER);
    if (mA && q) { q.answer = mA[1]; continue; }

    if (passageLines) passageLines.push(line);
    else if (q && !q.options.length) q.text += " " + line;
  }
  pushGroup();
  return groups;
}

/* ============================================================================
   TEST 2 — practice_test2.txt (Part 3 -> 7, marker "[Mã nhóm: Listening/Talk/Passage X-Y]")
   ============================================================================ */
const RE_PART_T2 = /^PART\s+([34567])\b/i;
const RE_MARK_T2 = /^\[Mã nhóm:\s*(?:Listening|Talk|Passage)\s+(\d+)\s*[-–]\s*(\d+)\]\s*(.*)$/i;

function parseMarkerTest(raw, testId, uidPrefix) {
  const lines = raw.split(/\r?\n/);
  const groups = [];
  let part = null;
  let group = null;
  let q = null;
  let graphicLines = null; // Part 3/4: block graphic sau marker
  let passageLines = null; // Part 6: sau "Nội dung đoạn văn:"
  let pendingLabel = "";

  const toQ = (item, hasGraphic) => ({
    uid: `${uidPrefix}-${item.number}`,
    questionNumber: item.number,
    questionText: item.text.trim() || `Chọn đáp án phù hợp cho chỗ trống (${item.number}).`,
    options: item.options, correctAnswer: item.answer, hasGraphic, explanation: "",
  });
  const pushQuestion = () => {
    if (!q) return;
    if (part === "PART 5") {
      groups.push({
        id: `${uidPrefix}-q-${q.number}`, test: testId, part, title: `Question ${q.number}`, range: [q.number, q.number],
        hasGraphic: false, graphicData: null, passage: null, questions: [toQ(q, false)],
      });
    } else if (group) group.questions.push(toQ(q, group.hasGraphic));
    q = null;
  };
  const pushGroup = () => {
    pushQuestion();
    if (group && group.questions.length) groups.push(group);
    group = null; graphicLines = null; passageLines = null; pendingLabel = "";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const mPart = line.match(RE_PART_T2);
    if (mPart) { pushGroup(); part = `PART ${mPart[1]}`; continue; }
    if (!part) continue;

    const mMark = line.match(RE_MARK_T2);
    if (mMark) {
      pushGroup();
      const from = Number(mMark[1]), to = Number(mMark[2]);
      pendingLabel = docLabel(mMark[3]);
      group = {
        id: `${uidPrefix}-q-${from}-${to}`, test: testId, part, title: `Questions ${from}-${to}`, range: [from, to],
        hasGraphic: false, graphicData: null, passage: null, questions: [],
      };
      // Part 3/4: các dòng sau marker (trước câu hỏi đầu) là mô tả graphic.
      graphicLines = part === "PART 3" || part === "PART 4" ? [] : null;
      continue;
    }

    if (RE_PASSAGE_CONTENT.test(line)) { passageLines = []; graphicLines = null; continue; }

    const mRef = line.match(RE_PASSAGE_REF);
    if (mRef) {
      if (group) group.passage = { type: "reference", title: "Đoạn văn tham chiếu", content: [mRef[1].trim()] };
      graphicLines = null;
      continue;
    }

    const mQ = line.match(RE_QUESTION);
    if (mQ) {
      // Chốt block graphic / passage trước câu hỏi đầu tiên của nhóm.
      if (graphicLines && graphicLines.length && group) {
        const first = graphicLines[0];
        const title = /[:：]/.test(first) ? first.replace(/[:：]\s*$/, "") : "Graphic";
        group.graphicData = buildGraphicData(graphicLines, title);
        group.hasGraphic = true;
        // Cập nhật hasGraphic cho các câu đã push trước đó (nếu có).
        group.questions.forEach((qq) => (qq.hasGraphic = true));
      }
      graphicLines = null;
      if (passageLines && passageLines.length && group) {
        group.passage = { type: "text", title: pendingLabel || "Đoạn văn", content: passageLines.slice() };
      }
      passageLines = null;

      pushQuestion();
      q = { number: Number(mQ[1]), text: mQ[2] || "", options: [], answer: null };
      continue;
    }

    const mO = line.match(RE_OPTION);
    if (mO && q) { q.options.push({ key: mO[1], text: mO[2].trim() }); continue; }
    const mA = line.match(RE_ANSWER);
    if (mA && q) { q.answer = mA[1]; continue; }

    if (passageLines) { passageLines.push(line); continue; }
    if (graphicLines) { graphicLines.push(line); continue; }
    if (q && !q.options.length) q.text += " " + line;
  }
  pushGroup();
  return groups;
}

/* ============================================================================
   Gộp 2 đề, merge nguyên văn Part 7 & ghi file
   ============================================================================ */
const groups = [
  ...parsePart34(readFileSync(SRC_T1_34, "utf8")),
  ...parsePart567(readFileSync(SRC_T1_567, "utf8")),
  ...parseMarkerTest(readFileSync(SRC_T2, "utf8"), "test2", "t2"),
];

// Merge nguyên văn Part 7: key "147-148" (đề 1) hoặc "t2-147-148" (đề 2).
let p7Merged = 0;
try {
  const p7 = JSON.parse(readFileSync(SRC_P7, "utf8"));
  for (const g of groups) {
    if (g.part !== "PART 7") continue;
    const base = `${g.range[0]}-${g.range[1]}`;
    const key = g.test === "test2" ? `t2-${base}` : base;
    const entry = p7[key];
    if (!entry || !entry.documents) continue;
    g.passage = {
      type: "documents",
      title: entry.title || g.passage?.title || "Đoạn văn",
      content: g.passage?.content ?? [],
      documents: entry.documents,
    };
    p7Merged++;
  }
} catch {
  /* chưa có file -> bỏ qua */
}

const allQuestions = groups.flatMap((g) => g.questions);
const meta = {
  totalQuestions: allQuestions.length,
  totalGroups: groups.length,
  parts: [...new Set(groups.map((g) => g.part))],
  tests: [
    { id: "test1", label: "Đề 1" },
    { id: "test2", label: "Đề 2" },
  ],
  generatedFrom: "data.txt + data2.txt + practice_test2.txt",
};

const warnings = [];
const uidSet = new Set();
for (const g of groups) {
  for (const q of g.questions) {
    if (!q.correctAnswer) warnings.push(`[${g.test}] Câu ${q.questionNumber}: thiếu đáp án`);
    if (q.options.length < 2) warnings.push(`[${g.test}] Câu ${q.questionNumber}: chỉ có ${q.options.length} lựa chọn`);
    if (uidSet.has(q.uid)) warnings.push(`uid trùng: ${q.uid}`);
    uidSet.add(q.uid);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ meta, groups }, null, 2), "utf8");

for (const t of meta.tests) {
  const tg = groups.filter((g) => g.test === t.id);
  const perPart = meta.parts
    .map((p) => `${p.replace("PART ", "P")}:${tg.filter((g) => g.part === p).length}`)
    .join(" ");
  console.log(`  ${t.label}: ${tg.flatMap((g) => g.questions).length} câu / ${tg.length} nhóm (${perPart}) | graphic: ${tg.filter((g) => g.graphicData).length} | đoạn văn: ${tg.filter((g) => g.passage).length}`);
}
console.log(`✓ Tổng ${meta.totalQuestions} câu / ${meta.totalGroups} nhóm -> ${OUT}`);
console.log(`  Part 7 có nguyên văn: ${p7Merged}`);
if (warnings.length) console.log("⚠ Cảnh báo:\n  " + warnings.join("\n  "));
else console.log("  Không có cảnh báo dữ liệu.");
