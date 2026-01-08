import React from "react";
import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`card-padding rounded-card border border-mist-200 bg-white shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
