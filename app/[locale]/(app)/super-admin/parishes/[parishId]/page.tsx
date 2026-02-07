import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireSuperAdmin } from "@/server/auth/super-admin";
import { getParishDetail } from "@/lib/queries/super-admin";
import { updateParishAsSuperAdmin } from "@/app/actions/super-admin";

export default async function SuperAdminParishDetailPage({
  params
}: {
  params: Promise<{ parishId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  await requireSuperAdmin(session.user.id);

  const { parishId } = await params;
  const parish = await getParishDetail(parishId);

  if (!parish) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-600">Parish not found.</p>
        <Link href="/super-admin" className="text-sm font-semibold text-emerald-700">
          Back to Super Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/super-admin" className="text-sm font-semibold text-emerald-700">
        ← Back to Super Admin
      </Link>
      <div className="rounded-card border border-mist-200 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-semibold text-ink-900">{parish.name}</h1>
        <p className="text-xs text-ink-500">/{parish.slug}</p>
      </div>
      <form
        action={updateParishAsSuperAdmin.bind(null, parish.id)}
        className="rounded-card border border-mist-200 bg-white p-6 shadow-card"
      >
        <h2 className="text-lg font-semibold text-ink-900">Parish settings</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ink-700">
            Name
            <input
              name="name"
              defaultValue={parish.name}
              required
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Slug
            <input
              name="slug"
              defaultValue={parish.slug}
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Timezone
            <input
              name="timezone"
              defaultValue={parish.timezone ?? ""}
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Contact email
            <input
              type="email"
              name="contactEmail"
              defaultValue={parish.contactEmail ?? ""}
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Contact phone
            <input
              name="contactPhone"
              defaultValue={parish.contactPhone ?? ""}
              className="mt-1 w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-800 focus-ring"
            />
          </label>
        </div>
        <div className="mt-6">
          <button
            type="submit"
            className="rounded-button bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-button hover:bg-emerald-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
