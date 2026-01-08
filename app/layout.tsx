import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Paxora Parish OS",
  description: "Week-first parish coordination"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
