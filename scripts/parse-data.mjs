// @ts-check
/**
 * Parser: gộp data.txt (Part 3 & 4) + data2.txt (Part 5, 6, 7) -> data/questions.json
 *
 * Nguyên tắc chung:
 *  - Giữ nguyên dữ liệu gốc, không làm mất thông tin.
 *  - Xử lý linh hoạt khi format không đồng nhất, không ném lỗi.
 *
 * Cấu trúc nhóm theo từng Part:
 *  - Part 3 & 4 (Listening): mỗi hội thoại = 3 câu liên tiếp; có thể kèm graphic.
 *  - Part 5 (Incomplete Sentences): mỗi câu là 1 nhóm độc lập.
 *  - Part 6 (Text Completion): 1 đoạn văn + 4 câu điền chỗ trống.
 *  - Part 7 (Reading): 1 đoạn văn (mô tả tham chiếu) + 2..5 câu, đánh dấu
 *    bằng "[Mã nhóm: Passage X-Y]".
 *
 * Chạy: node scripts/parse-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_34 = resolve(ROOT, "data.txt");
const SRC_567 = resolve(ROOT, "data2.txt");
const OUT = resolve(ROOT, "data", "questions.json");
const GROUP_SIZE_34 = 3;

// ---- Regex dùng chung --------------------------------------------------------
const RE_QUESTION = /^(\d+)\.\s*(.*)$/;
const RE_OPTION = /^\(([A-D])\)\s*(.*)$/;
const RE_ANSWER = /^Đáp án đúng:\s*\(([A-D])\)/i;

/* ============================================================================
   PHẦN 1 — Part 3 & 4 (data.txt): gom 3 câu/hội thoại, kèm graphic
   ============================================================================ */
const RE_PART_34 = /^PART\s+([34])/i;
const RE_GROUP_34 = /^Questions?\s+(\d+)\s*[-–]\s*(\d+)(.*)$/i;
const RE_GRAPHIC_FLAG = /Hình ảnh|Bảng biểu|graphic/i;
const RE_LOOK_GRAPHIC = /Look at the graphic/i;

function parseMarkdownTable(block) {
  const rows = block
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
  if (rows.length < 2) return null;
  const isSep = (r) => r.every((c) => /^:?-{3,}:?$/.test(c));
  return { headers: rows[0], rows: rows.slice(1).filter((r) => !isSep(r)) };
}
function parsePipePairs(block) {
  const rows = block.filter((l) => l.includes("|")).map((l) => l.split("|").map((c) => c.trim()));
  return rows.length ? { headers: ["Flight", "Destination"], rows } : null;
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
    const table = parsePipePairs(block);
    if (table) return { type: "table", title, table, raw };
  }
  return { type: "description", title, raw };
}

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

  // Gom 3 câu liên tiếp trong mỗi Part.
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
        id: `q-${from}-${to}`, part, title: `Questions ${from}-${to}`, range: [from, to],
        hasGraphic: !!graphicData, graphicData, passage: null,
        questions: chunk.map((c) => ({
          questionNumber: c.number, questionText: c.text, options: c.options,
          correctAnswer: c.answer, hasGraphic: !!graphicData, explanation: "",
        })),
      });
    }
  }
  return groups;
}

/* ============================================================================
   PHẦN 2 — Part 5, 6, 7 (data2.txt): câu độc lập / đoạn văn + câu hỏi
   ============================================================================ */
const RE_PART_567 = /^PART\s+([567])\b/i;
const RE_MARK = /^\[Mã nhóm:\s*Passage\s+(\d+)\s*[-–]\s*(\d+)\]\s*(.*)$/i;
const RE_PASSAGE_CONTENT = /^Nội dung đoạn văn:/i;
const RE_PASSAGE_REF = /^Đoạn văn tham chiếu:\s*(.*)$/i;

/** Nhãn loại tài liệu từ tail marker, vd "(Đoạn văn 1 - FAX)" -> "FAX". */
function docLabel(tail) {
  const t = (tail || "").replace(/^\(|\)$/g, "").trim();
  if (t.includes("-")) return t.split("-").pop().trim();
  return t;
}

function parsePart567(raw) {
  const lines = raw.split(/\r?\n/);
  const groups = [];
  let part = null;
  let group = null; // nhóm Part 6/7 hiện tại
  let q = null;
  let passageLines = null; // đang gom "Nội dung đoạn văn"
  let pendingLabel = ""; // nhãn tài liệu của nhóm hiện tại

  const toQ = (item) => {
    const text = item.text.trim() || `Chọn đáp án phù hợp cho chỗ trống (${item.number}).`;
    return {
      questionNumber: item.number, questionText: text, options: item.options,
      correctAnswer: item.answer, hasGraphic: false, explanation: "",
    };
  };
  const pushQuestion = () => {
    if (!q) return;
    if (part === "PART 5") {
      groups.push({
        id: `q-${q.number}`, part, title: `Question ${q.number}`, range: [q.number, q.number],
        hasGraphic: false, graphicData: null, passage: null, questions: [toQ(q)],
      });
    } else if (group) {
      group.questions.push(toQ(q));
    }
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
    if (!part) continue; // bỏ qua phần mô tả đầu file

    const mMark = line.match(RE_MARK);
    if (mMark) {
      pushGroup();
      const from = Number(mMark[1]), to = Number(mMark[2]);
      pendingLabel = docLabel(mMark[3]);
      group = {
        id: `q-${from}-${to}`, part, title: `Questions ${from}-${to}`, range: [from, to],
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
      // Chốt đoạn văn (nếu đang gom) trước câu hỏi đầu tiên.
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

    // Còn lại: gom vào đoạn văn nếu đang mở; nếu không, nối vào đề (đề Part 7 dài).
    if (passageLines) passageLines.push(line);
    else if (q && !q.options.length) q.text += " " + line;
  }
  pushGroup();
  return groups;
}

/* ============================================================================
   Gộp & ghi file
   ============================================================================ */
const groups = [...parsePart34(readFileSync(SRC_34, "utf8")), ...parsePart567(readFileSync(SRC_567, "utf8"))];

const allQuestions = groups.flatMap((g) => g.questions);
const meta = {
  totalQuestions: allQuestions.length,
  totalGroups: groups.length,
  parts: [...new Set(groups.map((g) => g.part))],
  generatedFrom: "data.txt + data2.txt",
};

const warnings = [];
for (const g of groups) {
  for (const q of g.questions) {
    if (!q.correctAnswer) warnings.push(`Câu ${q.questionNumber}: thiếu đáp án`);
    if (q.options.length < 2) warnings.push(`Câu ${q.questionNumber}: chỉ có ${q.options.length} lựa chọn`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ meta, groups }, null, 2), "utf8");

const perPart = meta.parts.map((p) => `${p}: ${groups.filter((g) => g.part === p).length} nhóm`).join(" | ");
console.log(`✓ Parsed ${meta.totalQuestions} câu / ${meta.totalGroups} nhóm -> ${OUT}`);
console.log(`  ${perPart}`);
console.log(`  Có graphic: ${groups.filter((g) => g.graphicData).length} | Có đoạn văn: ${groups.filter((g) => g.passage).length}`);
if (warnings.length) console.log("⚠ Cảnh báo:\n  " + warnings.join("\n  "));
else console.log("  Không có cảnh báo dữ liệu.");
