// Read-only snapshot of every report and photo row to backup/<timestamp>.json.
// Run before deploying schema or app changes:  DB_URL=… DB_KEY=… node scripts/backup.mjs
// (falls back to a local, gitignored config.js). Never writes to the database.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
let { DB_URL, DB_KEY } = process.env;
if (!DB_URL || !DB_KEY) {
  try {
    const t = await readFile(join(root, "config.js"), "utf8");
    DB_URL ||= t.match(/DB_URL\s*=\s*["']([^"']+)/)?.[1];
    DB_KEY ||= t.match(/DB_KEY\s*=\s*["']([^"']+)/)?.[1];
  } catch {}
}
if (!DB_URL || !DB_KEY) {
  console.error("Set DB_URL and DB_KEY.");
  process.exit(1);
}
const h = { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` };
const get = async (path) => {
  const r = await fetch(`${DB_URL.replace(/\/$/, "")}/rest/v1/${path}`, { headers: h });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
};
const reports = await get("reports?select=*&order=ts.asc");
const photos = await get("report_photos?select=*");
await mkdir(join(root, "backup"), { recursive: true });
const file = join(root, "backup", `dumpspot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await writeFile(file, JSON.stringify({ at: new Date().toISOString(), reports, report_photos: photos }, null, 2));
console.log(`Saved ${reports.length} reports and ${photos.length} photo rows → ${file}`);
