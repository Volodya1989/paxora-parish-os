import React from "react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-700 text-white hover:bg-primary-600 disabled:bg-primary-300",
  secondary:
    "border border-mist-200 bg-white text-ink-900 hover:bg-mist-50 disabled:text-ink-400",
  ghost: "text-ink-700 hover:bg-mist-100 disabled:text-ink-400"
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-button px-4 py-2 text-sm font-medium transition focus-ring disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
