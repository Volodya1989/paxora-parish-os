"use client";

import React, {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { composeRefs } from "@/lib/ui/refs";

export type DropdownKeyDownOptions = {
  itemCount: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
};

/**
 * Handle keyboard interactions for dropdown menus.
 */
export function handleDropdownMenuKeyDown(
  event: Pick<KeyboardEvent, "key" | "preventDefault">,
  options: DropdownKeyDownOptions
) {
  const { itemCount, currentIndex, onIndexChange, onOpenChange } = options;

  if (event.key === "Escape") {
    onOpenChange(false);
    return;
  }

  if (itemCount === 0) {
    return;
  }

  let nextIndex: number | null = null;

  switch (event.key) {
    case "ArrowDown":
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % itemCount;
      break;
    case "ArrowUp":
      nextIndex = currentIndex < 0 ? itemCount - 1 : (currentIndex - 1 + itemCount) % itemCount;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = itemCount - 1;
      break;
    default:
      break;
  }

  if (nextIndex !== null) {
    event.preventDefault();
    onIndexChange(nextIndex);
  }
}

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  menuId: string;
  triggerRef: React.RefObject<HTMLElement>;
  menuRef: React.RefObject<HTMLDivElement>;
  itemsRef: React.MutableRefObject<Array<HTMLElement>>;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within <Dropdown>.");
  }
  return context;
}

export type DropdownProps = {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Dropdown container that manages open state and interactions.
 */
export function Dropdown({ children, open: openProp, onOpenChange }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp]
  );

  const triggerId = useId();
  const menuId = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLElement>>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
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
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstItem = itemsRef.current[0];
    firstItem?.focus();
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      triggerId,
      menuId,
      triggerRef,
      menuRef,
      itemsRef
    }),
    [menuId, open, setOpen, triggerId]
  );

  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

type DropdownTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean;
  asChild?: boolean;
  children?: ReactNode;
};

/**
 * Dropdown trigger button.
 */
export function DropdownTrigger({
  className,
  iconOnly = false,
  asChild = false,
  type = "button",
  children,
  ...props
}: DropdownTriggerProps) {
  const { open, setOpen, triggerId, menuId, triggerRef } = useDropdownContext();
  const ariaLabel = props["aria-label"];
  const { onClick: onTriggerClick, ...restProps } = props;
  const triggerProps = { ...restProps };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    onTriggerClick?.(event as React.MouseEvent<HTMLButtonElement>);
    setOpen(!open);
  };

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement;
    return React.cloneElement(child, {
      ...triggerProps,
      id: triggerId,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": menuId,
      "aria-label": iconOnly ? ariaLabel : child.props["aria-label"],
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        handleClick(event);
      },
      ref: composeRefs((child as { ref?: React.Ref<HTMLElement> }).ref, triggerRef),
      className: cn(child.props.className, className)
    });
  }

  return (
    <button
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      id={triggerId}
      type={type}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      aria-label={iconOnly ? ariaLabel : undefined}
      onClick={handleClick as React.MouseEventHandler<HTMLButtonElement>}
      className={cn(
        "inline-flex items-center justify-center rounded-button px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-mist-50 focus-ring",
        className
      )}
      {...triggerProps}
    >
      {children}
    </button>
  );
}

type DropdownMenuProps = HTMLAttributes<HTMLDivElement> & {
  ariaLabel?: string;
};

/**
 * Dropdown menu container.
 */
export function DropdownMenu({ className, ariaLabel, ...props }: DropdownMenuProps) {
  const { open, menuId, triggerId, menuRef, itemsRef, setOpen } = useDropdownContext();

  if (!open) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      aria-label={ariaLabel}
      onKeyDown={(event) => {
        const currentIndex = itemsRef.current.findIndex(
          (item) => item === document.activeElement
        );
        handleDropdownMenuKeyDown(event, {
          itemCount: itemsRef.current.length,
          currentIndex,
          onIndexChange: (index) => itemsRef.current[index]?.focus(),
          onOpenChange: setOpen
        });
        props.onKeyDown?.(event);
      }}
      className={cn(
        "absolute right-0 mt-2 w-48 rounded-card border border-mist-200 bg-white p-2 shadow-overlay",
        className
      )}
      {...props}
    />
  );
}

type DropdownItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children: ReactNode;
};

/**
 * Dropdown item that participates in keyboard navigation.
 */
export function DropdownItem({
  asChild = false,
  className,
  children,
  onClick,
  ...props
}: DropdownItemProps) {
  const { setOpen, itemsRef } = useDropdownContext();
  const itemRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!itemRef.current) {
      return;
    }

    itemsRef.current.push(itemRef.current);
    return () => {
      itemsRef.current = itemsRef.current.filter((item) => item !== itemRef.current);
    };
  }, [itemsRef]);

  const handleSelect = (event: React.MouseEvent<HTMLElement>) => {
    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    setOpen(false);
  };

  const baseClass = cn(
    "flex w-full items-center rounded-button px-3 py-2 text-sm text-ink-700 transition hover:bg-mist-50 focus-visible:bg-mist-50 focus-visible:outline-none",
    className
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement;
    return React.cloneElement(child, {
      role: "menuitem",
      tabIndex: -1,
      className: cn(baseClass, child.props.className),
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        handleSelect(event);
      },
      ref: composeRefs((child as { ref?: React.Ref<HTMLElement> }).ref, itemRef)
    });
  }

  return (
    <button
      ref={itemRef as React.RefObject<HTMLButtonElement>}
      role="menuitem"
      tabIndex={-1}
      className={baseClass}
      onClick={handleSelect}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
