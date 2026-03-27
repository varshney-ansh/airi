"use client";

import { useEffect, useState } from "react";

const TOOL_LABELS = {
    browser_automation:     "Browsing the web",
    search_win_app_by_name: "Searching for app",
    start_app_session:      "Launching app",
    inspect_ui_elements:    "Inspecting UI elements",
    list_element_names:     "Reading interface",
    get_element_details:    "Locating element",
    stop_app_session:       "Closing app session",
    manage_memory:          "Accessing memory",
    web_search:             "Searching the web",
};

export default function AgentLoader({ toolName }) {
    const label = toolName
        ? (TOOL_LABELS[toolName] ?? toolName.replace(/_/g, " "))
        : "Thinking";

    const [dots, setDots] = useState(".");

    // Animate trailing dots so it feels alive without random text changes
    useEffect(() => {
        const id = setInterval(() => {
            setDots((d) => (d.length >= 3 ? "." : d + "."));
        }, 500);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center gap-3 px-4 py-3 max-w-fit bg-bg-card rounded-2xl rounded-tl-sm border border-border-default shadow-md mt-1">
            {/* Gemini-style spinning ring */}
            <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                <div
                    className="absolute inset-0 rounded-full animate-spin"
                    style={{
                        background: "conic-gradient(from 0deg, #4285F4, #9B72CB, #D96570, #4285F4)",
                        WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))",
                        mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))",
                    }}
                />
                <img src="/logo.png" alt="Airi" className="w-[18px] h-[18px] object-contain z-10" />
            </div>

            <span className="text-text-muted text-[14px] font-medium min-w-[120px]">
                {label}<span className="inline-block w-5 text-left">{dots}</span>
            </span>
        </div>
    );
}
