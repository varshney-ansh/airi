"use client";
import { ChevronDown } from "lucide-react";
import { ThemeToggler } from "./ThemeToggler";
import { useState } from "react";
import { VoiceLanguageDropdown } from "./VoiceLanguageDropdown";
import { useTheme } from "../../hooks/useTheme";

export function PreferencesTab() {
  const { theme, setTheme } = useTheme(); // theme hook
  const [voiceLan, setVoiceLan] = useState("Auto-detect");

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold mb-6">Preferences</h3>

      <div className="bg-bg-card rounded-xl border border-border-default">
        <div className="p-6 flex flex-col gap-6">
          {/* voice language option  */}
          <VoiceLanguageDropdown value={voiceLan} setValue={setVoiceLan} />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Voice</span>
            <div className="relative w-40">
              <select className="w-full appearance-none bg-bg-hover border border-border-default rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-border-active transition-colors">
                <option>Wave</option>
                <option>Echo</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Language</span>
            <div className="relative w-40">
              <select className="w-full appearance-none bg-bg-hover border border-border-default rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-border-active transition-colors">
                <option>EN</option>
                <option>ES</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
          </div>
          <ThemeToggler theme={theme} setTheme={setTheme} />
        </div>
      </div>
    </div>
  );
}
