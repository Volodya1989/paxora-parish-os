export function getAppUrl() {
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return appUrl.replace(/\/$/, "");
}
