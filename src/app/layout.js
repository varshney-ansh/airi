import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
} from "@/components/ui/sidebar"
import { LoginForm } from "@/components/login-form";

import { auth0 } from "@/lib/auth0";

export const metadata = {
  title: "Airi | Ai Desktop Assistant Agent",
  description: "Airi | Ai Desktop Assistant Agent",
};

export default async function RootLayout({ children }) {
  // Check if user is authenticated
  const session = await auth0.getSession();
  // /auth/login?screen_hint=signup
  return (
    <html lang="en">
      <link rel="icon" href="/logo.ico" />
      <body
        className={`antialiased`}
      >
        {!session ? (
          <>
            <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
              <div className="w-full max-w-sm">
                <LoginForm />
              </div>
            </div>
          </>
        ) : (
          <SidebarProvider>
            <AppSidebar User={session.user} />
            {children}
          </SidebarProvider>
        )}
      </body>
    </html>
  );
}
