import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3058;
const API_SERVER = process.env.API_SERVER_URL || "http://localhost:3057";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

app.use(express.json());

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
    res.status(502).json({ error: "API Server 연결 실패" });
  }
});

// SPA 정적 파일
app.use(express.static(join(__dirname, "dist")));
app.get("{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log(`YourQ Admin running on port ${PORT}`));
