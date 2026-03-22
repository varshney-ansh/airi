import { ChevronRight } from "lucide-react";

function AppItem({ icon, title, description }) {
  return (
    <div className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-bg-card/80 transition cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold">
          <img
            src={icon}
            alt={title + "img"}
            className="w-full h-auto object-center object-contain "
          />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-text-primary">{description}</p>
        </div>
      </div>
      <ChevronRight className="text-text-secondary" size={18} />
    </div>
  );
}

export default AppItem;