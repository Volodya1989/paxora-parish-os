import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/messages";

function resolveNested(messages: Messages, key: string): string | undefined {
  let current: unknown = messages;
  for (const segment of key.split(".")) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

export function createTranslator(
  locale: Locale,
  messages: Messages,
  fallbackMessages: Messages = getMessages(defaultLocale)
) {
  return (key: string) => {
    const value = resolveNested(messages, key) ?? resolveNested(fallbackMessages, key);
    if (!value) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`Missing translation for ${locale}:${key}`);
      }
      return key;
    }

    return value;
  };
}

export function getTranslator(locale: Locale) {
  const messages = getMessages(locale);
  return createTranslator(locale, messages);
}
