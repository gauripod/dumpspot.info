"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const ROOT = __dirname;

// MIME types 
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// SPA frontend routes (serve index.html for each) 
const SPA_ROUTES = new Set(["/", "/report", "/reports"]);

// In-memory report store (dev only) 
const apiReports = [];

// Helpers

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function genId() {
  const d = new Date();
  const dt = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  const tm = [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `DS-${dt}-${tm}-${hex}`;
}

function validateReport(body) {
  const errors = [];
  const requiredStrings = ["reporter", "state", "area", "specific"];
  for (const k of requiredStrings) {
    if (!body[k] || typeof body[k] !== "string" || !body[k].trim()) {
      errors.push(`"${k}" is required and must be a non-empty string`);
    }
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (body.lat === undefined || body.lat === null || isNaN(lat)) {
    errors.push('"lat" must be a valid number');
  } else if (lat < -90 || lat > 90) {
    errors.push('"lat" must be between -90 and 90');
  }
  if (body.lng === undefined || body.lng === null || isNaN(lng)) {
    errors.push('"lng" must be a valid number');
  } else if (lng < -180 || lng > 180) {
    errors.push('"lng" must be between -180 and 180');
  }
  return errors;
}

function serveFile(res, filePath) {
  // Guard against directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403 Forbidden");
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": mime,
      // In dev, never cache HTML/JS/CSS so routing changes are always picked up.
      "Cache-Control": [".html", ".js", ".css"].includes(ext)
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=3600",
    });
    res.end(data);
  });
}

function serveIndex(res) {
  serveFile(res, path.join(ROOT, "index.html"));
}

// Request handler 
const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request");
    return;
  }

  const method = req.method.toUpperCase();

  // Global CORS headers (development only)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/reports 
  if (pathname === "/api/reports" && method === "GET") {
    sendJSON(res, 200, { data: apiReports, count: apiReports.length });
    return;
  }

  // POST /api/reports
  if (pathname === "/api/reports" && method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJSON(res, 400, { error: "Invalid JSON in request body" });
      return;
    }

    const errors = validateReport(body);
    if (errors.length) {
      sendJSON(res, 422, { error: "Validation failed", details: errors });
      return;
    }

    const report = {
      id: genId(),
      reporter: String(body.reporter).trim(),
      state: String(body.state).trim(),
      area: String(body.area).trim(),
      specific: String(body.specific).trim(),
      type: Array.isArray(body.type) ? body.type : [],
      cats: Array.isArray(body.cats) ? body.cats : [],
      sev: Array.isArray(body.sev) ? body.sev : [],
      notes: body.notes ? String(body.notes).trim() : "",
      lat: Number(body.lat),
      lng: Number(body.lng),
      digipin: body.digipin || null,
      pluscode: body.pluscode || null,
      ts: new Date().toISOString(),
    };
    apiReports.unshift(report);
    sendJSON(res, 201, { data: report });
    return;
  }

  // Unsupported method on /api/reports
  if (pathname === "/api/reports") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    sendJSON(res, 405, { error: "Method Not Allowed" });
    return;
  }

  // Unknown /api/* route 
  if (pathname.startsWith("/api/")) {
    sendJSON(res, 404, { error: `API endpoint not found: ${pathname}` });
    return;
  }

  // SPA frontend routes 
  if (SPA_ROUTES.has(pathname)) {
    serveIndex(res);
    return;
  }

  // Static assets 
  serveFile(res, path.join(ROOT, pathname));
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nError: port ${PORT} is already in use.`);
    console.error(`Run: kill $(lsof -ti:${PORT}) and try again.\n`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nDumpSpot dev server → http://localhost:${PORT}\n`);
  console.log("  Frontend routes (SPA):");
  console.log("    GET /             → feed page (map view)");
  console.log("    GET /report       → report submission form");
  console.log("    GET /reports      → feed page (list view)");
  console.log("\n  REST API:");
  console.log("    GET  /api/reports → list all reports");
  console.log("    POST /api/reports → create a report");
  console.log();
});
