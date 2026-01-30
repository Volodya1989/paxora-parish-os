import Badge from "@/components/ui/Badge";

type RoleChipProps = {
  role: "COORDINATOR" | "PARISHIONER" | "ADMIN" | "SHEPHERD" | "MEMBER";
};

const roleMap: Record<RoleChipProps["role"], { label: string; tone: "neutral" | "success" }> = {
  COORDINATOR: { label: "Coordinator", tone: "success" },
  PARISHIONER: { label: "Parishioner", tone: "neutral" },
  MEMBER: { label: "Parishioner", tone: "neutral" },
  ADMIN: { label: "Admin", tone: "neutral" },
  SHEPHERD: { label: "Clergy", tone: "neutral" }
};

export default function RoleChip({ role }: RoleChipProps) {
  const config = roleMap[role];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
