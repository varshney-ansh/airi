import { ExternalLink } from "lucide-react";
import InfoRow from "./InfoRow";

function AppDetailCompo({ app, onBack }) {
  return (
    <div className="px-8 py-6 max-w-4xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="text-sm text-text-muted mb-10">
        <button
          onClick={onBack}
          className="cursor-pointer hover:text-text-primary"
        >
          Apps
        </button>
        <span className="mx-2">›</span>
        <span className="text-text-primary">{app.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${app.iconBg} ${app.iconColor}`}
          >
            <img
              src={app.icon}
              alt={app.name + "img"}
              className="w-full h-auto object-cover object-center"
            />
          </div>

          <div>
            <h1 className="text-3xl font-semibold">{app.name}</h1>
            <p className="text-text-secondary mt-1">{app.description}</p>
          </div>
        </div>

        <button className="bg-text-primary text-bg-app px-6 py-2 rounded-full text-sm font-medium">
          Connect
        </button>
      </div>

      {/* Description */}
      <p className="text-text-muted leading-relaxed mb-12 text-sm">
        {app.longDes}
      </p>

      {/* Information Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Information</h2>

        <div className="border border-text-muted rounded-xl overflow-hidden max-w-xl mx-auto">
          <table className="w-full text-sm table-auto border-collapse">
            <tbody>
              <InfoRow label="Category" value={app.category} />
              <InfoRow
                label="Capabilities"
                value={app.capabilities.join(", ")}
              />
              <InfoRow label="Developer" value={app.developer} />
              <InfoRow
                label="Website"
                value={
                  <a
                    href={app.websitelink}
                    className="underline"
                    target="_blank"
                  >
                    <ExternalLink size={20} strokeWidth={2} />
                  </a>
                }
              />
              <InfoRow label="Version" value={app.version}  />
              <InfoRow
                label="Privacy"
                value={
                  <a
                    href={app.privacyPolicy}
                    className="underline"
                    target="_blank"
                  >
                    <ExternalLink size={20} strokeWidth={2} />
                  </a>
                }
                last
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AppDetailCompo;