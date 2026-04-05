import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@yourq/prisma-backoffice";
import { logger } from "../../lib/logger";

export default function categoriesRouter(db: PrismaClient): Router {
  const router = Router();

  // 전체 목록 (sortOrder 정렬)
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const categories = await db.category.findMany({
        orderBy: { sortOrder: "asc" },
      });
      res.json(categories);
    } catch (err) {
      logger.error({ err }, "category operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 단건 조회
  router.get("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const category = await db.category.findUnique({
        where: { id },
      });
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (err) {
      logger.error({ err }, "category operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 생성
  router.post("/", async (req: Request, res: Response) => {
    const { id, name, icon, sortOrder } = req.body;
    try {
      const existing = await db.category.findUnique({ where: { id } });
      if (existing)
        return res.status(409).json({ error: `Category "${id}" already exists` });

      const category = await db.category.create({
        data: { id, name, icon, sortOrder: sortOrder ?? 0 },
      });
      res.status(201).json(category);
    } catch (err) {
      logger.error({ err }, "category operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 수정
  router.put("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, icon, sortOrder } = req.body;
    try {
      const category = await db.category.findUnique({
        where: { id },
      });
      if (!category) return res.status(404).json({ error: "Category not found" });

      const updated = await db.category.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(icon !== undefined && { icon }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
      });
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "category operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 삭제 (FK 참조 시 거부)
  router.delete("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const [connCount, skillCount] = await Promise.all([
        db.connectionTemplate.count({ where: { categoryId: id } }),
        db.skillTemplate.count({ where: { categoryId: id } }),
      ]);
      if (connCount > 0 || skillCount > 0) {
        return res.status(409).json({
          error: `참조 중인 템플릿이 있습니다 (connection: ${connCount}, skill: ${skillCount})`,
        });
      }

      await db.category.delete({ where: { id } });
      res.status(204).end();
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === "P2025")
        return res.status(404).json({ error: "Category not found" });
      logger.error({ err }, "category operation failed");
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
