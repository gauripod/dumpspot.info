// Local dev server: static files + the same /sb and /tiles proxy as the Netlify edge function.
// Keys come from the environment (DB_URL, DB_KEY, CARTER_KEYS) or a local, gitignored config.js.
// Usage: node scripts/dev.mjs [port]
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = +process.argv[2] || 8080;

async function keys() {
  const k = { DB_URL: process.env.DB_URL, DB_KEY: process.env.DB_KEY, CARTER_KEYS: process.env.CARTER_KEYS };
  try {
    const txt = await readFile(join(root, "config.js"), "utf8");
    for (const name of Object.keys(k)) {
      const m = txt.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`));
      if (!k[name] && m) k[name] = m[1];
    }
  } catch {}
  return k;
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".webp": "image/webp" };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const K = await keys();
    try {
      if (url.pathname.startsWith("/sb/")) {
        if (!K.DB_URL || !K.DB_KEY) return res.writeHead(503).end("Database is not configured");
        const headers = { ...req.headers, apikey: K.DB_KEY, authorization: `Bearer ${K.DB_KEY}` };
        delete headers.host;
        delete headers["content-length"];
        const body = ["GET", "HEAD"].includes(req.method) ? undefined : req;
        const up = await fetch(K.DB_URL.replace(/\/$/, "") + "/" + url.pathname.slice(4) + url.search, { method: req.method, headers, body, duplex: body ? "half" : undefined });
        const h = Object.fromEntries(up.headers);
        delete h["content-encoding"];
        delete h["content-length"];
        delete h["set-cookie"];
        res.writeHead(up.status, h);
        return res.end(Buffer.from(await up.arrayBuffer()));
      }
      const m = url.pathname.match(/^\/tiles\/(voyager|dark_all)\/(\d+)\/(\d+)\/(\d+)\.png$/);
      if (m) {
        const up = await fetch(`https://basemaps.cartocdn.com/rastertiles/${m[1]}/${m[2]}/${m[3]}/${m[4]}.png?key=${K.CARTER_KEYS || ""}`);
        res.writeHead(up.status, { "content-type": "image/png" });
        return res.end(Buffer.from(await up.arrayBuffer()));
      }
      let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      let file = join(root, p);
      if (!file.startsWith(root)) return res.writeHead(403).end();
      let s = await stat(file).catch(() => null);
      if (s?.isDirectory()) (file = join(file, "index.html")), (s = await stat(file).catch(() => null));
      if (!s && !extname(p)) (file = join(root, "index.html")), (s = true); // SPA paths like /study
      if (!s) return res.writeHead(404).end("Not found");
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(await readFile(file));
    } catch (e) {
      res.writeHead(502).end(String(e.message || e));
    }
  })
  .listen(port, () => console.log(`DumpSpot dev server → http://localhost:${port}`));
