import { AppExperience } from "./app/AppExperience";
import { AppRouter } from "./app/AppRouter";
import { ThemeProvider } from "./app/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./features/auth/model/AuthProvider";
import { ToolsProvider } from "./features/tools/model/ToolsProvider";
import { DataWorkspaceProvider } from "./features/data/model/DataWorkspaceProvider";
import "./styles/globals.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter
          renderApp={(route, navigate) => (
            <DataWorkspaceProvider>
              <ToolsProvider>
                <AppExperience route={route} navigate={navigate} />
              </ToolsProvider>
            </DataWorkspaceProvider>
          )}
        />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}
