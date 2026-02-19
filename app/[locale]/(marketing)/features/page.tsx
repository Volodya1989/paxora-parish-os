import type { Metadata } from "next";
import { buildMarketingMetadata } from "../metadata";

export const metadata: Metadata = buildMarketingMetadata(
  "Features — Paxora Parish OS",
  "Explore This Week, tasks, groups, calendar, requests, and parish hub workflows designed for parish life.",
  "/features"
);

const featureSections = [
  "This Week",
  "Serve/Tasks",
  "Groups/Chat",
  "Calendar/Events",
  "Requests",
  "Parish Hub"
];

export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Features built for parish weekly rhythm</h1>
      <p className="text-ink-700">Each module keeps ownership visible and communication calm across clergy and volunteers.</p>
      <div className="space-y-4">
        {featureSections.map((section) => (
          <section key={section} className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{section}</h2>
            <p className="mt-2 text-sm text-ink-700">TODO: Replace this placeholder with production screenshots and module-specific copy.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
