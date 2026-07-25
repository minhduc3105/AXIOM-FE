import type { Report } from "./types";

export const mockReports: Report[] = [
  {
    id: "report-data-quality-q3",
    title: "Q3 Data Quality Drift Analysis",
    excerpt:
      "Phân tích xu hướng thiếu dữ liệu, độ lệch schema và tác động đến pipeline truy vấn khách hàng.",
    createdAt: "2026-07-18",
    author: "Linh Tran",
    source: "Data Intelligence",
    tags: ["Data quality", "Pipeline", "Q3"],
    category: "Báo cáo phân tích dữ liệu",
    thumbnailTone: "blue",
    detail: {
      headline:
        "Data quality được cải thiện ở nhóm CRM, nhưng log vận hành vẫn có drift theo batch cuối ngày.",
      body: [
        "Bộ dữ liệu CRM giảm tỷ lệ missing field từ 8.4% xuống 3.1% sau khi bổ sung rule kiểm tra ở ingestion layer. Các nguồn log hệ thống vẫn có spike vào khung 22:00-23:30 do batch retry sinh payload thiếu trace_id.",
        "Khuyến nghị ưu tiên chuẩn hóa contract cho các event có tần suất cao, đồng thời thêm cảnh báo khi volume bản ghi hợp lệ giảm quá 12% so với rolling baseline 7 ngày.",
      ],
      metrics: [
        { label: "Missing fields", value: "3.1%", change: "-5.3%", tone: "positive" },
        { label: "Schema drift", value: "11", change: "+4", tone: "warning" },
        { label: "Validated rows", value: "4.8M", change: "+18%", tone: "neutral" },
      ],
      chart: [
        { label: "Mon", value: 42 },
        { label: "Tue", value: 58 },
        { label: "Wed", value: 47 },
        { label: "Thu", value: 73 },
        { label: "Fri", value: 66 },
      ],
      table: [
        {
          dimension: "CRM customers",
          finding: "Email normalization stable after patch",
          owner: "Data Platform",
          status: "Ready",
        },
        {
          dimension: "System logs",
          finding: "trace_id missing in retry batch",
          owner: "Observability",
          status: "Review",
        },
        {
          dimension: "Billing export",
          finding: "Currency field has mixed casing",
          owner: "Finance Ops",
          status: "Queued",
        },
      ],
    },
  },
  {
    id: "report-operations-weekly",
    title: "Weekly Operations Control Report",
    excerpt:
      "Tổng hợp SLA, khối lượng ticket và các điểm nghẽn vận hành trong tuần gần nhất.",
    createdAt: "2026-07-20",
    author: "Minh Pham",
    source: "Operations Desk",
    tags: ["Operations", "SLA", "Weekly"],
    category: "Báo cáo vận hành",
    thumbnailTone: "green",
    detail: {
      headline:
        "SLA giữ ở mức tốt, nhưng nhóm escalation cần giảm thời gian chờ phê duyệt sau bước phân loại.",
      body: [
        "Tổng volume ticket tăng 9% so với tuần trước, chủ yếu đến từ nhóm data access và connector health. Phần lớn ticket được xử lý trong khung SLA, ngoại trừ các case cần xác nhận quyền truy cập từ owner nguồn dữ liệu.",
        "Đề xuất thêm mẫu phản hồi chuẩn cho nhóm data owner và mở dashboard theo dõi riêng cho các ticket bị giữ quá 6 giờ ở trạng thái pending approval.",
      ],
      metrics: [
        { label: "SLA met", value: "94.6%", change: "+2.1%", tone: "positive" },
        { label: "Open tickets", value: "128", change: "+9%", tone: "warning" },
        { label: "Median resolve", value: "3.4h", change: "-0.8h", tone: "positive" },
      ],
      chart: [
        { label: "P1", value: 18 },
        { label: "P2", value: 44 },
        { label: "P3", value: 67 },
        { label: "P4", value: 39 },
      ],
      table: [
        {
          dimension: "Data access",
          finding: "Owner approval delay is the main blocker",
          owner: "Ops Lead",
          status: "Action",
        },
        {
          dimension: "Connector health",
          finding: "MySQL retries recovered automatically",
          owner: "Ingestion",
          status: "Ready",
        },
        {
          dimension: "User support",
          finding: "FAQ deflected common upload questions",
          owner: "Support",
          status: "Monitor",
        },
      ],
    },
  },
  {
    id: "report-system-observability",
    title: "System Observability Snapshot",
    excerpt:
      "Đánh giá độ ổn định hệ thống, lỗi API, queue latency và sức khỏe index sau các lần ingest.",
    createdAt: "2026-07-21",
    author: "An Nguyen",
    source: "Platform Reliability",
    tags: ["System", "Latency", "Index"],
    category: "Báo cáo hệ thống",
    thumbnailTone: "slate",
    detail: {
      headline:
        "API ổn định, queue latency tăng nhẹ ở ingest lớn; index rebuild cần giới hạn concurrency rõ hơn.",
      body: [
        "P95 API latency duy trì dưới 420ms trong 92% khung đo. Queue latency tăng ở các job ingest có nhiều file lớn, đặc biệt khi rebuild index chạy song song với semantic extraction.",
        "Cần áp dụng concurrency cap theo tenant và ghi rõ provenance cho mỗi lần index refresh để giảm rủi ro nhầm phiên bản bằng chứng.",
      ],
      metrics: [
        { label: "P95 latency", value: "418ms", change: "-36ms", tone: "positive" },
        { label: "Queue wait", value: "7.8m", change: "+2.4m", tone: "warning" },
        { label: "Error rate", value: "0.18%", change: "-0.05%", tone: "positive" },
      ],
      chart: [
        { label: "API", value: 82 },
        { label: "Queue", value: 54 },
        { label: "Index", value: 69 },
        { label: "Search", value: 77 },
      ],
      table: [
        {
          dimension: "API gateway",
          finding: "Error budget remains healthy",
          owner: "SRE",
          status: "Ready",
        },
        {
          dimension: "Index jobs",
          finding: "Concurrent rebuild increases queue wait",
          owner: "Search",
          status: "Review",
        },
        {
          dimension: "Semantic extraction",
          finding: "Retry policy prevents dropped entities",
          owner: "ML Ops",
          status: "Monitor",
        },
      ],
    },
  },
  {
    id: "report-executive-ingestion-readiness",
    title: "Executive Ingestion Readiness",
    excerpt:
      "Bản tóm tắt dành cho quản lý về tiến độ kết nối nguồn, coverage và các rủi ro còn mở.",
    createdAt: "2026-07-22",
    author: "Hanh Le",
    source: "Program Office",
    tags: ["Readiness", "Coverage", "Risk"],
    category: "Báo cáo tổng hợp",
    thumbnailTone: "amber",
    detail: {
      headline:
        "Coverage đã đủ cho phase pilot, nhưng quyền truy cập của hai nguồn tài chính vẫn cần chốt trước khi mở rộng.",
      body: [
        "Trong 12 nguồn dữ liệu mục tiêu, 9 nguồn đã hoàn tất profile, 7 nguồn có semantic hints được phê duyệt và 5 nguồn đã sẵn sàng index. Rủi ro lớn nhất nằm ở dữ liệu tài chính có điều kiện truy cập chặt hơn.",
        "Phase pilot có thể bắt đầu với phạm vi CRM, support và system logs. Nên giữ finance ở trạng thái controlled preview cho đến khi hoàn tất approval path.",
      ],
      metrics: [
        { label: "Sources profiled", value: "9/12", change: "+3", tone: "positive" },
        { label: "Ready to index", value: "5", change: "+2", tone: "neutral" },
        { label: "Open risks", value: "4", change: "-1", tone: "warning" },
      ],
      chart: [
        { label: "CRM", value: 86 },
        { label: "Support", value: 78 },
        { label: "Logs", value: 74 },
        { label: "Finance", value: 41 },
      ],
      table: [
        {
          dimension: "CRM",
          finding: "Pilot coverage complete",
          owner: "Revenue Ops",
          status: "Ready",
        },
        {
          dimension: "Support",
          finding: "Taxonomy approved for first release",
          owner: "CX",
          status: "Ready",
        },
        {
          dimension: "Finance",
          finding: "Access control review still pending",
          owner: "Finance Ops",
          status: "Blocked",
        },
      ],
    },
  },
  {
    id: "report-security-audit-trace",
    title: "Security Audit Trace Review",
    excerpt:
      "Rà soát provenance, event bất thường và các gap kiểm toán quanh luồng ingest nhạy cảm.",
    createdAt: "2026-07-23",
    author: "Quang Do",
    source: "Security Review",
    tags: ["Security", "Audit", "Trace"],
    category: "Báo cáo kiểm toán",
    thumbnailTone: "rose",
    detail: {
      headline:
        "Audit trace đầy đủ ở cấp job, nhưng cần bổ sung user attribution cho thao tác tải lại file.",
      body: [
        "Các event tạo job, duyệt profile và build index đều có trace đầy đủ. Điểm thiếu nằm ở thao tác tải lại file khi user thay đổi batch upload trong cùng phiên làm việc.",
        "Nên thêm user attribution và checksum snapshot vào event reload để phục vụ truy vết sau sự cố. Mức rủi ro hiện tại ở mức trung bình vì dữ liệu chưa vào production index.",
      ],
      metrics: [
        { label: "Trace coverage", value: "91%", change: "+6%", tone: "positive" },
        { label: "Audit gaps", value: "3", change: "-2", tone: "warning" },
        { label: "Sensitive jobs", value: "17", change: "+5", tone: "neutral" },
      ],
      chart: [
        { label: "Auth", value: 72 },
        { label: "Upload", value: 48 },
        { label: "Profile", value: 81 },
        { label: "Index", value: 76 },
      ],
      table: [
        {
          dimension: "Job creation",
          finding: "Trace includes actor, source, and timestamp",
          owner: "Security",
          status: "Ready",
        },
        {
          dimension: "File reload",
          finding: "Missing actor in reload event",
          owner: "Frontend",
          status: "Action",
        },
        {
          dimension: "Index approval",
          finding: "Approval path logged correctly",
          owner: "Governance",
          status: "Ready",
        },
      ],
    },
  },
  {
    id: "report-search-relevance",
    title: "Search Relevance Calibration",
    excerpt:
      "Đo chất lượng kết quả tìm kiếm sau index mới, bao gồm precision, recall và coverage theo tag.",
    createdAt: "2026-07-24",
    author: "Nhi Vo",
    source: "Search Quality",
    tags: ["Search", "Relevance", "Evidence"],
    category: "Báo cáo chất lượng",
    thumbnailTone: "cyan",
    detail: {
      headline:
        "Precision tăng ở truy vấn vận hành, recall còn thấp ở câu hỏi đa nguồn có thuật ngữ tài chính.",
      body: [
        "Bộ truy vấn kiểm thử cho thấy precision@5 đạt 86% ở nhóm operations và 82% ở nhóm system logs. Các câu hỏi cần nối dữ liệu CRM với finance vẫn bỏ sót bằng chứng vì synonym mapping chưa đủ rộng.",
        "Nên mở rộng semantic hints cho revenue, invoice và booking terms trước khi dùng kết quả này cho các báo cáo executive tự động.",
      ],
      metrics: [
        { label: "Precision@5", value: "84%", change: "+7%", tone: "positive" },
        { label: "Recall", value: "68%", change: "+3%", tone: "warning" },
        { label: "Evidence coverage", value: "76%", change: "+8%", tone: "positive" },
      ],
      chart: [
        { label: "Ops", value: 86 },
        { label: "Logs", value: 82 },
        { label: "CRM", value: 74 },
        { label: "Finance", value: 58 },
      ],
      table: [
        {
          dimension: "Operations queries",
          finding: "Top results cite the expected runbooks",
          owner: "Search",
          status: "Ready",
        },
        {
          dimension: "Finance terms",
          finding: "Synonym coverage misses booking language",
          owner: "Data Steward",
          status: "Review",
        },
        {
          dimension: "Evidence snippets",
          finding: "Short snippets improve scan speed",
          owner: "UX",
          status: "Monitor",
        },
      ],
    },
  },
];
