import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { updateSkillEnabled } from "../api/skillRegistryApi";
import type { UserSkillSummary } from "./types";

type SkillOverride = { enabled: boolean };
type SkillOverrides = Record<string, SkillOverride>;
type SkillFlags = Record<string, boolean>;
type SkillUpdateError = { message: string; attemptedEnabled: boolean };
type SkillErrors = Record<string, SkillUpdateError | undefined>;

type SkillsContextValue = {
  isSkillEnabled: (skillId: string, apiEnabled: boolean) => boolean;
  isSkillUpdating: (skillId: string) => boolean;
  getSkillUpdateError: (skillId: string) => string | null;
  setSkillEnabled: (
    skillId: string,
    workspaceId: string | null,
    enabled: boolean,
  ) => Promise<boolean>;
  retrySkillUpdate: (
    skillId: string,
    workspaceId: string | null,
  ) => Promise<boolean>;
  reconcileCatalogSkills: (skills: UserSkillSummary[]) => void;
};

const SkillsContext = createContext<SkillsContextValue | null>(null);

export function SkillsProvider({ children }: { children: React.ReactNode }) {
  const [skillOverrides, setSkillOverrides] = useState<SkillOverrides>({});
  const [updatingSkills, setUpdatingSkills] = useState<SkillFlags>({});
  const [skillErrors, setSkillErrors] = useState<SkillErrors>({});
  const skillOverridesRef = useRef<SkillOverrides>({});
  const updatingSkillsRef = useRef<SkillFlags>({});

  const isSkillEnabled = useCallback(
    (skillId: string, apiEnabled: boolean) =>
      skillOverrides[skillId]?.enabled ?? apiEnabled,
    [skillOverrides],
  );

  const isSkillUpdating = useCallback(
    (skillId: string) => Boolean(updatingSkills[skillId]),
    [updatingSkills],
  );

  const getSkillUpdateError = useCallback(
    (skillId: string) => skillErrors[skillId]?.message ?? null,
    [skillErrors],
  );

  const setSkillEnabled = useCallback(
    async (skillId: string, workspaceId: string | null, enabled: boolean) => {
      if (updatingSkillsRef.current[skillId]) return false;

      const previousOverrides = skillOverridesRef.current;
      const hadOverride = Object.prototype.hasOwnProperty.call(
        previousOverrides,
        skillId,
      );
      const previousOverride = previousOverrides[skillId];
      const optimisticOverrides = {
        ...previousOverrides,
        [skillId]: { enabled },
      };

      skillOverridesRef.current = optimisticOverrides;
      updatingSkillsRef.current = {
        ...updatingSkillsRef.current,
        [skillId]: true,
      };
      setSkillOverrides(optimisticOverrides);
      setUpdatingSkills(updatingSkillsRef.current);
      setSkillErrors((current) => ({ ...current, [skillId]: undefined }));

      try {
        const response = await updateSkillEnabled(
          skillId,
          workspaceId,
          enabled,
        );
        const nextOverrides = {
          ...skillOverridesRef.current,
          [skillId]: { enabled: response.enabled },
        };
        skillOverridesRef.current = nextOverrides;
        setSkillOverrides(nextOverrides);
        toast.success(
          `${skillId} ${response.enabled ? "enabled" : "disabled"}`,
          {
            description:
              "The preference applies to your agent's next skill discovery.",
          },
        );
        return true;
      } catch (error: unknown) {
        const nextOverrides = { ...skillOverridesRef.current };
        if (hadOverride && previousOverride) {
          nextOverrides[skillId] = previousOverride;
        } else {
          delete nextOverrides[skillId];
        }
        skillOverridesRef.current = nextOverrides;
        setSkillOverrides(nextOverrides);

        const message =
          error instanceof Error
            ? error.message
            : "Unable to update skill preference.";
        setSkillErrors((current) => ({
          ...current,
          [skillId]: { message, attemptedEnabled: enabled },
        }));
        toast.error("Unable to update skill preference", {
          description: message,
        });
        return false;
      } finally {
        const nextUpdatingSkills = {
          ...updatingSkillsRef.current,
          [skillId]: false,
        };
        updatingSkillsRef.current = nextUpdatingSkills;
        setUpdatingSkills(nextUpdatingSkills);
      }
    },
    [],
  );

  const retrySkillUpdate = useCallback(
    (skillId: string, workspaceId: string | null) => {
      const failedUpdate = skillErrors[skillId];
      if (!failedUpdate) return Promise.resolve(false);
      return setSkillEnabled(
        skillId,
        workspaceId,
        failedUpdate.attemptedEnabled,
      );
    },
    [setSkillEnabled, skillErrors],
  );

  const reconcileCatalogSkills = useCallback((skills: UserSkillSummary[]) => {
    const catalogSkillIds = new Set(skills.map((skill) => skill.id));
    const nextOverrides = Object.fromEntries(
      Object.entries(skillOverridesRef.current).filter(
        ([skillId]) =>
          catalogSkillIds.has(skillId) || updatingSkillsRef.current[skillId],
      ),
    );
    skillOverridesRef.current = nextOverrides;
    setSkillOverrides(nextOverrides);
  }, []);

  const value = useMemo(
    () => ({
      isSkillEnabled,
      isSkillUpdating,
      getSkillUpdateError,
      setSkillEnabled,
      retrySkillUpdate,
      reconcileCatalogSkills,
    }),
    [
      getSkillUpdateError,
      isSkillEnabled,
      isSkillUpdating,
      reconcileCatalogSkills,
      retrySkillUpdate,
      setSkillEnabled,
    ],
  );

  return (
    <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
  );
}

export function useSkillsState() {
  const context = useContext(SkillsContext);
  if (!context)
    throw new Error("useSkillsState must be used within SkillsProvider.");
  return context;
}
