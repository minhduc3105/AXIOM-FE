import { AppExperience } from "./app/AppExperience";
import { AppRouter } from "./app/AppRouter";
import { ThemeProvider } from "./app/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./features/auth/model/AuthProvider";
import { ToolsProvider } from "./features/tools/model/ToolsProvider";
import { SkillsProvider } from "./features/skills/model/SkillsProvider";
import { DataWorkspaceProvider } from "./features/data/model/DataWorkspaceProvider";
import "./styles/globals.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter
          renderApp={(route, navigate) => (
            <DataWorkspaceProvider>
              <OrganizationToolsProvider>
                <SkillsProvider>
                  <AppExperience route={route} navigate={navigate} />
                </SkillsProvider>
              </OrganizationToolsProvider>
            </DataWorkspaceProvider>
          )}
        />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

function OrganizationToolsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return (
    <ToolsProvider
      key={`${user?.organization_id}:${user?.id}:${user?.org_role}`}
      canManageTools={user?.org_role === "org_admin"}
    >
      {children}
    </ToolsProvider>
  );
}
