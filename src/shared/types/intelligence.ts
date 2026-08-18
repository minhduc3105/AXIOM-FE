export type ConversationSummary = {
  conversation_id: string;
  title: string | null;
  status: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type ConversationListResponse = {
  items?: ConversationSummary[];
  pagination?: PaginationMeta;
};

export type IntelligenceMessage = {
  message_id: string;
  conversation_id: string;
  role: string;
  content: unknown;
  response_id: string | null;
  artifact_ref: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MessageListResponse = {
  items?: IntelligenceMessage[];
};
