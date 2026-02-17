import Button from "@/components/ui/Button";
import { useTranslations } from "@/lib/i18n/provider";

type EventFormProps = {
  action: (formData: FormData) => Promise<void>;
  weekId: string;
  minDateTime: string;
  maxDateTime: string;
  defaultStartsAt: string;
  defaultEndsAt: string;
};

export default function EventForm({
  action,
  weekId,
  minDateTime,
  maxDateTime,
  defaultStartsAt,
  defaultEndsAt
}: EventFormProps) {
  const t = useTranslations();
  return (
    <form className="mt-4 space-y-4" action={action}>
      <input type="hidden" name="weekId" value={weekId} />
      <label className="block text-sm text-ink-700">
        {t("serveEventForm.title")}
        <input
          className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
          type="text"
          name="title"
          required
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-ink-700">
          {t("serveEventForm.startsAt")}
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="datetime-local"
            name="startsAt"
            min={minDateTime}
            max={maxDateTime}
            defaultValue={defaultStartsAt}
            required
          />
        </label>
        <label className="block text-sm text-ink-700">
          {t("serveEventForm.endsAt")}
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="datetime-local"
            name="endsAt"
            min={minDateTime}
            max={maxDateTime}
            defaultValue={defaultEndsAt}
            required
          />
        </label>
      </div>
      <label className="block text-sm text-ink-700">
        {t("serveEventForm.location")}
        <input
          className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
          type="text"
          name="location"
        />
      </label>
      <p className="text-xs text-ink-500">
        {t("serveEventForm.contextNote")}
      </p>
      <Button type="submit">{t("serveEventForm.createEvent")}</Button>
    </form>
  );
}
