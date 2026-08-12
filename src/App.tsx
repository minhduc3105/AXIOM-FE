import { AppExperience } from "./app/AppExperience";
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
        <DataWorkspaceProvider>
          <ToolsProvider>
            <AppExperience />
            <Toaster position="bottom-right" richColors />
          </ToolsProvider>
        </DataWorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
