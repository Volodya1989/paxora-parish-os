"use client";

import React from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual style for the button. */
  variant?: ButtonVariant;
  /** Size of the button. */
  size?: ButtonSize;
  /** Show a loading indicator and disable interactions. */
  isLoading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800 disabled:bg-primary-300 shadow-sm hover:shadow",
  secondary:
    "border border-mist-200 bg-white text-ink-900 hover:bg-mist-50 hover:border-mist-300 active:bg-mist-100 disabled:border-mist-100 disabled:text-ink-400",
  ghost: "text-ink-700 hover:bg-mist-100 active:bg-mist-200 disabled:text-ink-400",
  danger: "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-300 shadow-sm hover:shadow"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm"
};

/**
 * Button component for primary actions and secondary UI controls.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled,
    ...props
  },
  ref
) {
  const t = useTranslations();
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-button font-medium transition-all duration-150 focus-ring disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {t("common.loading")}
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
