import type { ChatDataResource } from "../model/chatDataScope";

// FE-only catalog until the retrieval-scope endpoint is available.
const mockCatalog: ChatDataResource[] = [
  {
    id: "dataset:revenue-q3",
    name: "Q3 Revenue.xlsx",
    kind: "file",
    source: "Uploaded files",
    detail: "8 sheets · 24.6K rows",
    updatedAt: "2 hours ago",
    status: "ready",
  },
  {
    id: "dataset:customer-feedback",
    name: "Customer feedback",
    kind: "file",
    source: "Research archive",
    detail: "186 documents",
    updatedAt: "Yesterday",
    status: "ready",
  },
  {
    id: "datasource:stripe-payments",
    name: "Stripe payments",
    kind: "connector",
    source: "Stripe",
    detail: "Live connector · 38.4K records",
    updatedAt: "12 minutes ago",
    status: "ready",
  },
  {
    id: "datasource:support-tickets",
    name: "Support tickets",
    kind: "database",
    source: "MySQL",
    detail: "4 tables · 9.8K records",
    updatedAt: "38 minutes ago",
    status: "ready",
  },
  {
    id: "datasource:product-catalog",
    name: "Product catalog",
    kind: "database",
    source: "Snowflake",
    detail: "12 tables · 1.2K products",
    updatedAt: "3 hours ago",
    status: "ready",
  },
  {
    id: "dataset:market-research",
    name: "Market research 2026",
    kind: "file",
    source: "Amazon S3",
    detail: "42 documents · indexing",
    updatedAt: "Just now",
    status: "syncing",
  },
];

export async function listChatDataResources(
  organizationId: string,
  workspaceId: string,
  signal?: AbortSignal,
): Promise<ChatDataResource[]> {
  if (!organizationId.trim() || !workspaceId.trim()) return [];

  await mockLatency(signal);
  return mockCatalog.map((resource) => ({ ...resource }));
}

function mockLatency(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The request was aborted.", "AbortError"));
      return;
    }

    const timeoutId = window.setTimeout(resolve, 280);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException("The request was aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}
