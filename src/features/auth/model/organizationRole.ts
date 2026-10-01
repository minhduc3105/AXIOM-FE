import type { AuthUser } from "./types";

export function parseOrganizationRole(
  value: FormDataEntryValue | null,
): AuthUser["org_role"] | null {
  if (value === "org_admin" || value === "org_member") return value;
  return null;
}
