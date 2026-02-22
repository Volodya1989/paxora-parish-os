import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Admin Statistics page — Item 10 analytics UI", () => {
  const metricsPath = path.join(process.cwd(), "lib/queries/admin-metrics.ts");
  const pagePath = path.join(
    process.cwd(),
    "app/[locale]/(app)/admin/statistics/page.tsx"
  );
  const routesPath = path.join(process.cwd(), "lib/navigation/routes.ts");
  const navItemsPath = path.join(process.cwd(), "components/navigation/navItems.ts");
  const enPath = path.join(process.cwd(), "messages/en.json");
  const ukPath = path.join(process.cwd(), "messages/uk.json");

  test("admin-metrics.ts exports getParishEngagementMetrics", () => {
    const source = fs.readFileSync(metricsPath, "utf8");
    assert.match(source, /export async function getParishEngagementMetrics/);
  });

  test("admin-metrics queries cover members, tasks, events, chat, requests", () => {
    const source = fs.readFileSync(metricsPath, "utf8");
    assert.match(source, /prisma\.membership\.count/, "Must query membership count");
    assert.match(source, /prisma\.task\.groupBy/, "Must query task stats by status");
    assert.match(source, /prisma\.event\.count/, "Must query event count");
    assert.match(source, /prisma\.chatMessage\.count/, "Must query chat message count");
    assert.match(source, /prisma\.request\.groupBy/, "Must query request stats");
    assert.match(source, /prisma\.accessRequest\.count/, "Must query pending access requests");
  });

  test("admin statistics page exists and requires admin/shepherd auth", () => {
    const source = fs.readFileSync(pagePath, "utf8");
    assert.match(source, /requireAdminOrShepherd/, "Must require admin or shepherd role");
    assert.match(source, /getParishEngagementMetrics/, "Must call metrics query");
    assert.match(source, /getTranslations/, "Must use i18n translations");
  });

  test("statistics page displays all metric sections", () => {
    const source = fs.readFileSync(pagePath, "utf8");
    assert.match(source, /adminStats\.membersTitle/, "Must show members section");
    assert.match(source, /adminStats\.tasksTitle/, "Must show tasks section");
    assert.match(source, /adminStats\.eventsTitle/, "Must show events section");
    assert.match(source, /adminStats\.chatTitle/, "Must show chat section");
    assert.match(source, /adminStats\.requestsTitle/, "Must show requests section");
  });

  test("statistics page supports range filtering", () => {
    const source = fs.readFileSync(pagePath, "utf8");
    assert.match(source, /allowedRanges/, "Must define allowed time ranges");
    assert.match(source, /name="range"/, "Must have range filter select");
    assert.match(source, /sinceHours/, "Must pass sinceHours to metrics query");
  });

  test("routes.ts includes adminStatistics route", () => {
    const source = fs.readFileSync(routesPath, "utf8");
    assert.match(source, /adminStatistics:\s*"\/admin\/statistics"/);
  });

  test("navItems.ts includes statistics link for admin/shepherd", () => {
    const source = fs.readFileSync(navItemsPath, "utf8");
    assert.match(source, /nav\.statistics/);
    assert.match(source, /routes\.adminStatistics/);
  });

  test("en.json has all adminStats keys", () => {
    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const stats = en.adminStats;
    assert.ok(stats, "adminStats namespace must exist");
    assert.ok(stats.pageTitle, "pageTitle");
    assert.ok(stats.subtitle, "subtitle");
    assert.ok(stats.membersTitle, "membersTitle");
    assert.ok(stats.totalMembers, "totalMembers");
    assert.ok(stats.activeMembers, "activeMembers");
    assert.ok(stats.tasksTitle, "tasksTitle");
    assert.ok(stats.openTasks, "openTasks");
    assert.ok(stats.completedTasks, "completedTasks");
    assert.ok(stats.eventsTitle, "eventsTitle");
    assert.ok(stats.rsvpCount, "rsvpCount");
    assert.ok(stats.chatTitle, "chatTitle");
    assert.ok(stats.messages, "messages");
    assert.ok(stats.requestsTitle, "requestsTitle");
    assert.ok(stats.pendingRequests, "pendingRequests");
  });

  test("uk.json has matching adminStats keys", () => {
    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const uk = JSON.parse(fs.readFileSync(ukPath, "utf8"));

    const enKeys = Object.keys(en.adminStats ?? {}).sort();
    const ukKeys = Object.keys(uk.adminStats ?? {}).sort();
    assert.deepStrictEqual(enKeys, ukKeys, "adminStats keys must match between en and uk");
  });

  test("nav.statistics key exists in both en.json and uk.json", () => {
    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const uk = JSON.parse(fs.readFileSync(ukPath, "utf8"));
    assert.ok(en.nav?.statistics, "en.json must have nav.statistics");
    assert.ok(uk.nav?.statistics, "uk.json must have nav.statistics");
  });
});
