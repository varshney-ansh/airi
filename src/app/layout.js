import "./globals.css";

export const metadata = {
  title: "Airi | Ai Desktop Assistant Agent",
  description: "Airi | Ai Desktop Assistant Agent",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <link rel="icon" href="/logo.ico" />
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
