import rawData from "@/data/questions.json";
import type {
  EnrichedQuestion,
  Progress,
  QuestionGroup,
  QuizBlock,
  QuizData,
  QuizSetKey,
} from "@/types";

// questions.json được sinh từ data.txt + data2.txt + practice_test2.txt
// bởi scripts/parse-data.mjs
const data = rawData as unknown as QuizData;

export const quizMeta = data.meta;
export const groups: QuestionGroup[] = data.groups;

/** Danh sách đề: [{id: "test1", label: "Đề 1"}, ...]. */
export const tests: { id: string; label: string }[] =
  (quizMeta as { tests?: { id: string; label: string }[] }).tests ?? [
    { id: "test1", label: "Đề 1" },
  ];

/** Tất cả câu hỏi, gắn kèm ngữ cảnh nhóm (test, part, title, graphic, passage). */
export const allQuestions: EnrichedQuestion[] = groups.flatMap((g) =>
  g.questions.map((q) => ({
    ...q,
    groupId: g.id,
    groupTitle: g.title,
    test: g.test,
    part: g.part,
    graphicData: g.graphicData,
    passage: g.passage,
  }))
);

export function getGroup(id: string): QuestionGroup | undefined {
  return groups.find((g) => g.id === id);
}

export const parts: string[] = quizMeta.parts;

/**
 * Tách tiền tố đề khỏi set key: "t2-part-5" -> {test: "test2", rest: "part-5"}.
 * Không có tiền tố -> mặc định đề 1 (tương thích link cũ).
 */
function splitTestKey(key: string): { test: string; rest: string } {
  if (key.startsWith("t2-")) return { test: "test2", rest: key.slice(3) };
  return { test: "test1", rest: key };
}

/**
 * Giải một QuizSetKey thành danh sách câu hỏi thực tế.
 * Các key phụ thuộc tiến độ (wrong/bookmarked) cần truyền `progress`
 * và áp dụng chung cả 2 đề.
 */
export function resolveQuestionSet(
  key: QuizSetKey,
  progress?: Progress
): EnrichedQuestion[] {
  // wrong / bookmarked: toàn cục, không theo đề.
  if (key === "wrong") {
    if (!progress) return [];
    return allQuestions.filter((q) => {
      const a = progress.answers[q.uid];
      return a && a !== q.correctAnswer;
    });
  }
  if (key === "bookmarked") {
    if (!progress) return [];
    return allQuestions.filter((q) => progress.bookmarks.includes(q.uid));
  }

  const { test, rest } = splitTestKey(key);
  const inTest = allQuestions.filter((q) => q.test === test);

  switch (rest) {
    case "all":
      return inTest;
    case "part-3":
    case "part-4":
    case "part-5":
    case "part-6":
    case "part-7":
      return inTest.filter((q) => q.part === `PART ${rest.split("-")[1]}`);
    case "graphic":
      return inTest.filter((q) => q.hasGraphic || q.graphicData);
    case "reading":
      return inTest.filter((q) => q.passage);
    default:
      // range-<from>-<to>: lọc theo dải số câu trong đề (Part 5 chia khối).
      if (rest.startsWith("range-")) {
        const [, a, b] = rest.split("-");
        const from = Number(a), to = Number(b);
        return inTest.filter((q) => q.questionNumber >= from && q.questionNumber <= to);
      }
      // group id (đề 2 đã có sẵn tiền tố t2- trong id -> so với key gốc).
      return allQuestions.filter((q) => q.groupId === key);
  }
}

/**
 * Gom danh sách câu (phẳng) thành các block theo hội thoại/đoạn văn (groupId),
 * giữ nguyên thứ tự xuất hiện. Các câu của một nhóm luôn nằm chung block.
 */
export function groupIntoBlocks(questions: EnrichedQuestion[]): QuizBlock[] {
  const map = new Map<string, QuizBlock>();
  for (const q of questions) {
    if (!map.has(q.groupId)) {
      map.set(q.groupId, {
        key: q.groupId,
        title: q.groupTitle,
        part: q.part,
        graphicData: q.graphicData,
        passage: q.passage,
        questions: [],
      });
    }
    map.get(q.groupId)!.questions.push(q);
  }
  return [...map.values()];
}

/** Giải một QuizSetKey trực tiếp thành các block (dùng cho màn làm bài). */
export function resolveQuizBlocks(key: QuizSetKey, progress?: Progress): QuizBlock[] {
  return groupIntoBlocks(resolveQuestionSet(key, progress));
}

/** Nhãn hiển thị cho một QuizSetKey. */
export function setLabel(key: QuizSetKey): string {
  if (key === "wrong") return "Ôn lại câu sai";
  if (key === "bookmarked") return "Câu đã đánh dấu";

  const { test, rest } = splitTestKey(key);
  const suffix = test === "test2" ? " · Đề 2" : "";

  const base = (() => {
    switch (rest) {
      case "all":
        return "Toàn bộ đề";
      case "part-3":
        return "Part 3 — Conversations";
      case "part-4":
        return "Part 4 — Talks";
      case "part-5":
        return "Part 5 — Incomplete Sentences";
      case "part-6":
        return "Part 6 — Text Completion";
      case "part-7":
        return "Part 7 — Reading";
      case "graphic":
        return "Câu có bảng / biểu đồ";
      case "reading":
        return "Câu có đoạn văn";
      default: {
        if (rest.startsWith("range-")) {
          const [, a, b] = rest.split("-");
          return `Câu ${a}-${b}`;
        }
        return getGroup(key)?.title ?? "Quiz";
      }
    }
  })();

  return base + suffix;
}
