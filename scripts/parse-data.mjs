// @ts-check
/**
 * Parser: chuyển d:\quizz_English\data.txt (text TOEIC) -> data/questions.json
 *
 * Nguyên tắc:
 *  - Giữ nguyên dữ liệu gốc, không làm mất thông tin.
 *  - TOEIC Part 3 & 4: mỗi hội thoại/bài nói = ĐÚNG 3 câu liên tiếp.
 *    Header "Questions X-Y" trong nguồn có chỗ bị lệch (44-45, 46-49, 61-64…)
 *    nên KHÔNG dựa vào header để gom nhóm — thay vào đó gom 3 câu liên tiếp
 *    trong mỗi Part (Part 3: 32-70, Part 4: 71-100).
 *  - Graphic (bảng/biểu đồ/sơ đồ) được gắn vào nhóm chứa câu "Look at the graphic".
 *
 * Chạy: node scripts/parse-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "data.txt");
const OUT = resolve(ROOT, "data", "questions.json");
const GROUP_SIZE = 3; // TOEIC: 3 câu / hội thoại

const raw = readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/);

// ---- Regex nhận diện các loại dòng ------------------------------------------
const RE_PART = /^PART\s+(\d+)/i;
const RE_GROUP = /^Questions?\s+(\d+)\s*[-–]\s*(\d+)(.*)$/i;
const RE_QUESTION = /^(\d+)\.\s+(.*)$/;
const RE_OPTION = /^\(([A-D])\)\s*(.*)$/;
const RE_ANSWER = /^Đáp án đúng:\s*\(([A-D])\)/i;
const RE_GRAPHIC_FLAG = /Hình ảnh|Bảng biểu|graphic/i;
const RE_LOOK_GRAPHIC = /Look at the graphic/i;

// ---- Helpers cho graphic -----------------------------------------------------
/** Parse markdown table (các dòng bắt đầu bằng `|`) thành {headers, rows}. */
function parseMarkdownTable(block) {
  const rows = block
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
    );
  if (rows.length < 2) return null;
  const isSep = (r) => r.every((c) => /^:?-{3,}:?$/.test(c));
  const headers = rows[0];
  const body = rows.slice(1).filter((r) => !isSep(r));
  return { headers, rows: body };
}

/** Parse dạng "KEY | VALUE" đơn giản (bảng chuyến bay) -> {headers, rows}. */
function parsePipePairs(block) {
  const rows = block
    .filter((l) => l.includes("|"))
    .map((l) => l.split("|").map((c) => c.trim()));
  if (!rows.length) return null;
  return { headers: ["Flight", "Destination"], rows };
}

/** Parse dạng "Label: 22%" -> dữ liệu bar chart. */
function parseBarChart(block) {
  const data = [];
  for (const l of block) {
    const m = l.match(/^(.*?):\s*~?\s*(\d+)\s*%/);
    if (m) data.push({ label: m[1].trim(), value: Number(m[2]) });
  }
  return data.length ? data : null;
}

/** Phân loại block graphic -> cấu trúc render-friendly (luôn kèm `raw`). */
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

// ---- Pass 1: parse phẳng toàn bộ câu hỏi ------------------------------------
const flat = []; // { number, text, options[], answer, part, graphicRef|null }
let currentPart = "PART 3";
let currentQuestion = null;
let pendingGraphicLines = null; // đang gom block graphic
let pendingGraphic = null; // graphic đã build, chờ câu "Look at the graphic"

