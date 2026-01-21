export type DigestTask = {
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
};

export type DigestEvent = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
};

export type DigestStatus = "DRAFT" | "PUBLISHED";

const sortByTitle = <T extends { title: string }>(items: T[]) =>
  [...items].sort((a, b) => a.title.localeCompare(b.title));

export function buildDigestSummary({
  tasks,
  events
}: {
  tasks: DigestTask[];
  events: DigestEvent[];
}) {
  const taskLines = sortByTitle(tasks).map(
    (task) => `- [${task.status === "DONE" ? "x" : " "}] ${task.title}`
  );
  const eventLines = sortByTitle(events).map((event) => {
    const window = `${event.startsAt.toISOString()} → ${event.endsAt.toISOString()}`;
    const location = event.location ? ` (${event.location})` : "";
    return `- ${event.title}${location} · ${window}`;
  });

  const tasksSection = taskLines.length ? taskLines : ["- None"];
  const eventsSection = eventLines.length ? eventLines : ["- None"];

  return ["Serve", ...tasksSection, "", "Events", ...eventsSection].join("\n");
}

export function buildDigestContent({
  tasks,
  events
}: {
  tasks: DigestTask[];
  events: DigestEvent[];
}) {
  const taskLines = sortByTitle(tasks).map(
    (task) => `- [${task.status === "DONE" ? "x" : " "}] ${task.title}`
  );
  const eventLines = [...events]
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.title.localeCompare(b.title))
    .map((event) => {
      const start = event.startsAt.toISOString().slice(11, 16);
      const end = event.endsAt.toISOString().slice(11, 16);
      const location = event.location ? ` @ ${event.location}` : "";
      return `- ${event.title} (${start}-${end})${location}`;
    });

  return ["Serve", ...taskLines, "", "Events", ...eventLines].join("\n");
}

export function assertDigestTransition(current: DigestStatus, next: DigestStatus) {
  if (current === "PUBLISHED" && next === "DRAFT") {
    throw new Error("Cannot revert a published digest to draft");
  }
}

export function transitionDigestStatus(current: DigestStatus, next: DigestStatus) {
  assertDigestTransition(current, next);
  return next;
}
