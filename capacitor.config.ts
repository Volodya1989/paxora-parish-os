// Capacitor baseline config for mobile wrappers.
// IOS-A1 scope: establish monorepo-level capacitor configuration.

const appUrl = process.env.CAPACITOR_APP_URL ?? "http://localhost:3000";

const capacitorConfig = {
  appId: "com.paxora.parishcenter",
  appName: "Paxora Parish Center",
  webDir: "out",
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith("http://")
  }
};

export default capacitorConfig;
