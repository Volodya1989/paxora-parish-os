const PROMPT_COOLDOWN_DAYS = 60;

export type GreetingsPromptState = {
  hasAnyImportantDate: boolean;
  greetingsDoNotAskAgain: boolean;
  greetingsLastPromptedAt: Date | null;
};

export function shouldShowGreetingsPrompt(
  state: GreetingsPromptState,
  now: Date = new Date()
) {
  if (state.hasAnyImportantDate || state.greetingsDoNotAskAgain) {
    return false;
  }

  if (!state.greetingsLastPromptedAt) {
    return true;
  }

  const msSinceLastPrompt = now.getTime() - state.greetingsLastPromptedAt.getTime();
  const cooldownMs = PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  return msSinceLastPrompt >= cooldownMs;
}

export function hasAnyImportantDate({
  birthdayMonth,
  birthdayDay,
  anniversaryMonth,
  anniversaryDay
}: {
  birthdayMonth: number | null;
  birthdayDay: number | null;
  anniversaryMonth: number | null;
  anniversaryDay: number | null;
}) {
  return Boolean(
    (birthdayMonth && birthdayDay) || (anniversaryMonth && anniversaryDay)
  );
}
