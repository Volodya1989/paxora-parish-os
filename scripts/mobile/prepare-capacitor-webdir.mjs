import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "out");
mkdirSync(outDir, { recursive: true });

const appUrl = process.env.CAPACITOR_APP_URL ?? "http://localhost:3000";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <title>Paxora Parish Center</title>
  </head>
  <body>
    <noscript>Paxora Parish Center requires JavaScript.</noscript>
    <script>
      window.location.replace(${JSON.stringify(appUrl)});
    </script>
  </body>
</html>`;

writeFileSync(join(outDir, "index.html"), html, "utf8");

const iconSource = join(process.cwd(), "public", "icon.png");
if (existsSync(iconSource)) {
  copyFileSync(iconSource, join(outDir, "icon.png"));
}

console.log(`[mobile] Prepared Capacitor webDir at ./out (redirect shell -> ${appUrl}).`);
