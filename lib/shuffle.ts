import type { AnswerKey, EnrichedQuestion, QuizBlock, ShuffleOptions } from "@/types";

const LETTERS: AnswerKey[] = ["A", "B", "C", "D"];

/** Fisher–Yates: trả về mảng mới đã xáo trộn (không đụng mảng gốc). */
export function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Đảo A/B/C/D của một câu.
 * - `key` (đáp án gốc) được GIỮ NGUYÊN theo từng lựa chọn -> chấm điểm/lưu tiến độ
 *   vẫn chính xác dù đã đảo.
 * - `displayKey` là nhãn A/B/C/D mới theo vị trí -> chỉ dùng để hiển thị.
 */
export function shuffleQuestionOptions(q: EnrichedQuestion): EnrichedQuestion {
  const options = shuffleArray(q.options).map((o, i) => ({
    ...o,
    displayKey: LETTERS[i],
  }));
  return { ...q, options };
}

/**
 * Áp dụng tùy chọn xáo trộn lên danh sách block.
 * - options: đảo đáp án trong TỪNG câu.
 * - groups: đảo thứ tự các block (3 câu trong 1 block vẫn dính nhau, đúng thứ tự).
 */
export function applyShuffles(blocks: QuizBlock[], opt: ShuffleOptions): QuizBlock[] {
  let result = blocks.map((b) => ({
    ...b,
    questions: opt.options ? b.questions.map(shuffleQuestionOptions) : b.questions,
  }));
  if (opt.groups) result = shuffleArray(result);
  return result;
}
