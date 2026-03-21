import { ChevronDown } from "lucide-react";
import { ThemeToggler } from "./ThemeToggler";
import { useState } from "react";
import { VoiceLanguageDropdown } from "./VoiceLanguageDropdown";
import { useTheme } from "../../hooks/useTheme";

function SettingDropdown({ value, setValue, options }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-bg-hover border border-border-default rounded-lg pl-4 pr-3 py-2 text-sm focus:outline-none focus:border-border-active transition-colors"
      >
        {value}
        <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="absolute mt-2 w-full bg-bg-card border border-border-default rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto lean-slider">
          {options.map((opt) => (
            <li
              key={opt}
              onClick={() => { setValue(opt); setOpen(false); }}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-bg-hover ${value === opt ? "bg-bg-hover text-text-primary" : "text-text-muted"}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const [voiceLan, setVoiceLan] = useState("Auto-detect");
  const [voice, setVoice] = useState("Wave");
  const [language, setLanguage] = useState("EN");

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold mb-6">Preferences</h3>
      <div className="bg-bg-card rounded-xl border border-border-default">
        <div className="p-6 flex flex-col gap-6">
          <VoiceLanguageDropdown value={voiceLan} setValue={setVoiceLan} />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Voice</span>
            <SettingDropdown value={voice} setValue={setVoice} options={["Wave", "Echo"]} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Language</span>
            <SettingDropdown value={language} setValue={setLanguage} options={["EN", "ES"]} />
          </div>
          <ThemeToggler theme={theme} setTheme={setTheme} />
        </div>
      </div>
    </div>
  );
}
