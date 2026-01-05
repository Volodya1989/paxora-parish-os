import type { ReactNode } from "react";

export default function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-mist-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}
