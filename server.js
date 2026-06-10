const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 4173;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const stateFile = path.join(dataDir, "app-state.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readState() {
  ensureDataDir();
  if (!fs.existsSync(stateFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}

function writeState(state) {
  ensureDataDir();
  const payload = {
    ...state,
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(stateFile, JSON.stringify(payload, null, 2));
  return payload;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function safeFilePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.normalize(path.join(root, requested));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

async function handleApi(request, response) {
  if (request.url.startsWith("/api/health")) {
    sendJson(response, 200, { ok: true, service: "fleet-technical-oversight" });
    return true;
  }

  if (request.url.startsWith("/api/state") && request.method === "GET") {
    sendJson(response, 200, readState() || {});
    return true;
  }

  if (request.url.startsWith("/api/state") && request.method === "PUT") {
    try {
      const body = await readRequestBody(request);
      const state = JSON.parse(body || "{}");
      if (!Array.isArray(state.reports) || !Array.isArray(state.claims) || !Array.isArray(state.drydockPlans)) {
        sendJson(response, 400, { error: "Invalid state payload" });
        return true;
      }
      sendJson(response, 200, writeState(state));
      return true;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }
  }

  if (request.url.startsWith("/api/")) {
    sendJson(response, 404, { error: "API endpoint not found" });
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  if (await handleApi(request, response)) return;

  const filePath = safeFilePath(request.url);
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        response.writeHead(200, { "Content-Type": contentTypes[".html"] });
        response.end(fallbackContent);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
    });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log(`Fleet Technical Oversight listening on port ${port}`);
  console.log(`State file: ${stateFile}`);
});
