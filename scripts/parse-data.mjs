// @ts-check
/**
 * Parser: chuyển d:\quizz_English\data.txt (text TOEIC) -> data/questions.json
 *
 * Nguyên tắc:
 *  - Giữ nguyên dữ liệu gốc, không làm mất thông tin.
 *  - Tự nhận diện block graphic (bảng / biểu đồ / bản đồ) nằm giữa header nhóm
 *    và câu hỏi đầu tiên -> lưu vào graphicData (kèm parse table/chart nếu được).
 *  - Format không đồng nhất thì xử lý linh hoạt thay vì ném lỗi.
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

const raw = readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/);

// ---- Regex nhận diện các loại dòng ------------------------------------------
const RE_PART = /^PART\s+(\d+)/i;
const RE_GROUP = /^Questions?\s+(\d+)\s*[-–]\s*(\d+)(.*)$/i;
const RE_QUESTION = /^(\d+)\.\s+(.*)$/;
const RE_OPTION = /^\(([A-D])\)\s*(.*)$/;
const RE_ANSWER = /^Đáp án đúng:\s*\(([A-D])\)/i;
const RE_GRAPHIC_FLAG = /Hình ảnh|Bảng biểu|graphic/i;

// ---- Helpers cho graphic -----------------------------------------------------
/** Parse markdown table (các dòng bắt đầu bằng `|`) thành {headers, rows}. */
function parseMarkdownTable(block) {
  const rows = block
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
    );
  if (rows.length < 2) return null;
  // Bỏ dòng separator dạng | :--- | :--- |
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

/**
 * Phân loại block graphic và trả về cấu trúc render-friendly.
 * Luôn kèm `raw` (mảng dòng gốc) để không mất dữ liệu.
 */
function buildGraphicData(block, title) {
  const text = block.join("\n");
  const raw = block.slice();

  // 1) Markdown table
  if (block.some((l) => l.trim().startsWith("|"))) {
    const table = parseMarkdownTable(block);
    if (table) return { type: "table", title, table, raw };
  }
  // 2) Bar chart (có % )
  const chart = parseBarChart(block);
  if (chart) return { type: "chart", title, chart, raw };
  // 3) Pipe pairs (CODE | DEST) không có header markdown
  if (block.some((l) => /\S\s*\|\s*\S/.test(l))) {
    const table = parsePipePairs(block);
    if (table) return { type: "table", title, table, raw };
  }
  // 4) Mô tả bản đồ / sơ đồ -> render dạng list mô tả
  return { type: "description", title, raw };
}

// ---- Máy trạng thái duyệt file ----------------------------------------------
const groups = [];
let currentPart = "PART 3";
let currentGroup = null;
let currentQuestion = null;
let pendingGraphicLines = null; // đang thu thập block graphic của nhóm

function flushQuestion() {
  if (currentQuestion && currentGroup) currentGroup.questions.push(currentQuestion);
  currentQuestion = null;
}
function flushGroup() {
  flushQuestion();
  if (currentGroup && currentGroup.questions.length) groups.push(currentGroup);
  currentGroup = null;
}

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  // PART marker
  const mPart = line.match(RE_PART);
  if (mPart) {
    flushGroup();
    currentPart = `PART ${mPart[1]}`;
    continue;
  }

  // Group header
  const mGroup = line.match(RE_GROUP);
  if (mGroup) {
    flushGroup();
    const from = Number(mGroup[1]);
    const to = Number(mGroup[2]);
    const tail = (mGroup[3] || "").trim();
    const hasGraphic = RE_GRAPHIC_FLAG.test(tail);
    currentGroup = {
      id: `q-${from}-${to}`,
      part: currentPart,
      title: `Questions ${from}-${to}`,
      range: [from, to],
      hasGraphic,
      graphicData: null,
      questions: [],
    };
    pendingGraphicLines = hasGraphic ? [] : null;
    continue;
  }

  // Question line
  const mQ = line.match(RE_QUESTION);
  if (mQ && currentGroup) {
    // Kết thúc thu thập graphic khi gặp câu hỏi đầu tiên
    if (pendingGraphicLines && pendingGraphicLines.length) {
      const firstLine = pendingGraphicLines[0];
      const title = /[:：]/.test(firstLine) ? firstLine.replace(/[:：]\s*$/, "") : "Graphic";
      currentGroup.graphicData = buildGraphicData(pendingGraphicLines, title);
    }
    pendingGraphicLines = null;

    flushQuestion();
    currentQuestion = {
      questionNumber: Number(mQ[1]),
      questionText: mQ[2].trim(),
      options: [],
      correctAnswer: null,
      hasGraphic: /Look at the graphic/i.test(mQ[2]) || currentGroup.hasGraphic,
      explanation: "", // chưa có giải thích trong nguồn -> để rỗng
    };
    continue;
  }

  // Option line
  const mO = line.match(RE_OPTION);
  if (mO && currentQuestion) {
    currentQuestion.options.push({ key: mO[1], text: mO[2].trim() });
    continue;
  }

  // Answer line
  const mA = line.match(RE_ANSWER);
  if (mA && currentQuestion) {
    currentQuestion.correctAnswer = mA[1];
    continue;
  }

  // Còn lại: nếu đang chờ graphic -> gom vào block graphic
  if (pendingGraphicLines) {
    pendingGraphicLines.push(line);
    continue;
  }
  // Ngược lại: dòng lạ -> nối vào questionText để không mất dữ liệu
  if (currentQuestion && !currentQuestion.options.length) {
    currentQuestion.questionText += " " + line;
  }
}
flushGroup();

// ---- Thống kê & ghi file -----------------------------------------------------
const allQuestions = groups.flatMap((g) => g.questions);
const meta = {
  totalQuestions: allQuestions.length,
  totalGroups: groups.length,
  parts: [...new Set(groups.map((g) => g.part))],
  generatedFrom: "data.txt",
};

// Cảnh báo mềm cho dữ liệu thiếu (không throw)
const warnings = [];
for (const g of groups) {
  for (const q of g.questions) {
    if (!q.correctAnswer) warnings.push(`Câu ${q.questionNumber}: thiếu đáp án`);
    if (q.options.length < 2) warnings.push(`Câu ${q.questionNumber}: chỉ có ${q.options.length} lựa chọn`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ meta, groups }, null, 2), "utf8");

console.log(`✓ Parsed ${meta.totalQuestions} câu / ${meta.totalGroups} nhóm -> ${OUT}`);
console.log(`  Parts: ${meta.parts.join(", ")}`);
console.log(`  Nhóm có graphic: ${groups.filter((g) => g.hasGraphic).length}`);
if (warnings.length) console.log("⚠ Cảnh báo:\n  " + warnings.join("\n  "));
else console.log("  Không có cảnh báo dữ liệu.");
