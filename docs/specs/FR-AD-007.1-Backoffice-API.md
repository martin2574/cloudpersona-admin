# FR-AD-007.1: Backoffice API — 구현 스펙

Version: v1.0.0 | Updated: 2026-03-28 11:34 KST

## 개요

Admin BFF에 backoffice DB(`yourq_backoffice`, `template` schema) CRUD 엔드포인트를 추가하고,
템플릿 spec(JSON Schema + uiSchema) 등록/수정 시 Layer 1(메타스키마) + Layer 2(데이터 유효성)를 자동 검증.

RTM 추적: FR-AD-007 → FR-AD-007.1 → CL-007.1-01~05 → TC-007.1-01~10

---

## CL-007.1-01: Backoffice Prisma 설정

### 의존성 추가 — `package.json`

```json
// dependencies에 추가
"@prisma/client": "^6.5.0"

// devDependencies에 추가
"prisma": "^6.5.0"
```

실행: `npm install`

### 신규 파일 — `prisma/backoffice/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../../node_modules/.prisma/backoffice"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("BACKOFFICE_DATABASE_URL")
  schemas  = ["template"]
}

model Category {
  id         String   @id @db.VarChar
  name       String   @db.VarChar
  icon       String   @db.VarChar
  sort_order Int      @default(0)
  created_at DateTime @default(now()) @db.Timestamptz
  updated_at DateTime @default(now()) @updatedAt @db.Timestamptz

  connection_templates ConnectionTemplate[]
  skill_templates      SkillTemplate[]

  @@schema("template")
}

model ConnectionTemplate {
  id           String   @id @default(uuid()) @db.Uuid
  service_type String   @db.VarChar
  name         String   @db.VarChar
  version      String   @db.VarChar
  category_id  String   @db.VarChar
  spec         Json
  created_at   DateTime @default(now()) @db.Timestamptz
  updated_at   DateTime @default(now()) @updatedAt @db.Timestamptz

  category        Category        @relation(fields: [category_id], references: [id])
  skill_templates SkillTemplate[]

  @@schema("template")
}

model SkillTemplate {
  id                     String   @id @default(uuid()) @db.Uuid
  skill_type             String   @db.VarChar
  name                   String   @db.VarChar
  version                String   @db.VarChar
  category_id            String   @db.VarChar
  connection_template_id String?  @db.Uuid
  spec                   Json
  created_at             DateTime @default(now()) @db.Timestamptz
  updated_at             DateTime @default(now()) @updatedAt @db.Timestamptz

  category            Category            @relation(fields: [category_id], references: [id])
  connection_template ConnectionTemplate? @relation(fields: [connection_template_id], references: [id])

  @@schema("template")
}
```

마이그레이션:

```bash
npx prisma migrate dev --schema prisma/backoffice/schema.prisma --name init
```

### 수정 — `server.js`

기존 import 아래(3행 뒤)에 추가:

```javascript
import { PrismaClient } from ".prisma/backoffice";
import categoriesRouter from "./src/routes/backoffice/categories.js";
import connectionTemplatesRouter from "./src/routes/backoffice/connection-templates.js";
import skillTemplatesRouter from "./src/routes/backoffice/skill-templates.js";

