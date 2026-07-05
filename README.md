# TOEIC Quiz App — Part 3 → 7 · 2 Practice Tests

Web app luyện TOEIC (Part 3 → 7, **2 đề practice test, 338 câu**) build bằng **Next.js 14 + TypeScript + Tailwind + Framer Motion**. Dữ liệu parse tự động từ `data.txt` + `data2.txt` (Đề 1) và `practice_test2.txt` (Đề 2); có Study/Test mode, review câu sai, bookmark, đảo nhóm/đáp án, thống kê và dark mode.

## Cài đặt & chạy

```bash
npm install      # cài dependencies
npm run dev      # chạy dev server -> http://localhost:3000
```

Build production:

```bash
npm run build
npm run start
```

## Cập nhật dữ liệu câu hỏi

Nếu chỉnh sửa `data.txt` / `data2.txt` / `practice_test2.txt` / `data/part7-passages.json`, chạy lại parser để sinh `data/questions.json`:

```bash
npm run parse
```

Parser (`scripts/parse-data.mjs`) tự nhận diện: PART, nhóm (`Questions X-Y` hoặc `[Mã nhóm: Listening/Talk/Passage X-Y]`), câu hỏi, đáp án, block **graphic** (bảng / biểu đồ / sơ đồ / menu / bảng tàu) và **đoạn văn** (Part 6 nguyên văn, Part 7 nguyên văn qua `part7-passages.json`). Số câu 2 đề trùng nhau nên mỗi câu có `uid` riêng (`"32"` đề 1, `"t2-32"` đề 2) dùng cho tiến độ/bookmark.

## Vì sao chọn Next.js (React)

Toàn bộ thư viện yêu cầu (shadcn-style UI, Framer Motion, Recharts, Lucide) đều thuộc hệ React → dùng Next.js cho khớp hệ sinh thái, ít ma sát nhất. App chạy hoàn toàn client-side, **không cần backend** — tiến độ lưu ở LocalStorage.

## Tính năng

| Nhóm | Chi tiết |
|------|----------|
| **Dashboard** | Tổng số câu, đã làm, đúng/sai, accuracy, % hoàn thành (vòng tròn tiến độ) |
| **Chế độ học** | **Study** (chọn xong hiện đúng/sai + giải thích ngay) & **Test** (làm hết rồi mới chấm) |
| **Lọc / bắt đầu nhanh** | Toàn bộ · Part 3 · Part 4 · Câu có graphic · Câu sai · Câu bookmark |
| **Theo nhóm** | Làm theo từng nhóm `Questions 32-34`, `35-37`… với thanh tiến độ riêng |
| **Search** | Tìm theo số câu hoặc từ khóa trong đề/đáp án |
| **Graphic** | Bảng → `<table>`, biểu đồ % → Recharts, sơ đồ vườn → list mô tả |
| **Review** | Danh sách câu sai + nút "Làm lại câu sai" |
| **Bookmark** | Đánh dấu câu khó, luyện riêng |
| **Animation** | Fade/slide chuyển câu, scale/glow khi chọn, tích xanh khi đúng, rung nhẹ khi sai, tổng kết kết quả |
| **Dark / Light mode** | Tự theo hệ thống + nút toggle |

## Cấu trúc thư mục

```
d:\quizz_English
├─ app/
│  ├─ layout.tsx              # root layout, providers, header
│  ├─ page.tsx                # Dashboard
│  ├─ globals.css             # design tokens (light/dark)
│  └─ quiz/[groupId]/page.tsx # trang quiz động (all|part-3|wrong|<group-id>…)
├─ components/
│  ├─ providers.tsx           # ThemeProvider + ProgressContext (localStorage)
│  ├─ dashboard.tsx           # dashboard tổng quan
│  ├─ quiz-runner.tsx         # điều phối phiên quiz (navigation, mode, submit)
│  ├─ question-card.tsx       # 1 câu hỏi: đáp án, highlight, animation, giải thích
│  ├─ graphic-card.tsx        # render bảng / biểu đồ / sơ đồ
│  ├─ result-screen.tsx       # màn tổng kết + review câu sai
│  ├─ site-header.tsx, theme-toggle.tsx, stat-tile.tsx, accuracy-ring.tsx, quick-start.tsx
│  └─ ui/                     # button, card, badge, progress (shadcn-style)
├─ data/questions.json        # SINH TỰ ĐỘNG từ data.txt
├─ lib/                       # data.ts, storage.ts, utils.ts
├─ types/index.ts             # kiểu dữ liệu dùng chung
├─ scripts/parse-data.mjs     # parser data.txt -> questions.json
└─ data.txt                   # nguồn câu hỏi gốc (không bị chỉnh sửa)
```

## Cấu trúc 1 câu hỏi (JSON)

```jsonc
{
  "questionNumber": 63,
  "questionText": "Look at the graphic. Which flight is the man catching?",
  "options": [{ "key": "A", "text": "RV326" }, ...],
  "correctAnswer": "B",
  "hasGraphic": true,
  "explanation": ""            // chưa có nguồn -> hiển thị "Chưa có giải thích"
}
```

Nhóm có graphic kèm `graphicData` (`type: "table" | "chart" | "description"`, luôn giữ `raw` là dòng gốc để không mất dữ liệu).

## Ghi chú

- File nguồn có 100 số câu (32–100) nhưng một số câu chỉ có tiêu đề nhóm; parser lấy **69 câu có đủ đề + 4 đáp án**. Chạy `npm run parse` sẽ in thống kê và cảnh báo (nếu có).
- Muốn thêm giải thích: điền field `explanation` trong `data/questions.json` (hoặc bổ sung vào `data.txt` rồi mở rộng parser).
