# FR-AD-007.3: Reconciliation 엔진 — 구현 스펙

Version: v1.1.0 | Updated: 2026-03-29 07:13 KST

## 개요

Backoffice DB의 템플릿 데이터(Category, Connection Template, Skill Template)를
API Server에 일괄 동기화하는 엔진.
Dry-run(미리보기) → 확인 → Execute(실행) 2단계 흐름.
실패 시 즉시 멈춤 + 수동 재실행.

RTM 추적: FR-AD-007 → FR-AD-007.3 → CL-007.3-01~04 → TC-007.3-01~13

---

## CL-007.3-01: Reconciliation 서비스

### 신규 파일 — `src/services/reconcile.js`

```javascript
/**
 * Reconciliation 서비스
 *
 * Backoffice DB(source) ↔ API Server(target) 템플릿 동기화.
 * - dry-run: diff만 계산, API Server 변경 없음
 * - execute: diff 계산 후 FK 순서대로 PUT upsert
 */

// 비교 대상 필드 (timestamps 제외)
const COMPARE_FIELDS = {
  categories: ["name", "icon", "sortOrder"],
  connectionTemplates: [
    "serviceType", "name", "description", "version",
    "categoryId", "icon", "spec", "deprecatedAt",
  ],
  skillTemplates: [
    "skillType", "name", "description", "version",
    "categoryId", "connectionTemplateId", "icon", "spec", "deprecatedAt",
  ],
};

// PUT body 구성 필드 (id 제외 — URL path에 포함)
const UPSERT_FIELDS = {
  categories: ["name", "icon", "sortOrder"],
  connectionTemplates: [
    "serviceType", "name", "description", "version",
    "categoryId", "icon", "spec", "deprecatedAt",
  ],
  skillTemplates: [
    "skillType", "name", "description", "version",
    "categoryId", "connectionTemplateId", "icon", "spec", "deprecatedAt",
  ],
};

/**
 * 두 값의 동등성 비교.
 * - JSON(object): JSON.stringify 비교
 * - Date: ISO string 변환 후 비교
 * - null/undefined: 동일 취급
 */
function isEqual(a, b) {
  // null/undefined 정규화
  const na = a === undefined ? null : a;
  const nb = b === undefined ? null : b;

  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;

  // Date → ISO string
  const va = na instanceof Date ? na.toISOString() : na;
  const vb = nb instanceof Date ? nb.toISOString() : nb;

  // object → JSON string
  if (typeof va === "object" && typeof vb === "object") {
    return JSON.stringify(va) === JSON.stringify(vb);
  }

  return va === vb;
}

/**
 * 리소스 1종 diff 계산
 * @param {Array} sourceItems - Backoffice Prisma 결과
 * @param {Array} targetItems - API Server GET 결과
 * @param {string[]} fields - 비교 필드 목록
 * @returns {{ create: Array, update: Array, skip: Array }}
 */
function diffResource(sourceItems, targetItems, fields) {
  const targetMap = new Map(targetItems.map((item) => [item.id, item]));
  const create = [];
  const update = [];
  const skip = [];

  for (const src of sourceItems) {
    const tgt = targetMap.get(src.id);
    if (!tgt) {
      create.push(src);
      continue;
    }

    const changedFields = fields.filter((f) => !isEqual(src[f], tgt[f]));
    if (changedFields.length > 0) {
      update.push({ ...src, _changedFields: changedFields });
    } else {
      skip.push({ id: src.id, name: src.name });
    }
  }

  return { create, update, skip };
}

/**
 * PUT body 구성 — Backoffice 레코드에서 upsert 필드만 추출
 * @param {object} item - Backoffice Prisma 레코드
 * @param {string[]} fields - UPSERT_FIELDS
 * @returns {object} API Server PUT body
 */
function buildUpsertBody(item, fields) {
  const body = {};
  for (const f of fields) {
    let val = item[f];
    // Date → ISO string (API Server가 string으로 받음)
    if (val instanceof Date) val = val.toISOString();
    // undefined → 포함하지 않음 (optional 필드)
    if (val !== undefined) body[f] = val;
  }
  return body;
}

/**
 * API Server에서 리소스 목록 조회
 */
async function fetchTarget(apiServerUrl, adminSecret, resource) {
  const qs = resource !== "categories" ? "?includeDeprecated=true" : "";
  const url = `${apiServerUrl}/api/internal/admin/${resource}${qs}`;
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });
  if (!resp.ok) {
    throw new Error(`API Server GET /${resource} failed: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * API Server에 PUT upsert
 */
