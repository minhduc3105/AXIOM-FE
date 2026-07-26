import { AppExperience } from "./app/AppExperience";
import { ThemeProvider } from "./app/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { ToolsProvider } from "./features/tools/model/ToolsProvider";
import "./styles/globals.css";

export default function App() {
  return (
    <ThemeProvider>
      <ToolsProvider>
        <AppExperience />
        <Toaster position="bottom-right" richColors />
      </ToolsProvider>
    </ThemeProvider>
  );
}