const backofficeDb = new PrismaClient();
```

기존 `app.use(express.json());` (11행) 아래, `/api/stats` (14행) **위에** 삽입:

```javascript
// Backoffice 인증 미들웨어 (R1)
function requireAdminSecret(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Backoffice 라우트 — /api/stats, /api/{*path} 프록시보다 먼저 등록
app.use("/api/backoffice/categories", requireAdminSecret, categoriesRouter(backofficeDb));
app.use("/api/backoffice/connection-templates", requireAdminSecret, connectionTemplatesRouter(backofficeDb));
app.use("/api/backoffice/skill-templates", requireAdminSecret, skillTemplatesRouter(backofficeDb));
```

**주의**: backoffice 라우트를 `/api/{*path}` 프록시(기존 31행)보다 **위에** 등록해야 함. 그렇지 않으면 `/api/backoffice/*` 요청이 API Server 프록시로 빠짐.

---

## CL-007.1-02: 스키마 검증 모듈

### 의존성 추가 — `package.json`

```json
// dependencies에 추가
"ajv": "^8.17.0"
```

### 신규 파일 — `src/lib/schema-validator.js`

```javascript
import Ajv from "ajv";

const ajv = new Ajv({ strict: false, allErrors: true });

/**
 * 템플릿 spec 검증 (Layer 1 + Layer 2)
 * @param {object} spec - { jsonSchema, uiSchema }
 * @returns {{ valid: boolean, errors: Array<{ layer: 1|2, field: string, message: string }> }}
 */
export function validateSpec(spec) {
  const errors = [];

  // Layer 2: 구조 검증 (Layer 1보다 먼저 — jsonSchema 없으면 Layer 1 불가)
  if (!spec || typeof spec !== "object") {
    errors.push({ layer: 2, field: "spec", message: "spec must be an object" });
    return { valid: false, errors };
  }

  if (!spec.jsonSchema || typeof spec.jsonSchema !== "object") {
    errors.push({ layer: 2, field: "jsonSchema", message: "jsonSchema is required and must be an object" });
  }

  if (!spec.uiSchema || typeof spec.uiSchema !== "object") {
    errors.push({ layer: 2, field: "uiSchema", message: "uiSchema is required and must be an object" });
  }

  // jsonSchema 없으면 Layer 1 스킵
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Layer 1: 메타스키마 검증 (JSON Schema Draft-07)
  const isValidSchema = ajv.validateSchema(spec.jsonSchema);
  if (!isValidSchema) {
    for (const err of ajv.errors || []) {
      errors.push({
        layer: 1,
        field: err.instancePath || "jsonSchema",
        message: err.message || "Invalid JSON Schema",
      });
    }
  }

  // Layer 2: 데이터 유효성
  if (spec.jsonSchema.type !== "object") {
    errors.push({ layer: 2, field: "jsonSchema.type", message: 'jsonSchema.type must be "object"' });
  }

  // uiSchema 필드가 jsonSchema.properties에 대응하는지 검증
  if (spec.jsonSchema.properties && typeof spec.jsonSchema.properties === "object") {
    const schemaProps = Object.keys(spec.jsonSchema.properties);
    for (const uiKey of Object.keys(spec.uiSchema)) {
      if (uiKey.startsWith("ui:")) continue; // ui:order 등 글로벌 옵션 스킵
      if (!schemaProps.includes(uiKey)) {
        errors.push({
          layer: 2,
          field: `uiSchema.${uiKey}`,
          message: `uiSchema field "${uiKey}" has no matching jsonSchema property`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## CL-007.1-03: Category CRUD

### 신규 파일 — `src/routes/backoffice/categories.js`

```javascript
import { Router } from "express";

export default function categoriesRouter(db) {
  const router = Router();

  // 전체 목록 (sort_order 정렬)
  router.get("/", async (req, res) => {
    try {
      const categories = await db.category.findMany({
        orderBy: { sort_order: "asc" },
      });
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 단건 조회
  router.get("/:id", async (req, res) => {
    try {
      const category = await db.category.findUnique({
        where: { id: req.params.id },
      });
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 생성
  router.post("/", async (req, res) => {
    const { id, name, icon, sort_order } = req.body;
    try {
      const existing = await db.category.findUnique({ where: { id } });
      if (existing) return res.status(409).json({ error: `Category "${id}" already exists` });

      const category = await db.category.create({
        data: { id, name, icon, sort_order: sort_order ?? 0 },
      });
      res.status(201).json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 수정
  router.put("/:id", async (req, res) => {
    const { name, icon, sort_order } = req.body;
    try {
      const category = await db.category.findUnique({ where: { id: req.params.id } });
      if (!category) return res.status(404).json({ error: "Category not found" });

      const updated = await db.category.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(icon !== undefined && { icon }),
          ...(sort_order !== undefined && { sort_order }),
        },
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 삭제 (FK 참조 시 거부)
  router.delete("/:id", async (req, res) => {
    try {
      const [connCount, skillCount] = await Promise.all([
        db.connectionTemplate.count({ where: { category_id: req.params.id } }),
        db.skillTemplate.count({ where: { category_id: req.params.id } }),
      ]);
      if (connCount > 0 || skillCount > 0) {
        return res.status(409).json({
          error: `참조 중인 템플릿이 있습니다 (connection: ${connCount}, skill: ${skillCount})`,
        });
      }

      await db.category.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      if (err.code === "P2025") return res.status(404).json({ error: "Category not found" });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
```

---

## CL-007.1-04: Connection Template CRUD

### 신규 파일 — `src/routes/backoffice/connection-templates.js`

```javascript
import { Router } from "express";
import { validateSpec } from "../../lib/schema-validator.js";

export default function connectionTemplatesRouter(db) {
  const router = Router();

  // 목록 (필터, 검색, 페이지네이션)
  router.get("/", async (req, res) => {
    const { category_id, search, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (category_id) where.category_id = category_id;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { service_type: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        db.connectionTemplate.findMany({
          where,
          include: { category: true },
          orderBy: { created_at: "desc" },
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
        include: { category: true, skill_templates: true },
      });
      if (!template) return res.status(404).json({ error: "Connection Template not found" });
      res.json(template);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 생성 (Layer 1/2 검증)
  router.post("/", async (req, res) => {
    const { id, service_type, name, version, category_id, spec } = req.body;

    // spec 검증
    const validation = validateSpec(spec);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // category FK 검증
    const category = await db.category.findUnique({ where: { id: category_id } });
    if (!category) {
      return res.status(400).json({
        errors: [{ layer: 2, field: "category_id", message: `Category "${category_id}" not found` }],
      });
    }

    try {
      const template = await db.connectionTemplate.create({
        data: { ...(id && { id }), service_type, name, version, category_id, spec },
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
    const { service_type, name, version, category_id, spec } = req.body;

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
    if (category_id !== undefined) {
      const category = await db.category.findUnique({ where: { id: category_id } });
      if (!category) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "category_id", message: `Category "${category_id}" not found` }],
        });
      }
    }

    try {
      const updated = await db.connectionTemplate.update({
        where: { id: req.params.id },
        data: {
          ...(service_type !== undefined && { service_type }),
          ...(name !== undefined && { name }),
          ...(version !== undefined && { version }),
          ...(category_id !== undefined && { category_id }),
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
        where: { connection_template_id: req.params.id },
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
```

---

## CL-007.1-05: Skill Template CRUD

### 신규 파일 — `src/routes/backoffice/skill-templates.js`

```javascript
import { Router } from "express";
import { validateSpec } from "../../lib/schema-validator.js";

export default function skillTemplatesRouter(db) {
  const router = Router();

  // 목록 (필터, 검색, 페이지네이션)
  router.get("/", async (req, res) => {
    const { category_id, connection_template_id, search, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (category_id) where.category_id = category_id;
    if (connection_template_id) where.connection_template_id = connection_template_id;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { skill_type: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        db.skillTemplate.findMany({
          where,
          include: { category: true, connection_template: true },
          orderBy: { created_at: "desc" },
          skip,
          take,
        }),
        db.skillTemplate.count({ where }),
      ]);
      res.json({ data, total, page: parseInt(page), limit: take });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 단건 조회
  router.get("/:id", async (req, res) => {
    try {
      const template = await db.skillTemplate.findUnique({
        where: { id: req.params.id },
        include: { category: true, connection_template: true },
      });
      if (!template) return res.status(404).json({ error: "Skill Template not found" });
      res.json(template);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 생성 (Layer 1/2 검증)
  router.post("/", async (req, res) => {
    const { id, skill_type, name, version, category_id, connection_template_id, spec } = req.body;

    // spec 검증
    const validation = validateSpec(spec);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // category FK 검증
    const category = await db.category.findUnique({ where: { id: category_id } });
    if (!category) {
      return res.status(400).json({
        errors: [{ layer: 2, field: "category_id", message: `Category "${category_id}" not found` }],
      });
    }

    // connection_template FK 검증 (nullable)
    if (connection_template_id) {
      const conn = await db.connectionTemplate.findUnique({ where: { id: connection_template_id } });
      if (!conn) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "connection_template_id", message: `Connection Template "${connection_template_id}" not found` }],
        });
      }
    }

    try {
      const template = await db.skillTemplate.create({
        data: {
          ...(id && { id }),
          skill_type,
          name,
          version,
          category_id,
          connection_template_id: connection_template_id || null,
          spec,
        },
        include: { category: true, connection_template: true },
      });
      res.status(201).json(template);
    } catch (err) {
      if (err.code === "P2002") return res.status(409).json({ error: "Duplicate id" });
      res.status(500).json({ error: err.message });
    }
  });

  // 수정 (Layer 1/2 검증)
  router.put("/:id", async (req, res) => {
    const { skill_type, name, version, category_id, connection_template_id, spec } = req.body;

    const existing = await db.skillTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Skill Template not found" });

    // spec 변경 시 검증
    if (spec !== undefined) {
      const validation = validateSpec(spec);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }
    }

    // category 변경 시 FK 검증
    if (category_id !== undefined) {
      const category = await db.category.findUnique({ where: { id: category_id } });
      if (!category) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "category_id", message: `Category "${category_id}" not found` }],
        });
      }
    }

    // connection_template 변경 시 FK 검증
    if (connection_template_id !== undefined && connection_template_id !== null) {
      const conn = await db.connectionTemplate.findUnique({ where: { id: connection_template_id } });
      if (!conn) {
        return res.status(400).json({
          errors: [{ layer: 2, field: "connection_template_id", message: `Connection Template "${connection_template_id}" not found` }],
        });
      }
    }

    try {
      const updated = await db.skillTemplate.update({
        where: { id: req.params.id },
        data: {
          ...(skill_type !== undefined && { skill_type }),
          ...(name !== undefined && { name }),
          ...(version !== undefined && { version }),
          ...(category_id !== undefined && { category_id }),
          ...(connection_template_id !== undefined && { connection_template_id: connection_template_id || null }),
          ...(spec !== undefined && { spec }),
        },
        include: { category: true, connection_template: true },
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 삭제
  router.delete("/:id", async (req, res) => {
    try {
      await db.skillTemplate.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      if (err.code === "P2025") return res.status(404).json({ error: "Skill Template not found" });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
```

---

## 구현 순서

1. **CL-01**: `npm install` → `prisma/backoffice/schema.prisma` 작성 → `migrate dev` → `server.js` 수정
2. **CL-02**: `npm install ajv` → `src/lib/schema-validator.js` 작성
3. **CL-03**: `src/routes/backoffice/categories.js` 작성
4. **CL-04**: `src/routes/backoffice/connection-templates.js` 작성
5. **CL-05**: `src/routes/backoffice/skill-templates.js` 작성
6. `sudo systemctl restart admin` → TC-01 수동 검증
7. TC-02~10 자동/통합 테스트 실행

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0.0 | 2026-03-28 11:34 KST | 최초 작성 |
