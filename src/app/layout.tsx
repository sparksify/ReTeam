import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReTeam",
  description: "The operating system for your AI real estate company.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
