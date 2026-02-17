import type { ReactNode } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ContactIcon,
  GlobeIcon,
  HandHeartIcon,
  LayoutGridIcon,
  ListChecksIcon,
  MegaphoneIcon,
  UsersIcon,
  WebsiteIcon
} from "@/components/icons/ParishIcons";

const iconByCode: Record<string, (className?: string) => ReactNode> = {
  TW: (className) => <LayoutGridIcon className={className} />,
  SV: (className) => <HandHeartIcon className={className} />,
  GR: (className) => <UsersIcon className={className} />,
  CA: (className) => <CalendarIcon className={className} />,
  PH: (className) => <WebsiteIcon className={className} />,
  AN: (className) => <MegaphoneIcon className={className} />,
  PR: (className) => <ContactIcon className={className} />,
  RQ: (className) => <ListChecksIcon className={className} />,
  RL: (className) => <CheckCircleIcon className={className} />,
  PE: (className) => <UsersIcon className={className} />,
  PF: (className) => <GlobeIcon className={className} />
};

export function NavIcon({ icon, className, fallbackClassName }: { icon: string; className?: string; fallbackClassName?: string }) {
  const resolved = iconByCode[icon];
  if (resolved) {
    return resolved(className);
  }
  return <span className={fallbackClassName}>{icon}</span>;
}

export default NavIcon;
