import { useState } from "react";
import { X } from "lucide-react";
import { AccountTab } from "./settingModal/AccountTab";
import { AboutTab } from "./settingModal/AboutTab";
import { PreferencesTab } from "./settingModal/PreferencesTab";
import "../index.css"

export function SettingsModal({ onClose, name, email }) {
  const [activeTab, setActiveTab] = useState("Preferences");

  const tabs = ["Preferences", "Account", "About"];

  return (
    <div className="w-full min-h-screen flex justify-center items-center sm:p-6">
      <div className="max-sm:w-screen max-sm:h-screen max-sm:rounded-none w-full max-w-4xl bg-bg-modal rounded-2xl shadow-2xl border border-border-default overflow-hidden p-4">
        {/* top bar  */}
        <div className="w-full flex justify-between h-fit px-4 mb-4">
          <h2 className="text-xl font-semibold px-3">Settings</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        {/* main setting panel  */}
        <div className="select-none flex flex-col max-sm:flex-col sm:flex-row min-h-135">
          {/* Sidebar — horizontal on max-sm, vertical on sm+ */}
          <div className="max-sm:w-full sm:w-full sm:h-full sm:p-4 sm:flex-col sm:gap-6 sm:max-w-40 sm:min-w-fit">
            <nav className="max-sm:flex max-sm:flex-row max-sm:gap-1 max-sm:border-b max-sm:border-border-default max-sm:pb-2 max-sm:mb-2 flex flex-col gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-bg-hover text-text-primary"
                      : "text-text-secondary hover:bg-bg-hover/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col relative bg-bg-app rounded-2xl ">
            <div className="p-8 flex-1 overflow-y-auto">
              {activeTab === "Account" && <AccountTab email={email} name={name}/>}
              {activeTab === "About" && <AboutTab />}
              {activeTab === "Preferences" && <PreferencesTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
