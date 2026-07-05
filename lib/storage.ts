import type { Progress } from "@/types";

const KEY = "toeic-quiz-progress-v1";

const empty: Progress = { answers: {}, bookmarks: [] };

/** Đọc tiến độ từ localStorage (an toàn khi SSR / dữ liệu hỏng). */
export function loadProgress(): Progress {
  if (typeof window === "undefined") return { ...empty };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...empty };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      answers: parsed.answers ?? {},
      // Tiến độ cũ lưu bookmark dạng số -> chuẩn hóa về uid string.
      bookmarks: (parsed.bookmarks ?? []).map(String),
    };
  } catch {
    return { ...empty };
  }
}

/** Ghi tiến độ xuống localStorage. */
export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua lỗi quota / private mode */
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
