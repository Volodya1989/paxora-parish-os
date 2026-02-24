import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { getGreetingCandidatesForParish } from "@/lib/email/greetingCandidates";
import { getParishLocalDateParts } from "@/lib/email/greetingSchedule";
import { isMissingColumnError } from "@/lib/prisma/errors";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import GreetingsConfig from "@/components/automation/GreetingsConfig";
import { ZapIcon } from "@/components/icons/ParishIcons";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslations } from "@/lib/i18n/server";

export default async function AutomationPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslations(locale);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const parishId = session.user.activeParishId;

  let parish: {
    name: string;
    timezone: string;
    logoUrl: string | null;
    greetingsEnabled: boolean;
    birthdayGreetingTemplate: string | null;
    anniversaryGreetingTemplate: string | null;
    greetingsSendHourLocal: number;
    greetingsSendMinuteLocal: number;
  } | null = null;

  try {
    parish = await prisma.parish.findUnique({
      where: { id: parishId },
      select: {
        name: true,
        timezone: true,
        logoUrl: true,
        greetingsEnabled: true,
        birthdayGreetingTemplate: true,
        anniversaryGreetingTemplate: true,
        greetingsSendHourLocal: true,
        greetingsSendMinuteLocal: true
      }
    });
  } catch (error) {
    if (isMissingColumnError(error, "Parish.greetingsEnabled")) {
      try {
        const fallback = await prisma.parish.findUnique({
          where: { id: parishId },
          select: {
            name: true,
            timezone: true,
            logoUrl: true,
            birthdayGreetingTemplate: true,
            anniversaryGreetingTemplate: true,
            greetingsSendHourLocal: true,
            greetingsSendMinuteLocal: true
          }
        });
        parish = fallback
          ? { ...fallback, greetingsEnabled: true }
          : null;
      } catch (innerError) {
        if (!isMissingColumnError(innerError, "Parish.greetingsSendHourLocal")) {
          throw innerError;
        }
        const minimal = await prisma.parish.findUnique({
          where: { id: parishId },
          select: {
            name: true,
            timezone: true,
            logoUrl: true,
            birthdayGreetingTemplate: true,
            anniversaryGreetingTemplate: true
          }
        });
        parish = minimal
          ? {
              ...minimal,
              greetingsEnabled: true,
              greetingsSendHourLocal: 9,
              greetingsSendMinuteLocal: 0
            }
          : null;
      }
    } else if (isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      const fallback = await prisma.parish.findUnique({
        where: { id: parishId },
        select: {
          name: true,
          timezone: true,
          logoUrl: true,
          birthdayGreetingTemplate: true,
          anniversaryGreetingTemplate: true
        }
      });
      parish = fallback
        ? {
            ...fallback,
            greetingsEnabled: true,
            greetingsSendHourLocal: 9,
            greetingsSendMinuteLocal: 0
          }
        : null;
    } else {
      throw error;
    }
  }

  if (!parish) {
    throw new Error("Parish not found");
  }

  const sendTimeLocal = `${String(parish.greetingsSendHourLocal).padStart(2, "0")}:${String(parish.greetingsSendMinuteLocal).padStart(2, "0")}`;

  const now = new Date();
  const timezone = parish.timezone || "UTC";
  const { month, day, dateKey } = getParishLocalDateParts(now, timezone);

  const { summary } = await getGreetingCandidatesForParish({
    prisma,
    parishId,
    month,
    day,
    dateKey
  });

  const emailsPlannedToday = summary.dateMatchedMemberships;

  const emailsSentToday = await prisma.greetingEmailLog.count({
    where: {
      parishId,
      dateKey
    }
  });

  const latestGreetingSend = await prisma.emailLog.findFirst({
    where: {
      parishId,
      template: { in: ["birthdayGreeting", "anniversaryGreeting"] },
      status: "SENT",
      sentAt: { not: null }
    },
    select: { sentAt: true },
    orderBy: { sentAt: "desc" }
  });

  return (
    <ParishionerPageLayout
      pageTitle={t("automation.title")}
      parishName={parish.name}
      parishLogoUrl={parish.logoUrl}
      subtitle={t("automation.subtitle")}
      gradientClass="from-violet-600 via-violet-500 to-fuchsia-500"
      icon={<ZapIcon className="h-6 w-6 text-white" />}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 overflow-x-hidden pb-2 md:space-y-5">
        <GreetingsConfig
          parishId={parishId}
          parishName={parish.name}
          parishTimezone={parish.timezone}
          logoUrl={parish.logoUrl}
          greetingsEnabled={parish.greetingsEnabled}
          birthdayGreetingTemplate={parish.birthdayGreetingTemplate}
          anniversaryGreetingTemplate={parish.anniversaryGreetingTemplate}
          greetingsSendTimeLocal={sendTimeLocal}
          emailsPlannedToday={emailsPlannedToday}
          emailsSentToday={emailsSentToday}
          latestGreetingSentAt={latestGreetingSend?.sentAt?.toISOString() ?? null}
        />
      </div>
    </ParishionerPageLayout>
  );
}
