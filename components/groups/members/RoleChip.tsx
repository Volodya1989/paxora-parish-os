import Badge from "@/components/ui/Badge";

type RoleChipProps = {
  role: "LEAD" | "MEMBER" | "ADMIN" | "SHEPHERD";
};

const roleMap: Record<RoleChipProps["role"], { label: string; tone: "neutral" | "success" }> = {
  LEAD: { label: "Coordinator", tone: "success" },
  MEMBER: { label: "Parishioner", tone: "neutral" },
  ADMIN: { label: "Admin", tone: "neutral" },
  SHEPHERD: { label: "Clergy", tone: "neutral" }
};

export default function RoleChip({ role }: RoleChipProps) {
  const config = roleMap[role];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
