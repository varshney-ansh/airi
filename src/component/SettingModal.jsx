"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { AccountTab } from "./settingModal/AccountTab";
import { AboutTab } from "./settingModal/AboutTab";
import { PreferencesTab } from "./settingModal/PreferencesTab";

export function SettingsModal({ hideModal }) {
  const [activeTab, setActiveTab] = useState("Preferences");

  const tabs = ["Preferences", "Account", "About"];

  return (
    <div
      onClick={() => {
        console.log("clicked");
        hideModal();
      }}
      className="w-screen h-screen inset-0 fixed z-100 bg-bg/10 backdrop-blur-md flex justify-center items-center"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="w-full max-w-4xl bg-bg-modal rounded-2xl shadow-2xl border border-border-default overflow-hidden p-4"
      >
        {/* top bar  */}
        <div className="w-full flex justify-between h-fit px-4 mb-4">
          <h2 className="text-xl font-semibold px-3">Settings</h2>
          <button
            onClick={hideModal}
            className="text-text-muted hover:text-text-primary transition-colors cursor-pointer outline-none"
          >
            <X size={20} />
          </button>
        </div>
        {/* main setting panel  */}
        <div className="select-none flex min-h-135">
          {/* Sidebar */}
          <div className="w-full h-full p-4 flex flex-col gap-6 max-w-40 min-w-fit">
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
              {activeTab === "Account" && <AccountTab />}
              {activeTab === "About" && <AboutTab />}
              {activeTab === "Preferences" && <PreferencesTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
