import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireSuperAdmin } from "@/server/auth/super-admin";
import { listParishSummaries } from "@/lib/queries/super-admin";
import { createParishAsSuperAdmin } from "@/app/actions/super-admin";
import { setActiveParish } from "@/app/actions/parish-switch";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  await requireSuperAdmin(session.user.id);

  const parishes = await listParishSummaries();

  return (
    <div className="space-y-8">
      <header className="rounded-card border border-mist-200 bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Paxora Super Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">Parishes</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Manage parish settings and jump into a parish context when you need to assist local leaders.
        </p>
      </header>

      <section className="rounded-card border border-mist-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink-900">Create a parish</h2>
        <form action={createParishAsSuperAdmin} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ink-700">
            Name
            <input
              name="name"
              required
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
              placeholder="St. Paxora Parish"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Slug
            <input
              name="slug"
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
              placeholder="st-paxora"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Timezone
            <input
              name="timezone"
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
              placeholder="America/Chicago"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Contact email
            <input
              type="email"
              name="contactEmail"
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
              placeholder="office@parish.org"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Contact phone
            <input
              name="contactPhone"
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
              placeholder="(555) 555-5555"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-button bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-button hover:bg-emerald-700"
            >
              Create parish
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">Parish directory</h2>
        {parishes.length === 0 ? (
          <div className="rounded-card border border-dashed border-mist-200 bg-white p-6 text-sm text-ink-600">
            No parishes yet. Create one above to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {parishes.map((parish) => (
              <div
                key={parish.id}
                className="rounded-card border border-mist-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-ink-900">{parish.name}</h3>
                    <p className="text-xs text-ink-500">/{parish.slug}</p>
                  </div>
                  <form action={setActiveParish.bind(null, parish.id)}>
                    <button
                      type="submit"
                      className="rounded-button border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Enter parish
                    </button>
                  </form>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-600">
                  <div>Members: {parish.memberCount}</div>
                  <div>Groups: {parish.groupCount}</div>
                  <div>Events: {parish.eventCount}</div>
                  <div>Announcements: {parish.announcementCount}</div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-ink-500">
                  <span>Timezone: {parish.timezone ?? "Not set"}</span>
                  <span>Contact: {parish.contactEmail ?? "—"}</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={`/super-admin/parishes/${parish.id}`}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Manage parish
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
