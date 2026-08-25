import { useAuth } from "@/features/auth/model/AuthProvider";
import { OrganizationModelRegistry } from "./components/OrganizationModelRegistry";

export function ModelsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <main className="min-h-0 px-4 py-4 sm:px-6 md:p-6">
      <div className="mx-auto grid w-full max-w-[1360px] gap-4">
        <OrganizationModelRegistry user={user} />
      </div>
    </main>
  );
}
