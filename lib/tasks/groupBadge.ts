const GROUP_BADGE_PALETTE = [
  "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
  "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200",
  "bg-fuchsia-100 text-fuchsia-800 ring-1 ring-fuchsia-200",
  "bg-teal-100 text-teal-800 ring-1 ring-teal-200",
  "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTaskGroupBadgeClass(groupKey: string) {
  if (!groupKey) {
    return GROUP_BADGE_PALETTE[0];
  }

  const paletteIndex = hashString(groupKey) % GROUP_BADGE_PALETTE.length;
  return GROUP_BADGE_PALETTE[paletteIndex] ?? GROUP_BADGE_PALETTE[0];
}

export function truncateGroupBadgeLabel(groupName: string, maxCharacters = 10) {
  const normalized = groupName.trim();
  if (normalized.length <= maxCharacters) {
    return normalized;
  }

  return `${normalized.slice(0, maxCharacters)}…`;
}
