import React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Card container for grouped content.
 */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card-padding rounded-card border border-mist-200 bg-white shadow-card",
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
