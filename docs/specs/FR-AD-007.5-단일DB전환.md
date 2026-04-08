# FR-AD-007.5 — 단일 DB 전환 (ADR-035) 구현 명세서

> Version: v1.0.0 | Updated: 2026-04-08 KST

## RTM 추적

| 항목 | 값 |
|------|-----|
| FR | FR-AD-007 (Template 도메인을 관리한다) |
| Sub-FR | FR-AD-007.5 (단일 DB 전환) |
| CL | CL-007.5-01 ~ CL-007.5-05 |
| 브랜치 | `FR-AD-007.5` |
| 근거 | ADR-035 (단일 DB + status 플래그로 Template Reconcile FK 체인 문제 해소) |

---

## 0. 사전 준비

### 0.1 API 타입 재생성

API Server Internal API가 SSOT가 되므로 타입을 최신으로 맞춘다.

```bash
curl -sf http://localhost:3057/openapi.json > /dev/null
npm run gen:api
git diff src/types/api-types.ts
```

### 0.2 현재 상태 확인

전환 전 구조:

```
프론트엔드 → backoffice-api.ts → /api/backoffice/* → Express 라우터 → Prisma → Backoffice DB
                                                                                    ↓ Reconcile
                                                                              API Server DB
```

전환 후 구조:

```
프론트엔드 → backoffice-api.ts → /api/* → BFF 프록시 → API Server /api/internal/admin/* → DB
```

---

## 1. CL-007.5-01: Backoffice DB 아티팩트 제거

### 1.1 prisma/backoffice/ 디렉토리 삭제

전체 삭제:

```
prisma/backoffice/
├── schema.prisma
├── migrations/
│   ├── 20260328031221_init/
│   ├── 20260328171406_add_missing_template_fields/
│   ├── 20260328_add_unique_constraints/
│   └── migration_lock.toml
```

### 1.2 server.ts — PrismaClient 제거

**삭제할 코드:**

```typescript
// 삭제: import (5행)
import { PrismaClient } from "@yourq/prisma-backoffice";

// 삭제: 인스턴스 생성 (17행)
const backofficeDb = new PrismaClient();
```

`backofficeDb` 참조는 CL-02에서 라우터와 함께 제거.

### 1.3 package.json — Prisma 의존성 제거

**삭제할 항목:**

| 위치 | 키 | 비고 |
|------|-----|------|
| scripts | `"postinstall": "prisma generate ..."` | Backoffice 스키마 generate |
| dependencies | Prisma client 패키지 (`^6.19.2`) | 런타임 의존성 |
| devDependencies | prisma CLI (`^6.19.2`) | 개발 의존성 |

삭제 후 `npm install` 실행.

---

## 2. CL-007.5-02: Backoffice CRUD 라우터 제거

### 2.1 src/routes/backoffice/ 디렉토리 삭제

전체 삭제 (5개 파일):

```
src/routes/backoffice/
├── categories.ts
├── connection-templates.ts
├── skill-templates.ts
├── reconcile.ts
└── oauth-providers.ts      ← 미트래킹 파일 포함
```

### 2.2 server.ts — 라우터 등록 + 인증 미들웨어 제거

**삭제할 import (7~10행):**

```typescript
import categoriesRouter from "./src/routes/backoffice/categories";
import connectionTemplatesRouter from "./src/routes/backoffice/connection-templates";
import skillTemplatesRouter from "./src/routes/backoffice/skill-templates";
import reconcileRouter from "./src/routes/backoffice/reconcile";
```

**삭제: RECONCILE_ENVS 변수 (19~23행):**

```typescript
const RECONCILE_ENVS: Record<string, string | undefined> = {
  test: process.env.API_SERVER_TEST_URL || API_SERVER,
  prod: process.env.API_SERVER_PROD_URL,
};
```

**삭제: requireAdminSecret 함수 정의 (41~49행):**

```typescript
function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
```

BFF 프록시가 `x-admin-secret` 헤더를 API Server에 직접 전달하므로 인증은 API Server가 담당.

**삭제: 라우터 등록 (52~58행):**

```typescript
app.use("/api/backoffice/categories", requireAdminSecret, categoriesRouter(backofficeDb));
app.use("/api/backoffice/connection-templates", requireAdminSecret, connectionTemplatesRouter(backofficeDb));
app.use("/api/backoffice/skill-templates", requireAdminSecret, skillTemplatesRouter(backofficeDb));
app.use("/api/backoffice/reconcile", requireAdminSecret, reconcileRouter(backofficeDb, {
  envs: RECONCILE_ENVS,
  adminSecret: ADMIN_SECRET,
}));
```

**삭제: 미사용 import** — `NextFunction`이 더 이상 사용되지 않으면 import에서도 제거.

### 2.3 유지 항목