async function upsertTarget(apiServerUrl, adminSecret, resource, id, body) {
  const url = `${apiServerUrl}/api/internal/admin/${resource}/${id}`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PUT /${resource}/${id} failed: ${resp.status} — ${text}`);
  }
  return resp.json();
}

/**
 * Reconciliation 메인 함수
 *
 * @param {import("@yourq/prisma-backoffice").PrismaClient} db - Backoffice Prisma
 * @param {{ apiServerUrl: string, adminSecret: string, mode: "dry-run"|"execute" }} opts
 * @returns {Promise<object>} diff 또는 실행 결과
 */
export async function reconcile(db, { apiServerUrl, adminSecret, mode }) {
  // 1. Backoffice 데이터 조회 (source)
  const [srcCategories, srcConnections, srcSkills] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.connectionTemplate.findMany({ orderBy: { name: "asc" } }),
    db.skillTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  // 2. API Server 데이터 조회 (target)
  const [tgtCategories, tgtConnections, tgtSkills] = await Promise.all([
    fetchTarget(apiServerUrl, adminSecret, "categories"),
    fetchTarget(apiServerUrl, adminSecret, "connection-templates"),
    fetchTarget(apiServerUrl, adminSecret, "skill-templates"),
  ]);

  // 3. Diff 계산
  const diff = {
    categories: diffResource(srcCategories, tgtCategories, COMPARE_FIELDS.categories),
    connectionTemplates: diffResource(srcConnections, tgtConnections, COMPARE_FIELDS.connectionTemplates),
    skillTemplates: diffResource(srcSkills, tgtSkills, COMPARE_FIELDS.skillTemplates),
  };

  const summary = {};
  for (const [key, d] of Object.entries(diff)) {
    summary[key] = { create: d.create.length, update: d.update.length, skip: d.skip.length };
  }

  // dry-run: diff만 반환
  if (mode === "dry-run") {
    return { mode: "dry-run", diff, summary };
  }

  // 4. Execute: FK 순서대로 upsert
  const RESOURCE_ORDER = [
    { key: "categories", resource: "categories", fields: UPSERT_FIELDS.categories },
    { key: "connectionTemplates", resource: "connection-templates", fields: UPSERT_FIELDS.connectionTemplates },
    { key: "skillTemplates", resource: "skill-templates", fields: UPSERT_FIELDS.skillTemplates },
  ];

  const results = { categories: [], connectionTemplates: [], skillTemplates: [] };
  let stopped = false;

  for (const { key, resource, fields } of RESOURCE_ORDER) {
    if (stopped) break;

    const toSync = [...diff[key].create, ...diff[key].update];
    for (const item of toSync) {
      try {
        const body = buildUpsertBody(item, fields);
        await upsertTarget(apiServerUrl, adminSecret, resource, item.id, body);
        results[key].push({ id: item.id, name: item.name, action: diff[key].create.includes(item) ? "create" : "update", success: true });
      } catch (err) {
        results[key].push({ id: item.id, name: item.name, action: "failed", success: false, error: err.message });
        stopped = true;
        break;
      }
    }
  }

  const executeSummary = {};
  for (const [key, items] of Object.entries(results)) {
    executeSummary[key] = {
      success: items.filter((i) => i.success).length,
      failed: items.filter((i) => !i.success).length,
    };
  }

  return { mode: "execute", results, summary: executeSummary, stopped };
}
```

**제약**:
- **(D) FK 순서 필수**: categories → connectionTemplates → skillTemplates. 역순이면 FK 제약 위반.
- **(D) 실패 시 멈춤**: 하나라도 실패하면 해당 리소스에서 중단. 이미 성공한 건은 롤백하지 않음(upsert는 멱등).
- **(C) API Server 계약**: PUT `/api/internal/admin/{resource}/{id}` — body 스키마는 API Server validator 준수.

---

## CL-007.3-02: Reconciliation API 라우트

### 신규 파일 — `src/routes/backoffice/reconcile.js`

```javascript
import { Router } from "express";
import { reconcile } from "../../services/reconcile.js";

export default function reconcileRouter(db, { apiServerUrl, adminSecret }) {
  const router = Router();

  // POST /api/backoffice/reconcile
  router.post("/", async (req, res) => {
    const { mode } = req.body;

    if (!mode || !["dry-run", "execute"].includes(mode)) {
      return res.status(400).json({
        error: 'mode는 "dry-run" 또는 "execute"여야 합니다.',
      });
    }

    try {
      const result = await reconcile(db, { apiServerUrl, adminSecret, mode });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
```

### 수정 — `server.js`

기존 import 블록(7행 뒤)에 추가:

```javascript
import reconcileRouter from "./src/routes/backoffice/reconcile.js";
```

기존 backoffice 라우트(30행) 아래, `/api/stats` **위에** 삽입:

```javascript
app.use("/api/backoffice/reconcile", requireAdminSecret, reconcileRouter(backofficeDb, {
  apiServerUrl: API_SERVER,
  adminSecret: ADMIN_SECRET,
}));
```

**주의**: `/api/{*path}` BFF 프록시보다 **위에** 등록해야 함.

---

## CL-007.3-03: Reconciliation UI 페이지

### 신규 파일 — `src/pages/Reconcile.jsx`

```jsx
import { useState } from "react";
import { reconcileDryRun, reconcileExecute } from "../backoffice-api.js";

const ACTION_COLORS = {
  create: "#22c55e",  // green
  update: "#eab308",  // yellow
  skip: "#9ca3af",    // gray
  failed: "#ef4444",  // red
};

function SummaryCard({ label, count, color }) {
  return (
    <div style={{
      padding: "16px", borderRadius: "8px", minWidth: "120px",
      backgroundColor: `${color}20`, border: `1px solid ${color}`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{count}</div>
      <div style={{ fontSize: "14px", color: "#666" }}>{label}</div>
    </div>
  );
}

function ResourceSection({ title, diff }) {
  if (!diff) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <h3>{title}</h3>
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <SummaryCard label="Create" count={diff.create?.length ?? diff.create ?? 0} color={ACTION_COLORS.create} />
        <SummaryCard label="Update" count={diff.update?.length ?? diff.update ?? 0} color={ACTION_COLORS.update} />
        <SummaryCard label="Skip" count={diff.skip?.length ?? diff.skip ?? 0} color={ACTION_COLORS.skip} />
      </div>
      {/* Update 상세: 변경된 필드 표시 */}
      {Array.isArray(diff.update) && diff.update.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Changed Fields</th>
            </tr>
          </thead>
          <tbody>
            {diff.update.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px" }}>{item.name}</td>
                <td style={{ padding: "8px" }}>
                  {(item._changedFields || []).map((f) => (
                    <span key={f} style={{
                      backgroundColor: "#fef3c7", padding: "2px 6px",
                      borderRadius: "4px", marginRight: "4px", fontSize: "12px",
                    }}>{f}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Create 상세 */}
      {Array.isArray(diff.create) && diff.create.length > 0 && (
        <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
          New: {diff.create.map((i) => i.name).join(", ")}
        </div>
      )}
    </div>
  );
}

function ExecuteResults({ results }) {
  if (!results) return null;

  const sections = [
    { key: "categories", title: "Categories" },
    { key: "connectionTemplates", title: "Connection Templates" },
    { key: "skillTemplates", title: "Skill Templates" },
  ];

  return (
    <div>
      <h3>실행 결과</h3>
      {sections.map(({ key, title }) => {
        const items = results[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key} style={{ marginBottom: "16px" }}>
            <h4>{title}</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Action</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px" }}>{item.name}</td>
                    <td style={{ padding: "8px" }}>{item.action}</td>
                    <td style={{ padding: "8px", color: item.success ? ACTION_COLORS.create : ACTION_COLORS.failed }}>
                      {item.success ? "Success" : item.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function Reconcile() {
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [executeResult, setExecuteResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDryRun = async () => {
    setLoading(true);
    setError(null);
    setExecuteResult(null);
    try {
      const result = await reconcileDryRun();
      setDryRunResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!window.confirm("Backoffice 데이터를 API Server에 동기화합니다. 계속하시겠습니까?")) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reconcileExecute();
      setExecuteResult(result);
      setDryRunResult(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = dryRunResult && (
    dryRunResult.summary.categories.create + dryRunResult.summary.categories.update +
    dryRunResult.summary.connectionTemplates.create + dryRunResult.summary.connectionTemplates.update +
    dryRunResult.summary.skillTemplates.create + dryRunResult.summary.skillTemplates.update
  ) > 0;

  return (
    <div>
      <h2>Reconcile</h2>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Backoffice 템플릿 데이터를 API Server에 동기화합니다.
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button onClick={handleDryRun} disabled={loading}
          style={{ padding: "8px 24px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          {loading ? "Loading..." : "Dry Run"}
        </button>
        {hasChanges && (
          <button onClick={handleExecute} disabled={loading}
            style={{ padding: "8px 24px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            Execute
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #ef4444", borderRadius: "6px", marginBottom: "16px", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {dryRunResult && (
        <div>
          <ResourceSection title="Categories" diff={dryRunResult.diff.categories} />
          <ResourceSection title="Connection Templates" diff={dryRunResult.diff.connectionTemplates} />
          <ResourceSection title="Skill Templates" diff={dryRunResult.diff.skillTemplates} />
        </div>
      )}

      {executeResult && <ExecuteResults results={executeResult.results} />}

      {executeResult?.stopped && (
        <div style={{ padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #ef4444", borderRadius: "6px", marginTop: "16px", color: "#ef4444" }}>
          동기화가 중간에 멈췄습니다. 실패 항목을 확인 후 다시 실행하세요.
        </div>
      )}
    </div>
  );
}
```

---

## CL-007.3-04: 라우팅 + API 클라이언트 확장

### 수정 — `src/backoffice-api.js`

기존 export 함수들 아래에 추가:

```javascript
// Reconciliation
export async function reconcileDryRun() {
  return request("/api/backoffice/reconcile", {
    method: "POST",
    body: JSON.stringify({ mode: "dry-run" }),
  });
}

export async function reconcileExecute() {
  return request("/api/backoffice/reconcile", {
    method: "POST",
    body: JSON.stringify({ mode: "execute" }),
  });
}
```

### 수정 — `src/App.jsx`

import 블록에 추가:

```javascript
import Reconcile from "./pages/Reconcile.jsx";
```

`<Routes>` 내부, 기존 backoffice 라우트 아래에 추가:

```jsx
<Route path="/reconcile" element={<Reconcile />} />
```

### 수정 — `src/components/Layout.jsx`

사이드바 NAV 배열의 Backoffice 섹션에 추가:

```javascript
{ path: "/reconcile", label: "Reconcile", icon: "🔄" },
```

---

## 구현 순서 (v1.0.0)

1. **CL-007.3-01**: `src/services/reconcile.js` 작성
2. **CL-007.3-02**: `src/routes/backoffice/reconcile.js` 작성 + `server.js` 수정
3. **CL-007.3-04**: `src/backoffice-api.js`, `src/App.jsx`, `src/components/Layout.jsx` 수정
4. **CL-007.3-03**: `src/pages/Reconcile.jsx` 작성
5. 서버 재시작 → TC-007.3-01~10 테스트

---

# v1.1.0 Delta — delete 케이스 추가

> CL-007.3-01 (서비스) + CL-007.3-03 (UI)에 delete diff/execute 기능 추가.
> TC-007.3-11~13 대응.

---

## CL-007.3-01 수정: delete diff + execute

### 수정 1 — `diffResource()` delete 배열 추가

**파일**: `src/services/reconcile.js`
**위치**: `diffResource()` 함수 끝, `return { create, update, skip };` 직전

```javascript
// 현재 (84행):
  return { create, update, skip };

// 변경 후:
  // Target에만 있는 항목 = delete 대상
  const sourceIds = new Set(sourceItems.map((item) => item.id));
  const del = targetItems.filter((item) => !sourceIds.has(item.id));

  return { create, update, skip, delete: del };
```

**JSDoc 반환 타입도 수정** (86행):
```javascript
// 현재:
 * @returns {{ create: Array, update: Array, skip: Array }}
// 변경 후:
 * @returns {{ create: Array, update: Array, skip: Array, delete: Array }}
```

### 수정 2 — summary에 delete 카운트 추가

**위치**: `reconcile()` 내 summary 계산 (199행)

```javascript
// 현재:
    summary[key] = { create: d.create.length, update: d.update.length, skip: d.skip.length };

// 변경 후:
    summary[key] = { create: d.create.length, update: d.update.length, skip: d.skip.length, delete: d.delete.length };
```

### 수정 3 — `deleteTarget()` 신규 함수

**위치**: `upsertTarget()` 함수 뒤 (166행 다음)

```javascript
/**
 * API Server에서 리소스 삭제
 */
async function deleteTarget(apiServerUrl, adminSecret, resource, id) {
  const url = `${apiServerUrl}/api/internal/admin/${resource}/${id}`;
  const resp = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DELETE /${resource}/${id} failed: ${resp.status} — ${text}`);
  }
}
```

### 수정 4 — Execute에 delete 단계 추가

**위치**: upsert 루프 종료 후 (232행), `executeSummary` 계산 전

```javascript
  // 5. Delete: FK 역순 (skillTemplates → connectionTemplates → categories)
  const DELETE_ORDER = [
    { key: "skillTemplates", resource: "skill-templates" },
    { key: "connectionTemplates", resource: "connection-templates" },
    { key: "categories", resource: "categories" },
  ];

  for (const { key, resource } of DELETE_ORDER) {
    if (stopped) break;
    for (const item of diff[key].delete) {
      try {
        await deleteTarget(apiServerUrl, adminSecret, resource, item.id);
        results[key].push({ id: item.id, name: item.name, action: "delete", success: true });
      } catch (err) {
        results[key].push({ id: item.id, name: item.name, action: "delete", success: false, error: err.message });
        stopped = true;
        break;
      }
    }
  }
