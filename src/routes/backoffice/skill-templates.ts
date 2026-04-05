import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@yourq/prisma-backoffice";
import { validateSpec } from "../../lib/schema-validator";
import { logger } from "../../lib/logger";

export default function skillTemplatesRouter(db: PrismaClient): Router {
  const router = Router();

  // 목록 (필터, 검색, 페이지네이션)
  router.get("/", async (req: Request, res: Response) => {
    const { categoryId, connectionTemplateId, search, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (connectionTemplateId) where.connectionTemplateId = connectionTemplateId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { skillType: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        db.skillTemplate.findMany({
          where,
          include: { category: true, connectionTemplate: true },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        db.skillTemplate.count({ where }),
      ]);
      res.json({ data, total, page: parseInt(page as string), limit: take });
    } catch (err) {
      logger.error({ err }, "skill template operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 단건 조회
  router.get("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const template = await db.skillTemplate.findUnique({
        where: { id },
        include: { category: true, connectionTemplate: true },
      });
      if (!template) return res.status(404).json({ error: "Skill Template not found" });
      res.json(template);
    } catch (err) {
      logger.error({ err }, "skill template operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 생성 (Layer 1/2 검증)
  router.post("/", async (req: Request, res: Response) => {
    const { id, skillType, name, description, version, categoryId, connectionTemplateId, icon, spec } = req.body;

    // spec 검증
    const validation = validateSpec(spec);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // category FK 검증
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({
        errors: [{ layer: 2, field: "categoryId", message: `Category "${categoryId}" not found` }],
      });
    }

    // connectionTemplate FK 검증 (nullable)
    if (connectionTemplateId) {
      const conn = await db.connectionTemplate.findUnique({ where: { id: connectionTemplateId } });
      if (!conn) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "connectionTemplateId", message: `Connection Template "${connectionTemplateId}" not found` }],
        });
      }
    }

    try {
      const template = await db.skillTemplate.create({
        data: {
          ...(id && { id }),
          skillType,
          name,
          description: description || "",
          version,
          categoryId,
          connectionTemplateId: connectionTemplateId || null,
          icon: icon || null,
          spec,
        },
        include: { category: true, connectionTemplate: true },
      });
      res.status(201).json(template);
    } catch (err) {
      const e = err as { code?: string; meta?: { target?: string[] }; message?: string };
      if (e.code === "P2002") {
        const fields = e.meta?.target?.join(", ") || "id";
        return res.status(409).json({ error: `이미 같은 ${fields} 조합이 존재합니다` });
      }
      logger.error({ err }, "skill template operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 수정 (Layer 1/2 검증)
  router.put("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { skillType, name, description, version, categoryId, connectionTemplateId, icon, spec } = req.body;

    const existing = await db.skillTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Skill Template not found" });

    // spec 변경 시 검증
    if (spec !== undefined) {
      const validation = validateSpec(spec);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }
    }

    // category 변경 시 FK 검증
    if (categoryId !== undefined) {
      const category = await db.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "categoryId", message: `Category "${categoryId}" not found` }],
        });
      }
    }

    // connectionTemplate 변경 시 FK 검증
    if (connectionTemplateId !== undefined && connectionTemplateId !== null) {
      const conn = await db.connectionTemplate.findUnique({ where: { id: connectionTemplateId } });
      if (!conn) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "connectionTemplateId", message: `Connection Template "${connectionTemplateId}" not found` }],
        });
      }
    }

    try {
      const updated = await db.skillTemplate.update({
        where: { id },
        data: {
          ...(skillType !== undefined && { skillType }),
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(version !== undefined && { version }),
          ...(categoryId !== undefined && { categoryId }),
          ...(connectionTemplateId !== undefined && { connectionTemplateId: connectionTemplateId || null }),
          ...(icon !== undefined && { icon: icon || null }),
          ...(spec !== undefined && { spec }),
        },
        include: { category: true, connectionTemplate: true },
      });
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "skill template operation failed");
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 삭제
  router.delete("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      await db.skillTemplate.delete({ where: { id } });
      res.status(204).end();
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === "P2025") return res.status(404).json({ error: "Skill Template not found" });
      logger.error({ err }, "skill template operation failed");
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
