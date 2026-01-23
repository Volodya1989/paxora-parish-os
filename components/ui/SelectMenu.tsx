"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/ui/cn";

export type SelectMenuOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectMenuProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  options: SelectMenuOption[];
  onValueChange?: (value: string) => void;
  className?: string;
  menuClassName?: string;
};

export default function SelectMenu({
  id,
  name,
  value,
  defaultValue,
  placeholder = "Select",
  disabled,
  options,
  onValueChange,
  className,
  menuClassName
}: SelectMenuProps) {
  const internalId = useId();
  const buttonId = id ?? internalId;
  const listboxId = `${buttonId}-listbox`;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    side: "bottom",
    maxHeight: 0
  });

  const selectedValue = value ?? internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue]
  );

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gutter = 8;
    const width = Math.max(rect.width, menuRect.width || 0);
    const availableBelow = window.innerHeight - rect.bottom - gutter;
    const availableAbove = rect.top - gutter;
    let top = rect.bottom + gutter;
    let side = "bottom";
    let maxHeight = availableBelow;
    if (availableBelow < menuRect.height && availableAbove > availableBelow) {
      top = rect.top - Math.min(menuRect.height, availableAbove) - gutter;
      side = "top";
      maxHeight = availableAbove;
    }
    let left = rect.left;
    if (left + width > window.innerWidth - gutter) {
      left = Math.max(gutter, window.innerWidth - width - gutter);
    }
    if (left < gutter) {
      left = gutter;
    }
    setPosition({ top, left, width, side, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition focus-ring",
          disabled && "cursor-not-allowed bg-mist-50 text-ink-400"
        )}
      >
        <span className={cn(!selectedOption && "text-ink-400")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span aria-hidden="true" className="text-xs text-ink-400">
          ▾
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={buttonId}
              data-side={position.side}
              className={cn(
                "z-[100] max-h-64 overflow-auto rounded-card border border-mist-200 bg-white p-1 shadow-overlay",
                menuClassName
              )}
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight || undefined
              }}
            >
              {options.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-button px-3 py-2 text-left text-sm text-ink-700 transition hover:bg-mist-50 focus-visible:bg-mist-50",
                      option.disabled && "cursor-not-allowed text-ink-300",
                      isSelected && "bg-primary-50 text-primary-700"
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
