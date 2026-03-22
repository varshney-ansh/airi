import AppItem from "./AppItem";
import { useMemo, useState } from "react";

function AppsSection({ appsList, onSelect }) {
  const [selectedCategory, setSelectedCategory] = useState("Featured");

  // Extract unique categories from apps
  const categories = useMemo(() => {
    const unique = [...new Set(appsList.map((app) => app.category))];
    return ["Featured", ...unique];
  }, [appsList]);

  // Filter apps
  const filteredApps = useMemo(() => {
    if (selectedCategory === "Featured") return appsList;
    return appsList.filter((app) => app.category === selectedCategory);
  }, [selectedCategory, appsList]);

  return (
    <div className="bg-bg-app text-text-primary px-10 py-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">Apps</h1>
            <span className="text-xs bg-bg-card px-2 py-1 rounded-full text-text-secondary">
              BETA
            </span>
          </div>
          <p className="text-text-primary mt-2">
            Chat with your favorite apps in AIRI
          </p>
        </div>
      </div>

      {/* banner  */}

      {/* <div className="relative rounded-3xl overflow-hidden mb-10">
        <div className="bg-linear-to-r from-teal-700 via-cyan-600 to-yellow-500 p-10 flex items-center justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-linear-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold">
                C
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Create with Canva</h2>
                <p className="text-sm text-white/80">Make designs and flyers</p>
              </div>
            </div>

            <button className="bg-black text-white px-6 py-2 rounded-full hover:bg-zinc-900 transition">
              View
            </button>
          </div>

          <div className="hidden md:block bg-white text-black w-[280px] rounded-2xl p-4 shadow-xl">
            <div className="flex gap-2 mb-3">
              <div className="w-1/2 h-28 bg-red-500 rounded-lg"></div>
              <div className="w-1/2 h-28 bg-orange-400 rounded-lg"></div>
            </div>
            <p className="text-sm text-zinc-700">
              Coming right up! Here are some social media posts with the Chopify
              Burgers’ look and feel...
            </p>
          </div>
        </div>
      </div> */}

      {/* banner  */}

      {/* Tabs */}
      <div className="flex gap-6 mb-8">
        {categories.map((category) => {
          const isActive = selectedCategory === category;

          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-full text-sm transition-all duration-200 cursor-pointer
                ${
                  isActive
                    ? "bg-text-primary text-bg-app font-medium shadow-md"
                    : "bg-bg-card text-text-secondary hover:bg-text-secondary hover:text-bg-app"
                }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Apps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredApps.map((app) => (
          <div onClick={() => onSelect(app)} key={app.name} className="">
            <AppItem
              icon={app.icon}
              title={app.name}
              description={app.shortDes}
            />
          </div>
        ))}
        {/* If no apps found */}
        {filteredApps.length === 0 && (
          <div className="text-center text-text-secondary mt-10">
            No apps available in this category.
          </div>
        )}
      </div>
    </div>
  );
}

export default AppsSection;