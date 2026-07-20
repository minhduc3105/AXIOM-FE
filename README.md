# AXIOM FE

Frontend prototype triển khai từ các screen ở Page 1 của file [AXIOM trên Figma](https://www.figma.com/design/nNbY7RhnQZgXU1tpkWNVzi/AXIOM?node-id=84-12).

## Chạy local

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

## Luồng smoke được mô phỏng

- Chat: Welcome → submit câu hỏi → Intent & Spec → Approve → Planner & Code → Continue to execute → Execute & Validate → Result & Evidence.
- Ở mỗi overview card, bấm `Review` hoặc bấm trực tiếp một stage trên pipeline rail để mở detail inspector bên phải theo đúng cặp frame 04/06/08/10 của Figma. Nút `×` đóng inspector và quay về overview.
- Data ingestion: Choose source → Browse connectors → chọn MySQL → điền form → Test connection → Save connection → Upload files → Start ingestion → Indexed.
- Detail inspector của chatbot là một right-edge dock: khi mở sẽ neo vào cạnh phải viewport, đồng thời phần chat tự co lại để không tạo scroll ngang.
- Responsive layout hỗ trợ desktop và tablet/iPad; sidebar thu gọn thành rail ở viewport hẹp, ingestion chuyển từ grid sang stack và form/catalog tự thay đổi cột.
- Các API trong `src/api/smokeApi.ts` là mock async, có delay để mô phỏng network/pipeline. Có thể thay bằng `fetch` hoặc SDK thật mà không cần đổi UI contract.

## Cấu trúc thư mục

```text
AXIOM-FE/
├─ index.html
├─ package.json
├─ tsconfig*.json
├─ vite.config.ts
├─ README.md
└─ src/
   ├─ main.tsx                 # React entry point
   ├─ App.tsx                  # routing state giữa Chat/Ingestion
   ├─ styles.css               # design tokens và layout CSS
   ├─ assets.ts                # asset URLs lấy từ Figma context
   ├─ types.ts                 # state/domain types
   ├─ api/
   │  └─ smokeApi.ts           # mock async API cho demo flow
   └─ components/
      ├─ AppHeader.tsx
      ├─ Brand.tsx
      ├─ ChatComposer.tsx
      ├─ ChatWorkspace.tsx
      ├─ DecisionPanel.tsx
      ├─ DetailInspector.tsx      # detail panel theo từng chat stage
      ├─ Icon.tsx
      ├─ IngestionProgress.tsx
      ├─ IngestionWorkspace.tsx
      ├─ PipelineRail.tsx
      ├─ ReviewCard.tsx
      ├─ Sidebar.tsx
      └─ UserMessage.tsx
```

## Ghi chú asset

Các icon/avatar đang trỏ tới asset export của Figma để giữ đúng hình dạng prototype. URL asset của Figma có thời hạn; khi chuẩn bị production nên download các asset này vào `public/assets` hoặc thay bằng CDN nội bộ.
