import { useEffect, useState } from "react";
import {
  getSkillRegistryErrorKind,
  listUserSkills,
} from "../api/skillRegistryApi";
import type { SkillCatalogFilters, UserSkillSummary } from "./types";

export function useSkillCatalog(filters: SkillCatalogFilters) {
  const [skills, setSkills] = useState<UserSkillSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ReturnType<
    typeof getSkillRegistryErrorKind
  > | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setErrorKind(null);

    const timer = window.setTimeout(() => {
      void listUserSkills(filters, controller.signal)
        .then((response) => {
          setSkills(response);
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
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters.language, filters.workspaceId, refreshToken]);

  return {
    skills,
    loading,
    error,
    errorKind,
    refresh: () => setRefreshToken((current) => current + 1),
  };
}
