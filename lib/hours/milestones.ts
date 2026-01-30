export type MilestoneTier = "NONE" | "BRONZE" | "SILVER" | "GOLD";

type MilestoneInput = {
  ytdHours: number;
  bronzeHours: number;
  silverHours: number;
  goldHours: number;
};

export function getMilestoneTier({ ytdHours, bronzeHours, silverHours, goldHours }: MilestoneInput) {
  if (ytdHours >= goldHours) {
    return "GOLD";
  }
  if (ytdHours >= silverHours) {
    return "SILVER";
  }
  if (ytdHours >= bronzeHours) {
    return "BRONZE";
  }
  return "NONE";
}
