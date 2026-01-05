import type { ButtonHTMLAttributes } from "react";

export default function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
