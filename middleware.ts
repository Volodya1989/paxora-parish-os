import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { handleLocaleRouting } from "@/lib/i18n/localeMiddleware";
import { stripLocale } from "@/lib/i18n/routing";

const publicPaths = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/post-login",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite/parish"
]);

function isPublicPath(pathname: string) {
  return publicPaths.has(stripLocale(pathname));
}

const authMiddleware = withAuth(
  (request: NextRequest) => {
    const localeResponse = handleLocaleRouting(request);
    if (localeResponse) {
      return localeResponse;
    }

    // Forward the real pathname to server components so layouts can reliably
    // detect the current route (headers like referer are stale on first load).
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", request.nextUrl.pathname);

    return NextResponse.next({ request: { headers: requestHeaders } });
  },
  {
    callbacks: {
      authorized: ({ token, req }) => Boolean(token) || isPublicPath(req.nextUrl.pathname)
    },
    pages: {
      signIn: "/sign-in"
    }
  }
);

export default authMiddleware;

export const config = {
  matcher: ["/((?!api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|sw\\.js|manifest\\.webmanifest|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)"]
};
