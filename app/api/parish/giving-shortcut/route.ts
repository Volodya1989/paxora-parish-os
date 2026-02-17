import { NextResponse } from "next/server";
import { listParishHubItemsForMember } from "@/server/actions/parish-hub";

export async function GET() {
  try {
    const items = await listParishHubItemsForMember();
    const givingItem = items.find((item) => item.icon === "GIVING");

    if (!givingItem) {
      return NextResponse.json({ shortcut: null });
    }

    const href = givingItem.targetType === "EXTERNAL"
      ? givingItem.targetUrl
      : givingItem.internalRoute;

    if (!href) {
      return NextResponse.json({ shortcut: null });
    }

    return NextResponse.json({
      shortcut: {
        href,
        targetType: givingItem.targetType
      }
    });
  } catch {
    return NextResponse.json({ shortcut: null });
  }
}
