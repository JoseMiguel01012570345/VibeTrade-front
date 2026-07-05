import { CeThemeToggle } from "@shared/components/ui/CeThemeToggle";
import { useAppStore } from "@features/auth/logic/useAppStore";

export function ThemeToggle() {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);

  return (
    <CeThemeToggle
      theme={colorScheme}
      onToggle={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}
    />
  );
}
