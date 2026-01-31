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
  getPageTitleKey,
  normalizeWeekSelection
} from "@/components/header/headerUtils";
import { routes } from "@/lib/navigation/routes";
import { useTranslations } from "@/lib/i18n/provider";
import LanguageSwitcher from "@/components/navigation/LanguageSwitcher";
import { stripLocale } from "@/lib/i18n/routing";

type AddTarget = "task" | "event" | "group";

const addTargets: Array<{ labelKey: string; target: AddTarget; href: string }> = [
  { labelKey: "menu.addServeItem", target: "task", href: routes.serve },
  { labelKey: "menu.addEvent", target: "event", href: routes.calendar },
  { labelKey: "menu.addGroup", target: "group", href: routes.groups }
];

type AppHeaderProps = {
  /** User's parish role for conditional rendering */
  parishRole?: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
};

export function AppHeader({ parishRole }: AppHeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const weekSelection = normalizeWeekSelection(searchParams?.get("week") ?? null);
  const viewMode = searchParams?.get("view") ?? "parishioner";

  // Check user role and view mode
  const isRegularMember = parishRole === "MEMBER" || !parishRole;
  const isParishionerView = viewMode === "parishioner";

  // Hide the admin header for regular members in parishioner view on all pages
  // Each page now has its own welcoming header component
  if (isRegularMember && isParishionerView) {
    return null;
  }

  const handleWeekChange = (value: string) => {
    const href = buildWeekHref(pathname, searchParams?.toString() ?? "", value as "current" | "next");
    router.push(href);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-mist-200 bg-white/70 px-4 py-4 shadow-card md:px-8">
      <div className="space-y-1">
        <p className="text-caption uppercase tracking-wide text-ink-400">
          {t("header.appTitle")}
        </p>
        <h1 className="text-h2">{t(getPageTitleKey(pathname))}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-ink-700">
          <span className="sr-only">{t("header.weekSwitcherLabel")}</span>
          <Select value={weekSelection} onChange={(event) => handleWeekChange(event.target.value)}>
            <option value="current">{t("header.thisWeek")}</option>
            <option value="next">{t("header.nextWeek")}</option>
          </Select>
        </label>
        <div className="relative">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button type="button">{t("header.addButton")}</Button>
            </DropdownTrigger>
            <DropdownMenu ariaLabel={t("menu.addMenuLabel")}>
              {addTargets.map((item) => (
                <DropdownItem key={item.target} asChild>
                  <Link
                    href={buildAddHref(item.href, searchParams?.toString() ?? "", item.target)}
                  >
                    {t(item.labelKey)}
                  </Link>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

export default AppHeader;
