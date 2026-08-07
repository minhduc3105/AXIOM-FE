import { AppExperience } from "./app/AppExperience";
import { ThemeProvider } from "./app/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./features/auth/model/AuthProvider";
import { ToolsProvider } from "./features/tools/model/ToolsProvider";
import "./styles/globals.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToolsProvider>
          <AppExperience />
          <Toaster position="bottom-right" richColors />
        </ToolsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
