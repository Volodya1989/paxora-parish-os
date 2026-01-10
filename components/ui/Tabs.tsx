"use client";

import {
  createContext,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactNode,
  useMemo
} from "react";
import { cn } from "@/lib/ui/cn";

type TabsContextValue<TValue extends string = string> = {
  value: TValue;
  onValueChange: (value: TValue) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps<TValue extends string = string> = {
  value: TValue;
  onValueChange: (value: TValue) => void;
  children: ReactNode;
};

export function Tabs<TValue extends string = string>({
  value,
  onValueChange,
  children
}: TabsProps<TValue>) {
  const baseId = useId();
  const context = useMemo(
    () => ({ value, onValueChange, baseId }),
    [value, onValueChange, baseId]
  );

  return (
    <TabsContext.Provider value={context as unknown as TabsContextValue}>
      {children}
    </TabsContext.Provider>
  );
}

type TabsListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "inline-flex rounded-full border border-mist-200 bg-mist-50 p-1",
        className
      )}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
          return;
        }

        const target = event.currentTarget;
        const tabs = Array.from(
          target.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        );
        const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);

        if (currentIndex === -1) {
          return;
        }

        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
        tabs[nextIndex]?.focus();
        event.preventDefault();
      }}
      {...props}
    >
      {children}
    </div>
  );
}

type TabsTriggerProps<TValue extends string = string> = HTMLAttributes<HTMLButtonElement> & {
  value: TValue;
  children: ReactNode;
};

export function TabsTrigger<TValue extends string = string>({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps<TValue>) {
  const context = useContext(TabsContext) as TabsContextValue<TValue> | null;

  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs");
  }

  const isActive = context.value === value;
  const tabId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition focus-ring",
        isActive
          ? "bg-white text-ink-900 shadow-sm"
          : "text-ink-500 hover:text-ink-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type TabsPanelProps<TValue extends string = string> = HTMLAttributes<HTMLDivElement> & {
  value: TValue;
  children: ReactNode;
};

export function TabsPanel<TValue extends string = string>({
  value,
  className,
  children,
  ...props
}: TabsPanelProps<TValue>) {
  const context = useContext(TabsContext) as TabsContextValue<TValue> | null;

  if (!context) {
    throw new Error("TabsPanel must be used within Tabs");
  }

  const isActive = context.value === value;
  const tabId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isActive}
      className={cn("mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default Tabs;
