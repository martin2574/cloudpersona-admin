import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@yourq/prisma-backoffice";
import { reconcile } from "../../services/reconcile";
import { logger } from "../../lib/logger";

interface ReconcileRouterOptions {
  envs: Record<string, string | undefined>;
  adminSecret: string | undefined;
}

export default function reconcileRouter(db: PrismaClient, { envs, adminSecret }: ReconcileRouterOptions): Router {
  const router = Router();

  // GET /api/backoffice/reconcile/envs — 사용 가능한 환경 목록
  router.get("/envs", (_req: Request, res: Response) => {
    const available = Object.entries(envs)
      .filter(([, url]) => url)
      .map(([name]) => name);
    res.json(available);
  });

  // POST /api/backoffice/reconcile
  router.post("/", async (req: Request, res: Response) => {
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
      const result = await reconcile(db, { apiServerUrl: envs[env]!, adminSecret: adminSecret!, mode });
      res.json({ ...result, env });
    } catch (err) {
      logger.error({ err, env, mode }, "reconcile failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
