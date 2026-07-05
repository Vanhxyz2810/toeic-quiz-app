/** Kiểu dữ liệu dùng chung cho toàn app quiz. */

export type AnswerKey = "A" | "B" | "C" | "D";

export interface Option {
  /** Đáp án GỐC (A/B/C/D theo nguồn) — dùng để chấm điểm & lưu tiến độ. */
  key: AnswerKey;
  text: string;
  /** Nhãn HIỂN THỊ sau khi đảo đáp án (A/B/C/D theo vị trí mới). Chỉ để render. */
  displayKey?: AnswerKey;
}

/** Bảng graphic (flight info, clinic schedule, train departures...). */
export interface GraphicTable {
  headers: string[];
  rows: string[][];
}

/** Một cột trong biểu đồ (percentage increase in sales...). */
export interface GraphicChartItem {
  label: string;
  value: number;
}

export type GraphicType = "table" | "chart" | "description";

export interface GraphicData {
  type: GraphicType;
  title: string;
  table?: GraphicTable;
  chart?: GraphicChartItem[];
  /** Mảng dòng gốc, luôn có để không mất dữ liệu nguồn. */
  raw: string[];
}

/** Một tài liệu trong đoạn văn Part 7 (đề có thể ghép nhiều tài liệu). */
export interface PassageDoc {
  format: "chat" | "email" | "plain";
  label?: string; // nhãn loại: E-mail, Online Chat, Advertisement…
  header?: { label: string; value: string }[]; // email/meta (To, From, Subject…)
  paragraphs?: string[]; // nội dung dạng đoạn (email body / plain)
  entries?: { speaker: string; time?: string; text: string }[]; // hội thoại chat
}

/**
 * Đoạn văn cho Part 6 (text: nội dung đầy đủ, chứa chỗ trống (131)…),
 * Part 7 (reference: mô tả tham chiếu, hoặc documents: nguyên văn đầy đủ).
 */
export interface Passage {
  type: "text" | "reference" | "documents";
  title?: string; // nhãn loại tài liệu: FAX, MEMO… hoặc "Đoạn văn tham chiếu"
  content: string[]; // nội dung/ tham chiếu (fallback)
  documents?: PassageDoc[]; // nguyên văn Part 7 khi đã có
}

export interface Question {
  /**
   * Khóa duy nhất toàn cục (số câu trùng nhau giữa các đề):
   * đề 1 = "32" (tương thích tiến độ cũ), đề 2 = "t2-32".
   */
  uid: string;
  questionNumber: number;
  questionText: string;
  options: Option[];
  correctAnswer: AnswerKey;
  hasGraphic: boolean;
  explanation: string;
}

export interface QuestionGroup {
  id: string;
  /** Đề practice test: "test1" | "test2". */
  test: string;
  part: string;
  title: string;
  range: [number, number];
  hasGraphic: boolean;
  graphicData: GraphicData | null;
  passage: Passage | null;
  questions: Question[];
}

export interface QuizMeta {
  totalQuestions: number;
  totalGroups: number;
  parts: string[];
  generatedFrom: string;
}

export interface QuizData {
  meta: QuizMeta;
  groups: QuestionGroup[];
}

/** Câu hỏi đã được gắn thêm ngữ cảnh nhóm để render độc lập. */
export interface EnrichedQuestion extends Question {
  groupId: string;
  groupTitle: string;
  test: string;
  part: string;
  graphicData: GraphicData | null;
  passage: Passage | null;
}

/**
 * Một "khối" khi làm bài = 1 hội thoại/bài nói (3 câu liên quan nhau).
 * Đảo nhóm = đảo thứ tự các block; 3 câu trong block luôn dính nhau.
 */
export interface QuizBlock {
  key: string; // = groupId
  title: string;
  part: string;
  graphicData: GraphicData | null;
  passage: Passage | null;
  questions: EnrichedQuestion[];
}

/** Tùy chọn xáo trộn khi bắt đầu một phiên quiz. */
export interface ShuffleOptions {
  groups: boolean; // đảo thứ tự các hội thoại
  options: boolean; // đảo A/B/C/D trong mỗi câu
}

/** Tiến độ lưu trong localStorage — key theo uid câu hỏi. */
export interface Progress {
  /** answers[uid] = đáp án user đã chọn (đã "check"). */
  answers: Record<string, AnswerKey>;
  /** Danh sách uid câu được bookmark. */
  bookmarks: string[];
}

export type QuizMode = "study" | "test";

/**
 * Khóa xác định tập câu hỏi cho một phiên quiz.
 * Tiền tố "t2-" chọn Đề 2 (vd "t2-all", "t2-part-5", "t2-range-101-110",
 * group id đề 2 vốn đã có tiền tố: "t2-q-32-34").
 * "wrong" / "bookmarked" áp dụng chung cả 2 đề.
 */
export type QuizSetKey =
  | string // group id, vd "q-32-34" | "t2-q-32-34"
  | "all"
  | "part-3"
  | "part-4"
  | "wrong"
  | "bookmarked"
  | "graphic";
