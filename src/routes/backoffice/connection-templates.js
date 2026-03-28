import { Router } from "express";
import { validateSpec } from "../../lib/schema-validator.js";

export default function connectionTemplatesRouter(db) {
  const router = Router();

  // 목록 (필터, 검색, 페이지네이션)
  router.get("/", async (req, res) => {
    const { categoryId, search, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { serviceType: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        db.connectionTemplate.findMany({
          where,
          include: { category: true },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        db.connectionTemplate.count({ where }),
      ]);
      res.json({ data, total, page: parseInt(page), limit: take });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 단건 조회
  router.get("/:id", async (req, res) => {
    try {
      const template = await db.connectionTemplate.findUnique({
        where: { id: req.params.id },
        include: { category: true, skillTemplates: true },
      });
      if (!template) return res.status(404).json({ error: "Connection Template not found" });
      res.json(template);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 생성 (Layer 1/2 검증)
  router.post("/", async (req, res) => {
    const { id, serviceType, name, version, categoryId, spec } = req.body;

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

    try {
      const template = await db.connectionTemplate.create({
        data: { ...(id && { id }), serviceType, name, version, categoryId, spec },
        include: { category: true },
      });
      res.status(201).json(template);
    } catch (err) {
      if (err.code === "P2002") return res.status(409).json({ error: "Duplicate id" });
      res.status(500).json({ error: err.message });
    }
  });

  // 수정 (Layer 1/2 검증)
  router.put("/:id", async (req, res) => {
    const { serviceType, name, version, categoryId, spec } = req.body;

    const existing = await db.connectionTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Connection Template not found" });

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

    try {
      const updated = await db.connectionTemplate.update({
        where: { id: req.params.id },
        data: {
          ...(serviceType !== undefined && { serviceType }),
          ...(name !== undefined && { name }),
          ...(version !== undefined && { version }),
          ...(categoryId !== undefined && { categoryId }),
          ...(spec !== undefined && { spec }),
        },
        include: { category: true },
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 삭제 (skill FK 참조 시 거부)
  router.delete("/:id", async (req, res) => {
    try {
      const skillCount = await db.skillTemplate.count({
        where: { connectionTemplateId: req.params.id },
      });
      if (skillCount > 0) {
        return res.status(409).json({
          error: `참조 중인 Skill Template이 있습니다 (${skillCount}개)`,
        });
      }

      await db.connectionTemplate.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      if (err.code === "P2025") return res.status(404).json({ error: "Connection Template not found" });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
