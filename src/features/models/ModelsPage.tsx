import { ShieldAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { OrganizationModelRegistry } from "./components/OrganizationModelRegistry";

export function ModelsPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.org_role !== "org_admin") {
    return <main className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"><div className="mx-auto max-w-3xl"><Alert className="border-[#d8d0c2] bg-[#f8f4eb] text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]"><ShieldAlertIcon /><AlertTitle>Model settings require an organization admin</AlertTitle><AlertDescription>Your current role can use assigned workspaces but cannot change organization-wide model configuration.</AlertDescription></Alert></div></main>;
  }
  return <main className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"><div className="mx-auto max-w-[1320px]"><OrganizationModelRegistry user={user} /></div></main>;
}
