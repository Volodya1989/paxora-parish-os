import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { buildLocalePathname } from "@/lib/i18n/routing";

type SignInRedirectProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildQueryString(searchParams?: SignInRedirectProps["searchParams"]) {
  if (!searchParams) {
    return "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined) {
          params.append(key, entry);
        }
      });
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function SignInRedirect({ searchParams }: SignInRedirectProps) {
  const locale = await getLocaleFromCookies();
  const query = buildQueryString(searchParams);
  redirect(buildLocalePathname(locale, `/sign-in${query}`));
}
