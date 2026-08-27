import { useEffect, useState } from "react";
import {
  getSkill,
  getSkillRegistryErrorKind,
  listUserSkills,
} from "../api/skillRegistryApi";
import type { SkillDetail, UserSkillSummary } from "./types";

export function useSkillDetail(skillId: string, workspaceId: string | null) {
  const [summary, setSummary] = useState<UserSkillSummary | null>(null);
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [requiresEnable, setRequiresEnable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ReturnType<
    typeof getSkillRegistryErrorKind
  > | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setDetail(null);
    setRequiresEnable(false);
    setLoading(true);
    setError(null);
    setErrorKind(null);

    void listUserSkills({ workspaceId }, controller.signal)
      .then(async (skills) => {
        const nextSummary =
          skills.find((skill) => skill.id === skillId) ?? null;
        if (!nextSummary) {
          const missing = new Error(
            `Skill ${skillId} was not found in the visible catalog.`,
          );
          setError(missing.message);
          setErrorKind("skill_not_found");
          return;
        }

        setSummary(nextSummary);
        if (!nextSummary.user_enabled) {
          setRequiresEnable(true);
          return;
        }

        try {
          const nextDetail = await getSkill(
            skillId,
            workspaceId,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setDetail(nextDetail);
        } catch (requestError: unknown) {
          if (controller.signal.aborted) return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load this skill.",
          );
          setErrorKind(getSkillRegistryErrorKind(requestError));
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Skill Registry is unavailable.",
        );
        setErrorKind(getSkillRegistryErrorKind(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [skillId, workspaceId, refreshToken]);

  return {
    summary,
    detail,
    requiresEnable,
    loading,
    error,
    errorKind,
    refresh: () => setRefreshToken((current) => current + 1),
  };
}
