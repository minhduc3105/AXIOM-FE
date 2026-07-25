export type ConversationSummary = {
  conversation_id: string;
  title: string | null;
  status: string;
  updated_at: string;
};

export type ConversationListResponse = {
  items?: ConversationSummary[];
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
