"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from "@/components/ui/Dropdown";
import {
  buildAddHref,
  buildWeekHref,
  getPageTitle,
  normalizeWeekSelection
} from "@/components/header/headerUtils";

type AddTarget = "task" | "event" | "group";

const addTargets: Array<{ label: string; target: AddTarget; href: string }> = [
  { label: "Add task", target: "task", href: "/tasks" },
  { label: "Add event", target: "event", href: "/calendar" },
  { label: "Add group", target: "group", href: "/groups" }
];

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const weekSelection = normalizeWeekSelection(searchParams?.get("week") ?? null);

  const handleWeekChange = (value: string) => {
    const href = buildWeekHref(pathname, searchParams?.toString() ?? "", value as "current" | "next");
    router.push(href);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-mist-200 bg-white/70 px-4 py-4 shadow-card md:px-8">
      <div className="space-y-1">
        <p className="text-caption uppercase tracking-wide text-ink-400">
          Paxora Parish OS
        </p>
        <h1 className="text-h2">{getPageTitle(pathname)}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-ink-700">
          <span className="sr-only">Week switcher</span>
          <Select value={weekSelection} onChange={(event) => handleWeekChange(event.target.value)}>
            <option value="current">This week</option>
            <option value="next">Next week</option>
          </Select>
        </label>
        <div className="relative">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button type="button">+ Add</Button>
            </DropdownTrigger>
            <DropdownMenu ariaLabel="Add menu">
              {addTargets.map((item) => (
                <DropdownItem key={item.target} asChild>
                  <Link
                    href={buildAddHref(item.href, searchParams?.toString() ?? "", item.target)}
                  >
                    {item.label}
                  </Link>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
