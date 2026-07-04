import rawData from "@/data/questions.json";
import type {
  EnrichedQuestion,
  Progress,
  QuestionGroup,
  QuizData,
  QuizSetKey,
} from "@/types";

// questions.json được sinh từ data.txt bởi scripts/parse-data.mjs
const data = rawData as unknown as QuizData;

export const quizMeta = data.meta;
export const groups: QuestionGroup[] = data.groups;

/** Tất cả câu hỏi, gắn kèm ngữ cảnh nhóm (part, title, graphic). */
export const allQuestions: EnrichedQuestion[] = groups.flatMap((g) =>
  g.questions.map((q) => ({
    ...q,
    groupId: g.id,
    groupTitle: g.title,
    part: g.part,
    graphicData: g.graphicData,
  }))
);

export function getGroup(id: string): QuestionGroup | undefined {
  return groups.find((g) => g.id === id);
}

export const parts: string[] = quizMeta.parts;

/** Số câu theo từng part (cho dashboard). */
export function countByPart(part: string): number {
  return allQuestions.filter((q) => q.part === part).length;
}

/**
 * Giải một QuizSetKey thành danh sách câu hỏi thực tế.
 * Các key phụ thuộc tiến độ (wrong/bookmarked) cần truyền `progress`.
 */
export function resolveQuestionSet(
  key: QuizSetKey,
  progress?: Progress
): EnrichedQuestion[] {
  switch (key) {
    case "all":
      return allQuestions;
    case "part-3":
      return allQuestions.filter((q) => q.part === "PART 3");
    case "part-4":
      return allQuestions.filter((q) => q.part === "PART 4");
    case "graphic":
      return allQuestions.filter((q) => q.hasGraphic || q.graphicData);
    case "wrong":
      if (!progress) return [];
      return allQuestions.filter((q) => {
        const a = progress.answers[q.questionNumber];
        return a && a !== q.correctAnswer;
      });
    case "bookmarked":
      if (!progress) return [];
      return allQuestions.filter((q) =>
        progress.bookmarks.includes(q.questionNumber)
      );
    default:
      // group id
      return allQuestions.filter((q) => q.groupId === key);
  }
}

/** Nhãn hiển thị cho một QuizSetKey. */
export function setLabel(key: QuizSetKey): string {
  switch (key) {
    case "all":
      return "Toàn bộ 100 câu";
    case "part-3":
      return "Part 3 — Conversations";
    case "part-4":
      return "Part 4 — Talks";
    case "graphic":
      return "Câu có bảng / biểu đồ";
    case "wrong":
      return "Ôn lại câu sai";
    case "bookmarked":
      return "Câu đã đánh dấu";
    default:
      return getGroup(key)?.title ?? "Quiz";
  }
}
