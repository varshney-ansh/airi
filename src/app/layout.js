import "./globals.css";
import "../../ui-components/index.css";
import { Google_Sans_Flex } from "next/font/google";
import { ThemeProvider } from "../../ui-components/hooks/useTheme";

const googleSansFlex = Google_Sans_Flex({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'greek'],
})

export const metadata = {
  title: "Airi | Ai Desktop Assistant Agent",
  description: "Airi | Ai Desktop Assistant Agent",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <link rel="icon" href="/logo.ico" />
      <body
        className={`antialiased ${googleSansFlex.className}`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
