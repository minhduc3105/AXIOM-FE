import { AppExperience } from "./app/AppExperience";
import { ThemeProvider } from "./app/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import "./styles/globals.css";

export default function App() {
  return (
    <ThemeProvider>
      <AppExperience />
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}