- `ADMIN_SECRET` 변수 — BFF 프록시에서 사용 중 (server.ts:87)
- BFF catch-all 프록시 `app.all("/api/{*path}", ...)` — 절대 삭제 금지
- Dashboard `/api/stats` 엔드포인트 — BFF 조합 로직, 유지
- `schema-validator.ts` — 프론트엔드 3개 파일에서 사용 중, 유지

### 2.4 server.ts 최종 형태

```typescript
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
app.use(pinoHttp({ /* 기존 설정 유지 */ }));

// Dashboard 통계 (BFF 조합)
app.get("/api/stats", async (_req: Request, res: Response) => {
  /* 기존 코드 유지 */
});

// BFF 프록시: /api/* → API Server /api/internal/admin/*
app.all("/api/{*path}", async (req: Request, res: Response) => {
  /* 기존 코드 유지 */
});

// SPA 정적 파일
app.use(express.static(join(__dirname, "dist")));
app.get("{*path}", (_req: Request, res: Response) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => logger.info({ port: PORT }, "admin server started"));
```

---

## 3. CL-007.5-03: Reconcile 코드 제거

### 3.1 src/services/reconcile.ts — 삭제

전체 삭제 (325줄).

### 3.2 src/pages/Reconcile.tsx — 삭제

전체 삭제.

### 3.3 src/types/admin.ts — Reconcile 타입 제거

**삭제할 타입 (6개, 20~67행):**

- `ReconcileDiffItem`
- `ReconcileDiff`
- `ReconcileSummary`
- `ReconcileDryRunResult`
- `ReconcileExecuteItem`
- `ReconcileExecuteResult`

**삭제: Backoffice 전용 응답 포맷 (14~18행):**

```typescript
export interface BackofficePaginatedResponse<T = AdminRecord> {
  data: T[];
  total: number;
}
```

BFF 프록시 전환 후 불필요 — API Server 응답은 `PaginatedResponse` 포맷.

**유지할 타입:**

```typescript
export type AdminRecord = Record<string, unknown> & { id: string };
export interface PaginatedResponse<T = AdminRecord> { ... }
```

### 3.4 src/components/Layout.tsx — 사이드바 메뉴 제거

**삭제 (45행):**

```typescript
{ to: "/backoffice/reconcile", label: "Reconcile", icon: RefreshCw },
```

`RefreshCw` import가 다른 곳에서 미사용이면 import에서도 제거.

### 3.5 src/App.tsx — 라우트 제거

**삭제:**

```typescript
// import 제거 (15행)
import Reconcile from "@/pages/Reconcile";

// 라우트 제거 (36행)
{ path: "/backoffice/reconcile", element: <Reconcile /> },
```

### 3.6 src/backoffice-api.ts — Reconcile 함수 제거

**삭제 (130~148행):**

```typescript
// ── Reconciliation ──
export function getReconcileEnvs(): Promise<unknown> { ... }
export function reconcileDryRun(env: string): Promise<unknown> { ... }
export function reconcileExecute(env: string): Promise<unknown> { ... }
```

---

## 4. CL-007.5-04: BFF 프록시 전환

### 4.1 src/backoffice-api.ts — 경로 전환

**BASE 경로 변경:**

```typescript
// 이전
const BASE = "/api/backoffice";

// 이후
const BASE = "/api";
```

### 4.2 HTTP 메서드 전환 — create → upsert

API Server는 Category/CT/ST에 대해 POST 없이 PUT upsert만 제공.

**Category:**

```typescript
// 삭제: createCategory (POST)
// 수정: updateCategory → upsertCategory (PUT 유지, 이름 변경)
export function upsertCategory(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
```

**ConnectionTemplate:**

```typescript
// 삭제: createConnectionTemplate (POST)
// 수정: updateConnectionTemplate → upsertConnectionTemplate
export function upsertConnectionTemplate(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/connection-templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
```

**SkillTemplate:**

```typescript
// 삭제: createSkillTemplate (POST)
// 수정: updateSkillTemplate → upsertSkillTemplate
export function upsertSkillTemplate(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/skill-templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
```

### 4.3 반환 타입 강화

`npm run gen:api` 후 api-types.ts 타입을 import하여 `Promise<unknown>` → 구체 타입으로 강화.

```typescript
import type { paths } from "@/types/api-types";

// 예시: getCategories 반환 타입
type CategoriesResponse =
  paths["/api/internal/admin/categories"]["get"]["responses"]["200"]["content"]["application/json"];

export function getCategories(): Promise<CategoriesResponse> {
  return request("/categories") as Promise<CategoriesResponse>;
}
```

실제 타입 매핑은 api-types.ts 재생성 후 확인하여 결정. 모든 함수에 동일 패턴 적용.

### 4.4 BackofficeError 인터페이스 검토

