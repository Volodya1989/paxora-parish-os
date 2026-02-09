import { NextResponse } from "next/server";
import { signR2GetUrl } from "@/lib/storage/r2";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;
  const objectKey = key.join("/");

  // Only allow files under the chat/ prefix
  if (!objectKey.startsWith("chat/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const extension = objectKey.split(".").pop()?.toLowerCase() ?? "";
  if (!MIME_TYPES[extension]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = signR2GetUrl({ key: objectKey, expiresInSeconds: 60 * 10 });
    const r2Response = await fetch(url);

    if (!r2Response.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = r2Response.body;
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch image" }, { status: 502 });
  }
}
