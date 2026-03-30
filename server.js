import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import { PrismaClient } from "@yourq/prisma-backoffice";
import { logger } from "./src/lib/logger.js";
import categoriesRouter from "./src/routes/backoffice/categories.js";
import connectionTemplatesRouter from "./src/routes/backoffice/connection-templates.js";
import skillTemplatesRouter from "./src/routes/backoffice/skill-templates.js";
import reconcileRouter from "./src/routes/backoffice/reconcile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3058;
const API_SERVER = process.env.API_SERVER_URL || "http://localhost:3057";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET;
const backofficeDb = new PrismaClient();

// Reconciliation 대상 환경
const RECONCILE_ENVS = {
  test: process.env.API_SERVER_TEST_URL || API_SERVER,
  prod: process.env.API_SERVER_PROD_URL,
};

app.use(express.json());
app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === "/api/stats" },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
      };
    },
  },
}));

// Backoffice API 인증
function requireAdminSecret(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Backoffice CRUD (Prisma 직접 접근)
app.use("/api/backoffice/categories", requireAdminSecret, categoriesRouter(backofficeDb));
app.use("/api/backoffice/connection-templates", requireAdminSecret, connectionTemplatesRouter(backofficeDb));
app.use("/api/backoffice/skill-templates", requireAdminSecret, skillTemplatesRouter(backofficeDb));
app.use("/api/backoffice/reconcile", requireAdminSecret, reconcileRouter(backofficeDb, {
  envs: RECONCILE_ENVS,
  adminSecret: ADMIN_SECRET,
}));

// Dashboard 통계 (BFF 조합 — API Server에 /admin/stats 없음)
app.get("/api/stats", async (req, res) => {
  const headers = { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET };
  try {
    const [accounts, members] = await Promise.all([
      fetch(`${API_SERVER}/api/internal/admin/accounts?limit=1`, { headers }).then((r) => r.json()),
      fetch(`${API_SERVER}/api/internal/admin/members?limit=1`, { headers }).then((r) => r.json()),
    ]);
    res.json({
      accounts: accounts.pagination.total,
      members: members.pagination.total,
    });
  } catch (err) {
    logger.error({ err }, "stats fetch failed");
    res.status(502).json({ error: "API Server 연결 실패" });
  }
});

// BFF 프록시: /api/* → API Server /api/internal/admin/*
app.all("/api/{*path}", async (req, res) => {
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path;
  const url = `${API_SERVER}/api/internal/admin/${path}${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`;
  try {
    const resp = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      ...(!["GET", "HEAD", "DELETE"].includes(req.method) && { body: JSON.stringify(req.body) }),
    });
    if (resp.status === 204) {
      return res.status(204).end();
    }
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    logger.error({ err, method: req.method, path }, "bff proxy failed");
    res.status(502).json({ error: "API Server 연결 실패" });
  }
});

// SPA 정적 파일
app.use(express.static(join(__dirname, "dist")));
app.get("{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => logger.info({ port: PORT }, "admin server started"));