```

**제약 추가**:
- **(D) Delete FK 역순 필수**: skillTemplates → connectionTemplates → categories. 정순이면 FK 제약 위반.
- **(D) Delete = hard delete**: Prisma `delete()`. deprecatedAt(경고 뱃지)과 다름.
- **(C) API Server 계약**: DELETE `/api/internal/admin/{resource}/{id}` → 204 (CL-012.11-13).

---

## CL-007.3-03 수정: UI에 delete 표시

### 수정 1 — `SummaryCard` delete 뱃지 추가

**파일**: `src/pages/Reconcile.jsx`
**위치**: `SummaryCard` 컴포넌트 (10행)

```jsx
// 현재:
function SummaryCard({ label, create, update, skip }) {
  // ...
        <Badge variant="secondary">{skip} skip</Badge>
      </div>

// 변경 후:
function SummaryCard({ label, create, update, skip, delete: del }) {
  // ...
        <Badge variant="secondary">{skip} skip</Badge>
        {del > 0 && <Badge variant="destructive">{del} delete</Badge>}
      </div>
```

### 수정 2 — `DiffDetail` delete 항목 표시

**위치**: `DiffDetail` 컴포넌트 (27행)

```jsx
// 현재:
  const hasCreate = diff.create?.length > 0;
  const hasUpdate = diff.update?.length > 0;
  if (!hasCreate && !hasUpdate) return null;

// 변경 후:
  const hasCreate = diff.create?.length > 0;
  const hasUpdate = diff.update?.length > 0;
  const hasDelete = diff.delete?.length > 0;
  if (!hasCreate && !hasUpdate && !hasDelete) return null;
```

**tbody 안, update 행 뒤에 추가**:

```jsx
          {diff.delete?.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2 px-3">{item.name}</td>
              <td className="py-2 px-3"><Badge variant="destructive">delete</Badge></td>
              <td className="py-2 px-3 text-muted-foreground">Target only</td>
            </tr>
          ))}
