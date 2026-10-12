// Save server of the photo admin (http://localhost:3001/admin while `npm run dev` runs).
// Run with `npm run admin`. Listens on 127.0.0.1 only and writes exactly one file:
// src/content/photo-framing.json. Never part of the static export.
import { rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Plain TypeScript modules, loaded through Node's built-in type stripping (Node ≥ 22.18).
import { PHOTO_ADMIN_PORT, sanitizePhotoFraming } from "../src/lib/photo-framing.ts";

const HOST = "127.0.0.1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "src", "content", "photo-framing.json");
const MAX_BODY = 1024;

/** The admin page runs on a local dev server (any port); nothing else may call us from a browser. */
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/;
/** Rejects DNS-rebinding requests, whose Host header names another domain. */
const LOCAL_HOSTS = new Set([`127.0.0.1:${PHOTO_ADMIN_PORT}`, `localhost:${PHOTO_ADMIN_PORT}`]);

function send(res, status, body, origin) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Vary"] = "Origin";
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      // Over the limit: stop buffering (the rest is discarded) and answer 413.
      if (size > MAX_BODY) return reject(Object.assign(new Error("Body too large."), { status: 413 }));
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (!LOCAL_HOSTS.has(req.headers.host ?? "")) return send(res, 403, { error: "Forbidden host." });
  if (origin !== undefined && !LOCAL_ORIGIN.test(origin)) return send(res, 403, { error: "Forbidden origin." });
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") return send(res, 204, undefined, origin);
  if (url.pathname === "/health" && req.method === "GET") return send(res, 200, { ok: true }, origin);
  if (url.pathname !== "/photo-framing") return send(res, 404, { error: "Not found." }, origin);
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." }, origin);
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
    return send(res, 415, { error: "Expected application/json." }, origin);
  }

  try {
    let input;
    try {
      input = JSON.parse(await readBody(req));
    } catch (err) {
      if (err?.status) throw err;
      return send(res, 400, { error: "Invalid JSON." }, origin);
    }
    const result = sanitizePhotoFraming(input);
    if (!result.ok) return send(res, 400, { error: result.error }, origin);
    // Write a temp file and rename it, so the dev server never reads a half-written JSON.
    const tmp = `${TARGET}.admin-tmp`;
    await writeFile(tmp, `${JSON.stringify(result.value, null, 2)}\n`, "utf8");
    await rename(tmp, TARGET);
    console.log(`Saved ${path.relative(ROOT, TARGET)}: ${JSON.stringify(result.value)}`);
    return send(res, 200, { ok: true, framing: result.value }, origin);
  } catch (err) {
    const status = err?.status ?? 500;
    if (status === 500) console.error(err);
    return send(res, status, { error: status === 413 ? "Body too large." : "Could not save." }, origin);
  }
});

server.on("error", (err) => {
  console.error(err.code === "EADDRINUSE" ? `Port ${PHOTO_ADMIN_PORT} is already in use.` : err);
  process.exit(1);
});

server.listen(PHOTO_ADMIN_PORT, HOST, () => {
  console.log(`Photo admin save server on http://${HOST}:${PHOTO_ADMIN_PORT} (writes ${path.relative(ROOT, TARGET)})`);
  console.log("Open http://localhost:3001/admin with `npm run dev -- -p 3001` running. Ctrl+C to stop.");
});
