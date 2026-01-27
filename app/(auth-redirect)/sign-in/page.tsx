import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { buildLocalePathname } from "@/lib/i18n/routing";

type SearchParams = Record<string, string | string[] | undefined>;

type SignInRedirectProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

function buildQueryString(searchParams?: SearchParams) {
  if (!searchParams) return "";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined) params.append(key, entry);
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
  const sp = searchParams ? await Promise.resolve(searchParams) : undefined;
  const query = buildQueryString(sp);
  redirect(buildLocalePathname(locale, `/sign-in${query}`));
}