현재 `BackofficeError`는 에러 응답 파싱용. API Server 에러 응답 포맷이 동일하면 유지, 다르면 대응.

```typescript
// 현재 — API Server도 { error: string } 포맷이면 유지
interface BackofficeError {
  error?: string;
  errors?: Array<{ message?: string }>;
}
```

### 4.5 TemplateListParams 검토

현재 `page`, `limit`, `categoryId`, `search` 파라미터 — API Server가 동일한 쿼리 파라미터를 지원하는지 확인. OpenAPI 스펙 기준으로 대응.

### 4.6 프론트엔드 페이지 — create → upsert 호출 전환

`createCategory`, `createConnectionTemplate`, `createSkillTemplate`를 호출하는 페이지에서 `upsertCategory` 등으로 전환. 해당 페이지:

- `src/pages/Categories.tsx` — Category 생성 시
- `src/pages/ConnectionTemplateDetail.tsx` — CT 생성 시
- `src/pages/SkillTemplateDetail.tsx` — ST 생성 시

---

## 5. CL-007.5-05: 테스트 재작성

### 5.1 구 테스트 삭제

```
tests/FR-AD-007.1/    ← 전체 삭제 (Backoffice CRUD 통합테스트)
tests/FR-AD-007.3/    ← 전체 삭제 (Reconcile 단위테스트 7개 파일)
```

### 5.2 신규 테스트 — BFF 프록시 경유 통합테스트

```
tests/FR-AD-007.5/
  CL-007.5-04/
    TC-007.5-04.test.ts    ← BFF 프록시 경유 CRUD 통합테스트
```

**TC-007.5-04.test.ts 구조:**

```typescript
import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3058/api";
const SECRET = process.env.ADMIN_API_SECRET || "test-secret";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": SECRET,
    },
    ...options,
  });
  return { status: res.status, data: res.status !== 204 ? await res.json() : null };
}

describe("TC-007.5-04: BFF 프록시 경유 Template CRUD", () => {
  // Category CRUD
  describe("Category", () => {
    const slug = `test-category-${Date.now()}`;

    it("PUT upsert로 Category를 생성한다", async () => {
      const { status, data } = await request(`/categories/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Test Category", description: "test" }),
      });
      expect(status).toBeLessThan(300);
      expect(data).toBeDefined();
    });

    it("GET으로 Category 목록을 조회한다", async () => {
      const { status, data } = await request("/categories");
      expect(status).toBe(200);
      expect(Array.isArray(data) || data.data).toBeTruthy();
    });

    it("DELETE로 Category를 삭제한다", async () => {
      const { status } = await request(`/categories/${slug}`, { method: "DELETE" });
      expect(status).toBeLessThan(300);
    });
  });

  // ConnectionTemplate CRUD — FK 순서: Category 선행
  describe("ConnectionTemplate", () => {
    // PUT upsert, GET list, GET detail, DELETE 검증
  });

  // SkillTemplate CRUD — FK 순서: Category + CT 선행
  describe("SkillTemplate", () => {
    // PUT upsert, GET list, GET detail, DELETE 검증
  });
});
```

실제 테스트 코드는 코딩 단계에서 API Server 응답을 확인하며 구체화.

### 5.3 정적 검증 테스트

TC-007.5-01~03은 빌드 성공 + 파일 부재 확인으로 커버. CI 파이프라인(lint → type-check → test → build)이 자연스럽게 검증하므로 별도 테스트 파일 불필요.

### 5.4 .github/workflows/quality-gate.yml — exclude 갱신

```yaml
# 이전
- name: 테스트
  run: npx vitest run --exclude '**/FR-AD-007.1/**' --exclude '**/FR-AD-007.4/**'

# 이후
- name: 테스트
  run: npx vitest run --exclude '**/FR-AD-007.4/**' --exclude '**/FR-AD-007.5/**'
```

- `FR-AD-007.1` exclude 제거 (테스트 디렉토리 자체가 삭제됨)
- `FR-AD-007.3` exclude 불필요 (테스트 디렉토리 자체가 삭제됨)
- `FR-AD-007.5` exclude 추가 (서버 필요한 통합테스트)
- `FR-AD-007.4` exclude 유지 (서버 필요한 통합테스트)

---

## 6. 작업 순서

```
CL-01 (Prisma 제거) + CL-02 (라우터 제거) — 동시 가능
       ↓
CL-03 (Reconcile 제거) — 독립
       ↓
CL-04 (경로 전환) — CL-02 완료 후
       ↓
CL-05 (테스트) — 전체 완료 후
       ↓
tsc --noEmit + vite build + vitest run 검증
```

---

## 변경 이력

| 버전 | 일시 | 내용 |
|------|------|------|
| v1.0.0 | 2026-04-08 KST | 초판 작성 |