function pushQuestion() {
  if (currentQuestion) flat.push(currentQuestion);
  currentQuestion = null;
}

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const mPart = line.match(RE_PART);
  if (mPart) {
    pushQuestion();
    currentPart = `PART ${mPart[1]}`;
    pendingGraphicLines = null;
    continue;
  }

  const mGroup = line.match(RE_GROUP);
  if (mGroup) {
    pushQuestion();
    // Chỉ dùng header để biết CÓ graphic đi kèm hay không (không dùng để gom nhóm).
    pendingGraphicLines = RE_GRAPHIC_FLAG.test(mGroup[3] || "") ? [] : null;
    continue;
  }

  const mQ = line.match(RE_QUESTION);
  if (mQ) {
    // Kết thúc gom block graphic -> build và chờ gắn.
    if (pendingGraphicLines && pendingGraphicLines.length) {
      const firstLine = pendingGraphicLines[0];
      const title = /[:：]/.test(firstLine) ? firstLine.replace(/[:：]\s*$/, "") : "Graphic";
      pendingGraphic = buildGraphicData(pendingGraphicLines, title);
    }
    pendingGraphicLines = null;

    pushQuestion();
    const text = mQ[2].trim();
    currentQuestion = {
      number: Number(mQ[1]),
      text,
      options: [],
      answer: null,
      part: currentPart,
      graphicRef: null,
    };
    // Gắn graphic vào đúng câu "Look at the graphic".
    if (pendingGraphic && RE_LOOK_GRAPHIC.test(text)) {
      currentQuestion.graphicRef = pendingGraphic;
      pendingGraphic = null;
    }
    continue;
  }

  const mO = line.match(RE_OPTION);
  if (mO && currentQuestion) {
    currentQuestion.options.push({ key: mO[1], text: mO[2].trim() });
    continue;
  }

  const mA = line.match(RE_ANSWER);
  if (mA && currentQuestion) {
    currentQuestion.answer = mA[1];
    continue;
  }

  // Dòng còn lại: gom vào block graphic, hoặc nối vào đề (tránh mất dữ liệu).
  if (pendingGraphicLines) pendingGraphicLines.push(line);
  else if (currentQuestion && !currentQuestion.options.length)
    currentQuestion.text += " " + line;
}
pushQuestion();

// ---- Pass 2: gom 3 câu liên tiếp trong mỗi Part -----------------------------
const byPart = new Map();
for (const q of flat) {
  if (!byPart.has(q.part)) byPart.set(q.part, []);
  byPart.get(q.part).push(q);
}

const groups = [];
for (const [part, qs] of byPart) {
  qs.sort((a, b) => a.number - b.number);
  for (let i = 0; i < qs.length; i += GROUP_SIZE) {
    const chunk = qs.slice(i, i + GROUP_SIZE);
    const from = chunk[0].number;
    const to = chunk[chunk.length - 1].number;
    // Graphic của nhóm = graphic gắn ở bất kỳ câu nào trong nhóm.
    const graphicData = chunk.find((c) => c.graphicRef)?.graphicRef ?? null;
    const hasGraphic = !!graphicData;

    groups.push({
      id: `q-${from}-${to}`,
      part,
      title: `Questions ${from}-${to}`,
      range: [from, to],
      hasGraphic,
      graphicData,
      questions: chunk.map((c) => ({
        questionNumber: c.number,
        questionText: c.text,
        options: c.options,
        correctAnswer: c.answer,
        hasGraphic, // cả nhóm dùng chung graphic (audio + hình của 1 hội thoại)
        explanation: "", // chưa có giải thích trong nguồn
      })),
    });
  }
}

// ---- Thống kê & ghi file -----------------------------------------------------
const allQuestions = groups.flatMap((g) => g.questions);
const meta = {
  totalQuestions: allQuestions.length,
  totalGroups: groups.length,
  parts: [...new Set(groups.map((g) => g.part))],
  generatedFrom: "data.txt",
};

const warnings = [];
for (const g of groups) {
  if (g.questions.length !== GROUP_SIZE)
    warnings.push(`${g.title}: có ${g.questions.length} câu (khác ${GROUP_SIZE})`);
  for (const q of g.questions) {
    if (!q.correctAnswer) warnings.push(`Câu ${q.questionNumber}: thiếu đáp án`);
    if (q.options.length < 2) warnings.push(`Câu ${q.questionNumber}: chỉ có ${q.options.length} lựa chọn`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ meta, groups }, null, 2), "utf8");

console.log(`✓ Parsed ${meta.totalQuestions} câu / ${meta.totalGroups} nhóm (mỗi nhóm ${GROUP_SIZE} câu) -> ${OUT}`);
console.log(`  Parts: ${meta.parts.join(", ")}`);
console.log(`  Nhóm có graphic: ${groups.filter((g) => g.hasGraphic).map((g) => g.title).join(", ")}`);
if (warnings.length) console.log("⚠ Cảnh báo:\n  " + warnings.join("\n  "));
else console.log("  Không có cảnh báo dữ liệu.");
