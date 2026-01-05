import Button from "@/components/ui/Button";

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
  return (
    <form className="mt-4 space-y-4" action={action}>
      <input type="hidden" name="weekId" value={weekId} />
      <label className="block text-sm text-ink-700">
        Title
        <input
          className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
          type="text"
          name="title"
          required
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-ink-700">
          Starts at
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
          Ends at
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
        Location (optional)
        <input
          className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
          type="text"
          name="location"
        />
      </label>
      <p className="text-xs text-ink-500">
        Events are context-only and stay within this week’s schedule.
      </p>
      <Button type="submit">Create event</Button>
    </form>
  );
}
