const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = process.env.PORT || 4173;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const stateFile = path.join(dataDir, "app-state.json");
const usersFile = path.join(dataDir, "users.json");
const sessions = new Map();

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

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedVessels: user.assignedVessels || []
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function readUsers() {
  ensureDataDir();
  if (!fs.existsSync(usersFile)) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@fleet.local";
    const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const initialUsers = [
      {
        id: crypto.randomUUID(),
        name: "System Admin",
        email: adminEmail.toLowerCase(),
        role: "admin",
        assignedVessels: [],
        passwordHash: hashPassword(adminPassword),
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(usersFile, JSON.stringify(initialUsers, null, 2));
  }
  return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function resetFlagEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function ensureBootstrapAdmin() {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");
  const shouldResetPassword = resetFlagEnabled(process.env.RESET_ADMIN_PASSWORD);
  if (!adminEmail) return;

  const users = readUsers();
  let changed = false;
  let admin = users.find((user) => String(user.email || "").toLowerCase() === adminEmail);

  if (!admin) {
    admin = {
      id: crypto.randomUUID(),
      name: "System Admin",
      email: adminEmail,
      role: "admin",
      assignedVessels: [],
      passwordHash: hashPassword(adminPassword || "ChangeMe123!"),
      createdAt: new Date().toISOString()
    };
    users.push(admin);
    changed = true;
  }

  if (admin.role !== "admin") {
    admin.role = "admin";
    changed = true;
  }

  if (shouldResetPassword) {
    if (adminPassword.length < 8) {
      console.warn("RESET_ADMIN_PASSWORD was requested, but ADMIN_PASSWORD is shorter than 8 characters. Password was not changed.");
    } else {
      admin.passwordHash = hashPassword(adminPassword);
      admin.passwordUpdatedAt = new Date().toISOString();
      changed = true;
    }
  }

  if (changed) {
    writeUsers(users);
    console.log(`Bootstrap admin ready: ${adminEmail}${shouldResetPassword ? " (password reset requested)" : ""}`);
  }
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

function normalizedAssignedVessels(user) {
  return [...new Set((user?.assignedVessels || []).map((name) => String(name).trim()).filter(Boolean))];
}

function userCanAccessVessel(user, vesselName) {
  return user?.role === "admin" || normalizedAssignedVessels(user).includes(String(vesselName || ""));
}

function filterStateForUser(state, user) {
  if (!state) return {};
  if (user.role === "admin") return state;
  const filterItems = (items) => (Array.isArray(items) ? items.filter((item) => userCanAccessVessel(user, item.vessel)) : []);
  return {
    reports: filterItems(state.reports),
    claims: filterItems(state.claims),
    drydockPlans: filterItems(state.drydockPlans),
    submittedReports: filterItems(state.submittedReports),
    savedAt: state.savedAt
  };
}

function mergeRestrictedItems(existingItems, incomingItems, user) {
  const assigned = new Set(normalizedAssignedVessels(user));
  const incoming = Array.isArray(incomingItems) ? incomingItems : [];
  if (incoming.some((item) => !assigned.has(String(item.vessel || "")))) {
    throw new Error("State contains a vessel that is not assigned to this user");
  }
  const preserved = (Array.isArray(existingItems) ? existingItems : []).filter((item) => !assigned.has(String(item.vessel || "")));
  return [...preserved, ...incoming];
}

function mergeStateForUser(existingState, incomingState, user) {
  if (user.role === "admin") return incomingState;
  const existing = existingState || {};
  return {
    ...existing,
    reports: mergeRestrictedItems(existing.reports, incomingState.reports, user),
    claims: mergeRestrictedItems(existing.claims, incomingState.claims, user),
    drydockPlans: mergeRestrictedItems(existing.drydockPlans, incomingState.drydockPlans, user),
    submittedReports: mergeRestrictedItems(existing.submittedReports, incomingState.submittedReports, user)
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function getCookie(request, name) {
  const cookies = String(request.headers.cookie || "").split(";").map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function setSessionCookie(response, sessionId) {
  response.setHeader("Set-Cookie", `fto_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", "fto_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function currentUser(request) {
  const sessionId = getCookie(request, "fto_session");
  const userId = sessions.get(sessionId);
  if (!userId) return null;
  return readUsers().find((user) => user.id === userId) || null;
}

function requireUser(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Sign in required" });
    return null;
  }
  return user;
}

function requireAdmin(request, response) {
  const user = requireUser(request, response);
  if (!user) return null;
  if (user.role !== "admin") {
    sendJson(response, 403, { error: "Admin access required" });
    return null;
  }
  return user;
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
  const urlPath = request.url.split("?")[0];

  if (request.url.startsWith("/api/health")) {
    sendJson(response, 200, { ok: true, service: "fleet-technical-oversight" });
    return true;
  }

  if (request.url.startsWith("/api/auth/me")) {
    sendJson(response, 200, { user: publicUser(currentUser(request)) });
    return true;
  }

  if (request.url.startsWith("/api/auth/login") && request.method === "POST") {
    try {
      const body = JSON.parse(await readRequestBody(request) || "{}");
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = readUsers().find((item) => item.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendJson(response, 401, { error: "Invalid email or password" });
        return true;
      }
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, user.id);
      setSessionCookie(response, sessionId);
      sendJson(response, 200, { user: publicUser(user) });
      return true;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }
  }

  if (request.url.startsWith("/api/auth/logout") && request.method === "POST") {
    const sessionId = getCookie(request, "fto_session");
    sessions.delete(sessionId);
    clearSessionCookie(response);
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (urlPath === "/api/auth/change-password" && request.method === "POST") {
    const signedInUser = requireUser(request, response);
    if (!signedInUser) return true;
    try {
      const body = JSON.parse(await readRequestBody(request) || "{}");
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 8) {
        sendJson(response, 400, { error: "New password must be at least 8 characters" });
        return true;
      }
      const users = readUsers();
      const user = users.find((item) => item.id === signedInUser.id);
      if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        sendJson(response, 401, { error: "Current password is incorrect" });
        return true;
      }
      user.passwordHash = hashPassword(newPassword);
      user.passwordUpdatedAt = new Date().toISOString();
      writeUsers(users);
      sendJson(response, 200, { ok: true });
      return true;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }
  }

  const resetPasswordMatch = urlPath.match(/^\/api\/users\/([^/]+)\/reset-password$/);
  if (resetPasswordMatch && request.method === "POST") {
    if (!requireAdmin(request, response)) return true;
    try {
      const body = JSON.parse(await readRequestBody(request) || "{}");
      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 8) {
        sendJson(response, 400, { error: "New password must be at least 8 characters" });
        return true;
      }
      const userId = decodeURIComponent(resetPasswordMatch[1]);
      const users = readUsers();
      const user = users.find((item) => item.id === userId);
      if (!user) {
        sendJson(response, 404, { error: "User not found" });
        return true;
      }
      user.passwordHash = hashPassword(newPassword);
      user.passwordUpdatedAt = new Date().toISOString();
      writeUsers(users);
      for (const [sessionId, sessionUserId] of sessions.entries()) {
        if (sessionUserId === user.id) sessions.delete(sessionId);
      }
      sendJson(response, 200, { ok: true, user: publicUser(user) });
      return true;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }
  }

  const vesselAccessMatch = urlPath.match(/^\/api\/users\/([^/]+)\/vessels$/);
  if (vesselAccessMatch && request.method === "PATCH") {
    if (!requireAdmin(request, response)) return true;
    try {
      const body = JSON.parse(await readRequestBody(request) || "{}");
      if (!Array.isArray(body.assignedVessels)) {
        sendJson(response, 400, { error: "assignedVessels must be an array" });
        return true;
      }
      const userId = decodeURIComponent(vesselAccessMatch[1]);
      const users = readUsers();
      const user = users.find((item) => item.id === userId);
      if (!user) {
        sendJson(response, 404, { error: "User not found" });
        return true;
      }
      user.assignedVessels = [...new Set(body.assignedVessels.map((name) => String(name).trim()).filter(Boolean))];
      user.accessUpdatedAt = new Date().toISOString();
      writeUsers(users);
      sendJson(response, 200, { ok: true, user: publicUser(user) });
      return true;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }
  }

  if (request.url.startsWith("/api/users") && request.method === "GET") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, { users: readUsers().map(publicUser) });
    return true;
  }

  if (request.url.startsWith("/api/users") && request.method === "POST") {
    if (!requireAdmin(request, response)) return true;
    try {
      const body = JSON.parse(await readRequestBody(request) || "{}");
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const name = String(body.name || "").trim();
      const role = String(body.role || "technical_manager");
      const allowedRoles = ["admin", "technical_manager", "owner_viewer"];
      if (!name || !email || password.length < 8 || !allowedRoles.includes(role)) {
        sendJson(response, 400, { error: "Name, valid role and password of at least 8 characters are required" });
        return true;
      }
      const users = readUsers();
      if (users.some((user) => user.email === email)) {
        sendJson(response, 409, { error: "User email already exists" });
        return true;
      }
      const user = {
        id: crypto.randomUUID(),
        name,
        email,
        role,
        assignedVessels: Array.isArray(body.assignedVessels) ? body.assignedVessels : [],
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeUsers(users);
      sendJson(response, 201, { user: publicUser(user) });
      return true;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return true;
    }
  }

  if (request.url.startsWith("/api/state") && request.method === "GET") {
    const signedInUser = requireUser(request, response);
    if (!signedInUser) return true;
    sendJson(response, 200, filterStateForUser(readState(), signedInUser));
    return true;
  }

  if (request.url.startsWith("/api/state") && request.method === "PUT") {
    const signedInUser = requireUser(request, response);
    if (!signedInUser) return true;
    try {
      const body = await readRequestBody(request);
      const state = JSON.parse(body || "{}");
      if (!Array.isArray(state.reports) || !Array.isArray(state.claims) || !Array.isArray(state.drydockPlans)) {
        sendJson(response, 400, { error: "Invalid state payload" });
        return true;
      }
      if (!Array.isArray(state.submittedReports)) {
        state.submittedReports = [];
      }
      const saved = writeState(mergeStateForUser(readState(), state, signedInUser));
      sendJson(response, 200, filterStateForUser(saved, signedInUser));
      return true;
    } catch (error) {
      const status = error.message.includes("not assigned") ? 403 : 400;
      sendJson(response, status, { error: error.message });
      return true;
    }
  }

  if (request.url.startsWith("/api/")) {
    sendJson(response, 404, { error: "API endpoint not found" });
    return true;
  }

  return false;
}

ensureBootstrapAdmin();

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
