import React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Card container for grouped content.
 * Supports interactive variant with hover lift effect.
 */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card-padding rounded-card border border-mist-200 bg-white shadow-card transition-shadow duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Interactive card with hover effects for clickable items.
 */
export function InteractiveCard({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card-padding rounded-card border border-mist-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-mist-300 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card header wrapper for titles and supporting actions.
 */
export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {children}
    </div>
  );
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
};

/**
 * Card title text.
 */
export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn("text-h3", className)} {...props}>
      {children}
    </h3>
  );
}

type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

/**
 * Card description text.
 */
export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-ink-500", className)} {...props}>
      {children}
    </p>
  );
}

/**
 * Card content wrapper.
 */
export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Card footer wrapper for actions.
 */
export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
