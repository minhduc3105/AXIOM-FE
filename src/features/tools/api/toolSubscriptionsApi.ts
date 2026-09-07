import { authFetch } from "@/features/auth/model/authFetch";

const gateway = (import.meta.env.VITE_AXIOM_GATEWAY_API_URL || "").replace(
  /\/$/,
  "",
);
export const toolSubscriptionsUrl = `${gateway}/authz-service/api/v1/authz/me/tool-subscriptions`;

export type ToolSubscriptions = {
  organization_id: string;
  tool_names: string[];
};

export class ToolSubscriptionsError extends Error {}

export async function getToolSubscriptions(
  signal: AbortSignal,
): Promise<ToolSubscriptions> {
  const response = await authFetch(toolSubscriptionsUrl, { signal });
  if (!response.ok)
    throw new ToolSubscriptionsError(
      `Unable to load organization tool registrations (${response.status}).`,
    );
  const payload = (await response.json()) as ToolSubscriptions;
  if (
    !payload ||
    typeof payload.organization_id !== "string" ||
    !Array.isArray(payload.tool_names) ||
    payload.tool_names.some((name) => typeof name !== "string")
  ) {
    throw new ToolSubscriptionsError(
      "Invalid organization tool registrations response.",
    );
  }
  return payload;
}
