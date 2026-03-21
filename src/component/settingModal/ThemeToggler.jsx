import { Sun, Moon } from "lucide-react";

export function ThemeToggler({ theme, setTheme }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Theme</span>
      <div className="flex w-40 rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setTheme("Day")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors outline-none cursor-pointer ${
            theme === "Day"
              ? "bg-bg-hover text-text-default"
              : "bg-bg-card text-text-muted"
          }`}
        >
          <Sun size={16} />
          Day
        </button>
        <button
          onClick={() => setTheme("Night")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors outline-none cursor-pointer ${
            theme === "Night"
              ? "bg-bg-hover text-text-default"
              : "bg-bg-card text-text-muted"
          }`}
        >
          <Moon size={16} />
          Night
        </button>
      </div>
    </div>
  );
}
