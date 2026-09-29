import { describe, expect, it } from "vitest";
import { formatSkillOrigin, isGeneralSkill } from "./skillPresentation";

describe("isGeneralSkill", () => {
  it("uses the bootstrap marker instead of registry visibility scope", () => {
    const legacyGlobalSkill = { metadata: {}, scope: "global" };
    const markedBootstrapSkill = {
      metadata: { axiom_system_bootstrap: true },
      scope: "personal",
    };

    expect(isGeneralSkill(legacyGlobalSkill)).toBe(false);
    expect(isGeneralSkill(markedBootstrapSkill)).toBe(true);
  });
});

describe("formatSkillOrigin", () => {
  it("uses bootstrap and organization-sharing state rather than scope", () => {
    expect(
      formatSkillOrigin({
        metadata: { axiom_system_bootstrap: true },
        organization_shared: false,
      }),
    ).toBe("General");
    expect(formatSkillOrigin({ metadata: {}, organization_shared: true })).toBe(
      "Organization",
    );
    expect(
      formatSkillOrigin({ metadata: {}, organization_shared: false }),
    ).toBe("Your skill");
  });
});
