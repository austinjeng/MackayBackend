import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mackay Dashboard",
  description: "Operational dashboard backend for the Mackay application"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-shell">
        <main className="app-content">{children}</main>
      </body>
    </html>
  );
}