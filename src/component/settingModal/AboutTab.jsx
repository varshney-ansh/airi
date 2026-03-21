"use client";

export function AboutTab() {
  const links = [
    { label: "About our ads", href: "#" },
    { label: "Consumer health privacy", href: "#" },
    { label: "Your privacy choices", href: "#", hasIcon: true },
    { label: "Report legal or privacy concern", href: "#" },
  ];

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold mb-6">About</h3>

      <div className="bg-bg-card rounded-xl border border-border-default overflow-hidden">
        <div className="flex flex-col">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className={`p-4 text-sm font-medium hover:bg-bg-hover transition-colors flex items-center gap-2 ${
                index !== links.length - 1
                  ? "border-b border-border-default"
                  : ""
              }`}
            >
              <span>{link.label}</span>
              {link.hasIcon && (
                <span>
                  <svg
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 30 14"
                    xmlSpace="preserve"
                    className="size-8"
                    aria-hidden="true"
                  >
                    <path
                      d="M7.4 12.8h6.8l3.1-11.6H7.4C4.2 1.2 1.6 3.8 1.6 7s2.6 5.8 5.8 5.8z"
                      style={{
                        fillRule: "evenodd",
                        clipRule: "evenodd",
                        fill: "rgb(255, 255, 255)",
                      }}
                    />
                    <path
                      d="M22.6 0H7.4c-3.9 0-7 3.1-7 7s3.1 7 7 7h15.2c3.9 0 7-3.1 7-7s-3.2-7-7-7zm-21 7c0-3.2 2.6-5.8 5.8-5.8h9.9l-3.1 11.6H7.4c-3.2 0-5.8-2.6-5.8-5.8z"
                      style={{
                        fillRule: "evenodd",
                        clipRule: "evenodd",
                        fill: "rgb(0, 102, 255)",
                      }}
                    />
                    <path
                      d="M24.6 4c.2.2.2.6 0 .8L22.5 7l2.2 2.2c.2.2.2.6 0 .8-.2.2-.6.2-.8 0l-2.2-2.2-2.2 2.2c-.2.2-.6.2-.8 0-.2-.2-.2-.6 0-.8L20.8 7l-2.2-2.2c-.2-.2-.2-.6 0-.8.2-.2.6-.2.8 0l2.2 2.2L23.8 4c.2-.2.6-.2.8 0z"
                      style={{ fill: "rgb(255, 255, 255)" }}
                    />
                    <path
                      d="M12.7 4.1c.2.2.3.6.1.8L8.6 9.8c-.1.1-.2.2-.3.2-.2.1-.5.1-.7-.1L5.4 7.7c-.2-.2-.2-.6 0-.8.2-.2.6-.2.8 0L8 8.6l3.8-4.5c.2-.2.6-.2.9 0z"
                      style={{ fill: "rgb(0, 102, 255)" }}
                    />
                  </svg>
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
