import "./globals.css";
import type { ReactNode } from "react";
import IosViewportFix from "@/components/ui/IosViewportFix";

export const metadata = {
  title: "Paxora Parish OS",
  description: "Week-first parish coordination"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <IosViewportFix />
        {children}
      </body>
    </html>
  );
}
