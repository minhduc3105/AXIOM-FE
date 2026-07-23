import { AppExperience } from "./app/AppExperience";
import { ThemeProvider } from "./app/ThemeProvider";
import "./styles/globals.css";

export default function App() {
  return (
    <ThemeProvider>
      <AppExperience />
    </ThemeProvider>
  );
}
