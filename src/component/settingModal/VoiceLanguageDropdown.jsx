import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function VoiceLanguageDropdown({ value, setValue }) {
  const [open, setOpen] = useState(false);
  const options = ["Auto-Detect", "English"];

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Voice language</span>
      <div className="relative w-40">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-bg-hover border border-border-default rounded-lg pl-4 pr-3 py-2 text-sm focus:outline-none focus:border-border-active transition-colors"
        >
          {value}
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <ul className="absolute mt-2 w-full bg-bg-card border border-border-default rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto lean-slider">
            {options.map((opt) => (
              <li
                key={opt}
                onClick={() => {
                  setValue(opt);
                  setOpen(false);
                }}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-bg-hover ${
                  value === opt
                    ? "bg-bg-hover text-text-default"
                    : "text-text-muted"
                }`}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
