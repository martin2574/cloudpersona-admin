import express, { type Request, type Response } from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import { logger } from "./src/lib/logger";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3058;
const API_SERVER = process.env.API_SERVER_URL || "http://localhost:3057";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

app.use(express.json());
app.use(pinoHttp({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pino-http 제네릭 타입 호환 우회
  logger: logger as any,
  autoLogging: { ignore: (req: { url?: string }) => req.url === "/api/stats" },
  customLogLevel(_req: unknown, res: { statusCode?: number }, err: unknown) {
    if (err || (res.statusCode ?? 0) >= 500) return "error";
    return "info";
  },
  serializers: {
    req(req: { method?: string; url?: string }) {
      return { method: req.method, url: req.url };
    },
  },
}));

// Dashboard 통계 (BFF 조합 — API Server에 /admin/stats 없음)
app.get("/api/stats", async (_req: Request, res: Response) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ADMIN_SECRET) headers["x-admin-secret"] = ADMIN_SECRET;
  try {
    const [accounts, members] = await Promise.all([
      fetch(`${API_SERVER}/api/internal/admin/accounts?limit=1`, { headers }).then((r) => r.json()),
      fetch(`${API_SERVER}/api/internal/admin/members?limit=1`, { headers }).then((r) => r.json()),
    ]);
    const acct = accounts as { pagination: { total: number } };
    const memb = members as { pagination: { total: number } };
    res.json({
      accounts: acct.pagination.total,
      members: memb.pagination.total,
    });
  } catch (err) {
    logger.error({ err }, "stats fetch failed");
    res.status(502).json({ error: "API Server 연결 실패" });
  }
});

// BFF 프록시: /api/* → API Server /api/internal/admin/*
app.all("/api/{*path}", async (req: Request, res: Response) => {
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path as string;
  const url = `${API_SERVER}/api/internal/admin/${path}${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`;
  try {
    const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (ADMIN_SECRET) fetchHeaders["x-admin-secret"] = ADMIN_SECRET;
    const resp = await fetch(url, {
      method: req.method,
      headers: fetchHeaders,
      ...(!["GET", "HEAD", "DELETE"].includes(req.method) && { body: JSON.stringify(req.body) }),
    });
    if (resp.status === 204) {
      res.status(204).end();
      return;
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
app.get("{*path}", (_req: Request, res: Response) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => logger.info({ port: PORT }, "admin server started"));
