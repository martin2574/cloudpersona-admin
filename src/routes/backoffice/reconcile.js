import { Router } from "express";
import { reconcile } from "../../services/reconcile.js";

export default function reconcileRouter(db, { envs, adminSecret }) {
  const router = Router();

  // GET /api/backoffice/reconcile/envs — 사용 가능한 환경 목록
  router.get("/envs", (req, res) => {
    const available = Object.entries(envs)
      .filter(([, url]) => url)
      .map(([name]) => name);
    res.json(available);
  });

  // POST /api/backoffice/reconcile
  router.post("/", async (req, res) => {
    const { env, mode } = req.body;

    if (!env || !envs[env]) {
      const available = Object.keys(envs).filter((k) => envs[k]);
      return res.status(400).json({
        error: `env는 ${available.map((e) => `"${e}"`).join(" 또는 ")}이어야 합니다.`,
      });
    }

    if (!mode || !["dry-run", "execute"].includes(mode)) {
      return res.status(400).json({
        error: 'mode는 "dry-run" 또는 "execute"여야 합니다.',
      });
    }

    try {
      const result = await reconcile(db, { apiServerUrl: envs[env], adminSecret, mode });
      res.json({ ...result, env });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
