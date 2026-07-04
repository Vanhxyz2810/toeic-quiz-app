/** Kiểu dữ liệu dùng chung cho toàn app quiz. */

export type AnswerKey = "A" | "B" | "C" | "D";

export interface Option {
  key: AnswerKey;
  text: string;
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

export interface Question {
  questionNumber: number;
  questionText: string;
  options: Option[];
  correctAnswer: AnswerKey;
  hasGraphic: boolean;
  explanation: string;
}

export interface QuestionGroup {
  id: string;
  part: string;
  title: string;
  range: [number, number];
  hasGraphic: boolean;
  graphicData: GraphicData | null;
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
  part: string;
  graphicData: GraphicData | null;
}

/** Tiến độ lưu trong localStorage. */
export interface Progress {
  /** answers[questionNumber] = đáp án user đã chọn (đã "check"). */
  answers: Record<number, AnswerKey>;
  /** Danh sách số câu được bookmark. */
  bookmarks: number[];
}

export type QuizMode = "study" | "test";

/** Khóa xác định tập câu hỏi cho một phiên quiz. */
export type QuizSetKey =
  | string // group id, vd "q-32-34"
  | "all"
  | "part-3"
  | "part-4"
  | "wrong"
  | "bookmarked"
  | "graphic";
