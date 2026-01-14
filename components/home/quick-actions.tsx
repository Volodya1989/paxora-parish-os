import Link from "next/link";
import Card from "@/components/ui/Card";

const actions = [
  {
    title: "New Task",
    description: "Capture the next to-do for your ministry.",
    href: "/tasks?create=task"
  },
  {
    title: "New Announcement",
    description: "Share a parish update or reminder.",
    href: "/announcements?new=1"
  }
];

export default function QuickActions() {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-h3">Quick actions</h3>
          <p className="text-xs text-ink-400">Jump in and keep things moving.</p>
        </div>
        <div className="space-y-3">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex items-start justify-between gap-3 rounded-card border border-mist-200 bg-white px-4 py-3 text-left transition hover:border-mist-100 hover:bg-mist-50 focus-ring"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink-900">{action.title}</p>
                <p className="text-xs text-ink-500">{action.description}</p>
              </div>
              <span className="text-lg text-ink-300">→</span>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