```

### 수정 3 — `hasChanges`에 delete 포함

**위치**: 163행

```javascript
// 현재:
  const hasChanges = dryRunResult && Object.values(dryRunResult.summary).some(
    (s) => s.create > 0 || s.update > 0
  );

// 변경 후:
  const hasChanges = dryRunResult && Object.values(dryRunResult.summary).some(
    (s) => s.create > 0 || s.update > 0 || s.delete > 0
  );
```

**참고**: `ExecuteResults`는 `item.action` 기반 렌더링이므로 delete 결과도 자동 표시됨. 수정 불필요.

---

## 구현 순서 (v1.1.0)

1. **CL-007.3-01**: `src/services/reconcile.js` 수정 (수정 1~4)
2. **CL-007.3-03**: `src/pages/Reconcile.jsx` 수정 (수정 1~3)
3. 서버 재시작 → TC-007.3-11~12 자동 테스트
4. TC-007.3-13: 대표님 수동 확인

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.1.0 | 2026-03-29 07:13 KST | delete 케이스 추가 (CL-007.3-01 서비스 + CL-007.3-03 UI). TC-007.3-11~13 대응 |
| v1.0.0 | 2026-03-29 02:31 KST | 최초 작성. 스키마 필드 보정(description, icon, deprecatedAt) 반영 완료 상태 |
