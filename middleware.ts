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
  "/reset-password"
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
    return NextResponse.next();
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
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"]
};
