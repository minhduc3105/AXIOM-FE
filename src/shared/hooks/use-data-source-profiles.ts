import { useCallback, useEffect, useState } from "react";
import {
  deleteDataSourceProfile,
  readDataSourceProfiles,
  readDataSourceProfilesResult,
} from "@/shared/lib/data-source-profile-storage";
import type { SavedDataSourceProfile } from "@/shared/types/data-source-profile";

export function useDataSourceProfiles(organizationId: string) {
  const [profiles, setProfiles] = useState<SavedDataSourceProfile[]>(() =>
    readDataSourceProfiles(organizationId),
  );
  const [error, setError] = useState<string | null>(() =>
    readDataSourceProfilesResult(organizationId).warning,
  );

  const refresh = useCallback(() => {
    const result = readDataSourceProfilesResult(organizationId);
    setProfiles(result.profiles);
    setError(result.warning);
  }, [organizationId]);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const remove = useCallback((profileId: string) => {
    try {
      deleteDataSourceProfile(organizationId, profileId);
      setProfiles(readDataSourceProfiles(organizationId));
      setError(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this saved source.",
      );
    }
  }, [organizationId]);

  return { profiles, error, refresh, remove };
}
