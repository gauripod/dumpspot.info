// Read-only health check for the DumpSpot database. Never writes anything.
// Usage: node scripts/check-db.mjs            (keys from env DB_URL/DB_KEY or the local config.js)
import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";

const env = { DB_URL: process.env.DB_URL, DB_KEY: process.env.DB_KEY };
try {
  const txt = await readFile(new URL("../config.js", import.meta.url), "utf8");
  for (const k of Object.keys(env)) env[k] ||= txt.match(new RegExp(`${k}\\s*=\\s*["']([^"']+)["']`))?.[1];
} catch {}

const ok = (m) => console.log("  ok   " + m), bad = (m) => (console.log("  FAIL " + m), (process.exitCode = 1));
console.log("DumpSpot database check");
if (!env.DB_URL || !env.DB_KEY) {
  bad("DB_URL or DB_KEY is not set");
  process.exit();
}
const base = env.DB_URL.replace(/\/$/, ""), host = new URL(base).host;
const H = { apikey: env.DB_KEY, authorization: `Bearer ${env.DB_KEY}` };

try {
  await lookup(host);
  ok(`${host} resolves`);
} catch {
  bad(`${host} does not resolve. Supabase pauses free projects after ~7 days without activity, and a paused project has no address. Open supabase.com/dashboard, find the project marked Paused and click Resume. If it is gone, create a new project, run scripts/schema.sql and update DB_URL/DB_KEY.`);
  process.exit();
}

for (const [name, path] of [
  ["reports table", "/rest/v1/reports?select=id,ts&order=ts.desc&limit=1"],
  ["report_photos table", "/rest/v1/report_photos?select=report_id&limit=1"],
]) {
  try {
    const r = await fetch(base + path, { headers: { ...H, prefer: "count=exact" } });
    const n = r.headers.get("content-range")?.split("/")[1];
    r.ok ? ok(`${name} readable${n ? `, ${n} rows` : ""}`) : bad(`${name}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
  } catch (e) {
    bad(`${name}: ${e.message}`);
  }
}
try {
  const r = await fetch(base + "/storage/v1/bucket/report-photos", { headers: H });
  r.ok ? ok("report-photos bucket exists") : bad(`report-photos bucket: HTTP ${r.status}`);
} catch (e) {
  bad("storage: " + e.message);
}
