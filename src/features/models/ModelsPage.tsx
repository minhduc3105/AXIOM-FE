import { useAuth } from "@/features/auth/model/AuthProvider";
import { OrganizationModelRegistry } from "./components/OrganizationModelRegistry";

export function ModelsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <main className="min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-x-hidden px-5 pb-12 pt-4 sm:px-8 md:pt-6">
      <div className="mx-auto grid w-full max-w-[1360px] gap-5">
        <OrganizationModelRegistry user={user} />
      </div>
    </main>
  );
}
