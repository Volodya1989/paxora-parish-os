import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`card-padding rounded-card border border-mist-200 bg-white shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
