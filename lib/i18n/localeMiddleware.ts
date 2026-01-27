import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, localeCookie } from "@/lib/i18n/config";
import {
  buildLocalePathname,
  detectLocaleFromHeader,
  getLocaleFromCookie,
  getLocalePrefix
} from "@/lib/i18n/routing";

export function handleLocaleRouting(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefix = getLocalePrefix(pathname);

  if (prefix === "invalid") {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  if (prefix) {
    const response = NextResponse.next();
    if (request.cookies.get(localeCookie)?.value !== prefix) {
      response.cookies.set(localeCookie, prefix);
    }
    return response;
  }

  const cookieLocale = getLocaleFromCookie(request.cookies.get(localeCookie)?.value ?? null);
  const headerLocale = detectLocaleFromHeader(request.headers.get("accept-language"));
  const locale = cookieLocale ?? headerLocale ?? defaultLocale;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = buildLocalePathname(locale, pathname);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(localeCookie, locale);
  return response;
}
