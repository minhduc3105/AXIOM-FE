import { describe, expect, it } from "vitest";
import { parseOrganizationRole } from "./organizationRole";

describe("parseOrganizationRole", () => {
  it("accepts the supported organization roles", () => {
    expect(parseOrganizationRole("org_member")).toBe("org_member");
    expect(parseOrganizationRole("org_admin")).toBe("org_admin");
  });

  it("rejects missing and invalid role values", () => {
    expect(parseOrganizationRole(null)).toBeNull();
    expect(parseOrganizationRole("null")).toBeNull();
  });
});
