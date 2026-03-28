# FR-AD-007.2 — 템플릿 관리 UI 구현 명세서

> Version: v1.0.0 | Updated: 2026-03-28 13:17 KST

## RTM 추적

| 항목 | 값 |
|------|-----|
| FR | FR-AD-007 (Backoffice 템플릿 관리) |
| Sub-FR | FR-AD-007.2 (Admin 템플릿 관리 UI) |
| CL | CL-007.2-01 ~ CL-007.2-08 |
| 브랜치 | `FR-AD-007.2` |
| 선행 | FR-AD-007.1 (Backoffice API) — done, PR #3 머지 완료 |

---

## 0. 사전 준비

### 0.1 의존성 설치

```bash
# Spec Builder (ginkgo-bioworks FormBuilder + MUI peer deps)
npm install @ginkgo-bioworks/react-json-schema-form-builder \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled

# RJSF Preview (@yourq/rjsf-theme + peer deps)
npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8
```

`package.json`에 `@yourq/rjsf-theme` 추가:

```json
"dependencies": {
  "@yourq/rjsf-theme": "file:../cloudpersona-ui/packages/rjsf-theme"
}
```

### 0.2 환경변수

`.env`에 추가:

```
VITE_ADMIN_API_SECRET=PmuZMZ2INEj/tgfvwszods7y2zkc1iTGcXmxnkxEitM=
```

Vite는 `VITE_` 접두사만 클라이언트에 노출. Admin은 내부 도구(VPN 뒤)이므로 번들 노출 허용.

### 0.3 Backoffice API 모듈 — `src/backoffice-api.js` (신규)

기존 `src/api.js`는 BFF 프록시 경로(`/api/*` → API Server) 전용.
Backoffice 라우트(`/api/backoffice/*`)는 `x-admin-secret` 인증이 필요하므로 별도 모듈.

```js
// src/backoffice-api.js
const BASE = "/api/backoffice";
const SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": SECRET,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.errors?.[0]?.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Categories ──

export function getCategories() {
  return request("/categories");
  // 반환: Category[] (배열, 페이지네이션 없음)
}

export function getCategory(id) {
  return request(`/categories/${id}`);
}

export function createCategory(data) {
  return request("/categories", { method: "POST", body: JSON.stringify(data) });
}

export function updateCategory(id, data) {
  return request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: "DELETE" });
}

// ── Connection Templates ──

export function getConnectionTemplates(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.search) qs.set("search", params.search);
  return request(`/connection-templates?${qs}`);
  // 반환: { data: ConnectionTemplate[], total, page, limit }
}

export function getConnectionTemplate(id) {
  return request(`/connection-templates/${id}`);
}

export function createConnectionTemplate(data) {
  return request("/connection-templates", { method: "POST", body: JSON.stringify(data) });
}

export function updateConnectionTemplate(id, data) {
  return request(`/connection-templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteConnectionTemplate(id) {
  return request(`/connection-templates/${id}`, { method: "DELETE" });
}

// ── Skill Templates ──

export function getSkillTemplates(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.search) qs.set("search", params.search);
  return request(`/skill-templates?${qs}`);
  // 반환: { data: SkillTemplate[], total, page, limit }
}

export function getSkillTemplate(id) {
  return request(`/skill-templates/${id}`);
}

export function createSkillTemplate(data) {
  return request("/skill-templates", { method: "POST", body: JSON.stringify(data) });
}

export function updateSkillTemplate(id, data) {
  return request(`/skill-templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteSkillTemplate(id) {
  return request(`/skill-templates/${id}`, { method: "DELETE" });
}
```

---

## 1. CL-007.2-01: 라우팅 + 사이드바 네비게이션

### 파일: `src/App.jsx` (수정)

**변경**: 5개 라우트 추가 + 4개 페이지 import 추가.

```jsx
// 기존 import 아래에 추가
import Categories from "@/pages/Categories";
import ConnectionTemplates from "@/pages/ConnectionTemplates";
import ConnectionTemplateDetail from "@/pages/ConnectionTemplateDetail";
import SkillTemplates from "@/pages/SkillTemplates";
import SkillTemplateDetail from "@/pages/SkillTemplateDetail";

// <Route element={<Layout />}> 내부, 기존 Members 라우트 다음에 추가
<Route path="/backoffice/categories" element={<Categories />} />
<Route path="/backoffice/connection-templates" element={<ConnectionTemplates />} />
<Route path="/backoffice/connection-templates/:id" element={<ConnectionTemplateDetail />} />
<Route path="/backoffice/skill-templates" element={<SkillTemplates />} />
<Route path="/backoffice/skill-templates/:id" element={<SkillTemplateDetail />} />
```

### 파일: `src/components/Layout.jsx` (수정)

**변경**: NAV 배열에 "Backoffice" 섹션 추가. `lucide-react` 아이콘 import 추가.

```jsx
// import 추가 (기존 LayoutDashboard, Building2, Users에 3개 추가)
import { LayoutDashboard, Building2, Users, Blocks, Cable, Wrench } from "lucide-react";

// NAV 배열에 추가 (기존 Account 섹션 다음)
{
  section: "Backoffice",
  items: [
    { to: "/backoffice/categories", label: "Categories", icon: Blocks },
    { to: "/backoffice/connection-templates", label: "Connections", icon: Cable },
    { to: "/backoffice/skill-templates", label: "Skills", icon: Wrench },
  ],
},
```

---

## 2. CL-007.2-02: Category 목록 페이지

### 파일: `src/pages/Categories.jsx` (신규)

Categories API는 페이지네이션 없이 전체 배열 반환. FormDialog 인라인 CRUD.

```jsx
import { useState, useEffect, useCallback } from "react";
import { Button, Input } from "@yourq/ui";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS = [
  { key: "id", label: "ID", render: (v) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
  { key: "name", label: "Name" },
  { key: "icon", label: "Icon" },
  { key: "sortOrder", label: "Sort Order" },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

const FIELDS = [
  { key: "id", label: "ID (slug)", placeholder: "e.g. telephony", required: true },
  { key: "name", label: "Name", required: true },
  { key: "icon", label: "Icon", placeholder: "e.g. phone.svg" },
  { key: "sortOrder", label: "Sort Order", placeholder: "0", type: "text" },
];

// 편집 시 id 읽기 전용
const EDIT_FIELDS = FIELDS.map((f) => (f.key === "id" ? { ...f, readOnly: true } : f));

export default function Categories() {
  const [data, setData] = useState([]);
  const [dialog, setDialog] = useState({ open: false, editing: null });

  const load = useCallback(() => {
    getCategories()
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(formData) {
    try {
      const payload = { ...formData, sortOrder: parseInt(formData.sortOrder) || 0 };
      if (dialog.editing) {
        await updateCategory(dialog.editing.id, payload);
        toast.success("Category updated");
      } else {
        await createCategory(payload);
        toast.success("Category created");
      }
      setDialog({ open: false, editing: null });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete category "${row.name}"?`)) return;
    try {
      await deleteCategory(row.id);
      toast.success("Category deleted");
      load();
    } catch (e) {
      toast.error(e.message); // 409: "참조 중인 템플릿이 있습니다"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => setDialog({ open: true, editing: null })}>+ New Category</Button>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        total={data.length}
        actions={(row) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDialog({ open: true, editing: row })}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
              Delete
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, editing: dialog.editing })}
        title={dialog.editing ? "Edit Category" : "New Category"}
        fields={dialog.editing ? EDIT_FIELDS : FIELDS}
        initialData={dialog.editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

---

## 3. CL-007.2-03: Connection Template 목록 페이지

### 파일: `src/pages/ConnectionTemplates.jsx` (신규)

검색, 카테고리 필터, 페이지네이션. 행 클릭 → 상세. [+ 새 템플릿] → 기본값 POST → 상세 리다이렉트.

```jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import DataTable from "@/components/DataTable";
import {
  getConnectionTemplates,
  createConnectionTemplate,
  deleteConnectionTemplate,
  getCategories,
} from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "serviceType", label: "Service Type", render: (v) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
  { key: "version", label: "Version" },
  { key: "category", label: "Category", render: (_, row) => row.category?.name ?? "—", sortable: false },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

export default function ConnectionTemplates() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    getConnectionTemplates(params)
      .then((r) => { setData(r.data); setTotal(r.total); })
      .catch((e) => toast.error(e.message));
  }, [page, search, categoryId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    try {
      if (categories.length === 0) {
        toast.error("카테고리를 먼저 생성해주세요");
        return;
      }
      const result = await createConnectionTemplate({
        serviceType: "new_service",
        name: "새 Connection Template",
        version: "0.1.0",
        categoryId: categories[0].id,
        spec: {
          jsonSchema: { type: "object", properties: {} },
          uiSchema: {},
        },
      });
      navigate(`/backoffice/connection-templates/${result.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteConnectionTemplate(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e.message); // 409: "참조 중인 Skill Template이 있습니다"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Connection Templates</h2>
        <Button onClick={handleCreate}>+ New Template</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search name, serviceType..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        onRowClick={(row) => navigate(`/backoffice/connection-templates/${row.id}`)}
        page={page}
        total={total}
        limit={20}
        onPageChange={setPage}
        actions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        )}
      />
    </div>
  );
}
```

---

## 4. CL-007.2-04: Skill Template 목록 페이지

### 파일: `src/pages/SkillTemplates.jsx` (신규)

CL-007.2-03과 동일 패턴. `connectionTemplate` 컬럼 추가.

```jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import DataTable from "@/components/DataTable";
import {
  getSkillTemplates,
  createSkillTemplate,
  deleteSkillTemplate,
  getCategories,
} from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "skillType", label: "Skill Type", render: (v) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
  { key: "version", label: "Version" },
  { key: "category", label: "Category", render: (_, row) => row.category?.name ?? "—", sortable: false },
  { key: "connectionTemplate", label: "Connection", render: (_, row) => row.connectionTemplate?.name ?? "—", sortable: false },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

export default function SkillTemplates() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    getSkillTemplates(params)
      .then((r) => { setData(r.data); setTotal(r.total); })
      .catch((e) => toast.error(e.message));
  }, [page, search, categoryId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    try {
      if (categories.length === 0) {
        toast.error("카테고리를 먼저 생성해주세요");
        return;
      }
      const result = await createSkillTemplate({
        skillType: "new_skill",
        name: "새 Skill Template",
        version: "0.1.0",
        categoryId: categories[0].id,
        spec: {
          jsonSchema: { type: "object", properties: {} },
          uiSchema: {},
        },
      });
      navigate(`/backoffice/skill-templates/${result.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteSkillTemplate(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Skill Templates</h2>
        <Button onClick={handleCreate}>+ New Template</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search name, skillType..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        onRowClick={(row) => navigate(`/backoffice/skill-templates/${row.id}`)}
        page={page}
        total={total}
        limit={20}
        onPageChange={setPage}
        actions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        )}
      />
    </div>
  );
}
```

---

## 5. CL-007.2-05: Spec Builder 컴포넌트

### 파일: `src/components/SpecBuilder.jsx` (신규)

ginkgo-bioworks FormBuilder 래퍼. GUI ↔ JSON 양방향 동기화.
MUI는 이 컴포넌트 내부에서만 사용 (ADR: MUI 공존 허용).

```jsx
import { useState, useCallback } from "react";
import { FormBuilder } from "@ginkgo-bioworks/react-json-schema-form-builder";
import { Button } from "@yourq/ui";
import { validateSpec } from "@/lib/schema-validator";

/**
 * @param {{ jsonSchema: object, uiSchema: object, onChange: (jsonSchema: object, uiSchema: object) => void }} props
 */
export default function SpecBuilder({ jsonSchema, uiSchema, onChange }) {
  // FormBuilder는 string schema/uischema를 사용
  const [schemaStr, setSchemaStr] = useState(JSON.stringify(jsonSchema, null, 2));
  const [uiSchemaStr, setUiSchemaStr] = useState(JSON.stringify(uiSchema, null, 2));
  const [showRaw, setShowRaw] = useState(false);
  const [errors, setErrors] = useState([]);

  // FormBuilder onChange → 부모에 object로 전달
  const handleFormBuilderChange = useCallback(
    (newSchema, newUiSchema) => {
      setSchemaStr(newSchema);
      setUiSchemaStr(newUiSchema);
      try {
        const parsed = JSON.parse(newSchema);
        const parsedUi = JSON.parse(newUiSchema);
        const result = validateSpec({ jsonSchema: parsed, uiSchema: parsedUi });
        setErrors(result.errors);
        onChange(parsed, parsedUi);
      } catch {
        // JSON 파싱 에러 — FormBuilder가 중간 상태일 수 있음
      }
    },
    [onChange],
  );

  // Raw JSON 편집 → FormBuilder + 부모에 반영
  function handleRawChange(field, value) {
    if (field === "jsonSchema") setSchemaStr(value);
    else setUiSchemaStr(value);

    try {
      const js = field === "jsonSchema" ? JSON.parse(value) : JSON.parse(schemaStr);
      const ui = field === "uiSchema" ? JSON.parse(value) : JSON.parse(uiSchemaStr);
      const result = validateSpec({ jsonSchema: js, uiSchema: ui });
      setErrors(result.errors);
      onChange(js, ui);
    } catch {
      setErrors([{ layer: 0, field, message: "Invalid JSON" }]);
    }
  }

  return (
    <div className="space-y-4">
      {/* GUI Builder */}
      <div className="border rounded-lg p-4">
        <FormBuilder
          schema={schemaStr}
          uischema={uiSchemaStr}
          onChange={handleFormBuilderChange}
        />
      </div>

      {/* 검증 에러 표시 */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive mb-1">Validation Errors</p>
          <ul className="text-xs text-destructive space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>Layer {e.layer}: [{e.field}] {e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw JSON 토글 */}
      <div>
        <Button variant="outline" size="sm" onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
        </Button>
      </div>

      {showRaw && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">JSON Schema</label>
            <textarea
              className="w-full h-64 font-mono text-xs border rounded-md p-2 bg-muted/30"
              value={schemaStr}
              onChange={(e) => handleRawChange("jsonSchema", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">UI Schema</label>
            <textarea
              className="w-full h-64 font-mono text-xs border rounded-md p-2 bg-muted/30"
              value={uiSchemaStr}
              onChange={(e) => handleRawChange("uiSchema", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 주의사항

- `FormBuilder`는 `schema`와 `uischema`를 **JSON 문자열**로 받고, `onChange(schema, uischema)` 콜백도 **문자열**을 반환.
- MUI 스타일이 Admin의 Tailwind와 충돌할 경우, `SpecBuilder` 래퍼에 `className="mui-scope"` 추가하고 CSS isolation 적용 (구현 시 확인 후 필요할 때만).
- `validateSpec`은 `src/lib/schema-validator.js` (FR-AD-007.1) 재사용.

---

## 6. CL-007.2-06: Preview 컴포넌트

### 파일: `src/components/SpecPreview.jsx` (신규)

좌: RJSF 폼 렌더링, 우: Result JSON. `@yourq/rjsf-theme`의 `RjsfForm` 사용.

```jsx
import { useState } from "react";
import { RjsfForm } from "@yourq/rjsf-theme";
import "@yourq/rjsf-theme/styles.css";

/**
 * @param {{ jsonSchema: object, uiSchema: object }} props
 */
export default function SpecPreview({ jsonSchema, uiSchema }) {
  const [formData, setFormData] = useState({});

  const hasProperties = jsonSchema?.properties && Object.keys(jsonSchema.properties).length > 0;

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* 좌: RJSF Form */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Form Preview</h3>
        {hasProperties ? (
          <RjsfForm
            schema={jsonSchema}
            uiSchema={uiSchema}
            formData={formData}
            onChange={setFormData}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No properties defined. Add fields in the Edit tab.
          </p>
        )}
      </div>

      {/* 우: Result JSON */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Result JSON</h3>
        <pre className="text-xs font-mono bg-muted/30 rounded-md p-3 overflow-auto max-h-96">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
```

---

## 7. CL-007.2-07: Connection Template 상세/편집 페이지

### 파일: `src/pages/ConnectionTemplateDetail.jsx` (신규)

Edit 탭 (Basic Info + SpecBuilder) / Preview 탭. PUT으로 저장.

```jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpecBuilder from "@/components/SpecBuilder";
import SpecPreview from "@/components/SpecPreview";
import {
  getConnectionTemplate,
  updateConnectionTemplate,
  getCategories,
} from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ConnectionTemplateDetail() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    version: "",
    categoryId: "",
  });
  const [spec, setSpec] = useState({ jsonSchema: {}, uiSchema: {} });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.all([getConnectionTemplate(id), getCategories()])
      .then(([tmpl, cats]) => {
        setTemplate(tmpl);
        setCategories(cats);
        setForm({
          name: tmpl.name,
          serviceType: tmpl.serviceType,
          version: tmpl.version,
          categoryId: tmpl.categoryId,
        });
        setSpec(tmpl.spec || { jsonSchema: { type: "object", properties: {} }, uiSchema: {} });
      })
      .catch((e) => toast.error(e.message));
  }, [id]);

  function handleFormChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSpecChange(jsonSchema, uiSchema) {
    setSpec({ jsonSchema, uiSchema });
    setDirty(true);
  }

  async function handleSave() {
    try {
      const updated = await updateConnectionTemplate(id, { ...form, spec });
      setTemplate(updated);
      setDirty(false);
      toast.success("Saved");
    } catch (e) {
      toast.error(e.message);
    }
  }

  function handleCancel() {
    if (!template) return;
    setForm({
      name: template.name,
      serviceType: template.serviceType,
      version: template.version,
      categoryId: template.categoryId,
    });
    setSpec(template.spec || { jsonSchema: { type: "object", properties: {} }, uiSchema: {} });
    setDirty(false);
  }

  if (!template) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/backoffice/connection-templates" className="text-sm text-muted-foreground hover:text-foreground">
          ← Connection Templates
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{template.name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!dirty} onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!dirty} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6 mt-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Service Type</label>
                  <Input value={form.serviceType} onChange={(e) => handleFormChange("serviceType", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Version</label>
                  <Input value={form.version} onChange={(e) => handleFormChange("version", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.categoryId}
                    onChange={(e) => handleFormChange("categoryId", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ID: {template.id} | Created: {formatDate(template.createdAt)}
              </p>
            </CardContent>
          </Card>

          {/* Spec Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Spec Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <SpecBuilder
                jsonSchema={spec.jsonSchema}
                uiSchema={spec.uiSchema}
                onChange={handleSpecChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <SpecPreview jsonSchema={spec.jsonSchema} uiSchema={spec.uiSchema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 8. CL-007.2-08: Skill Template 상세/편집 페이지

### 파일: `src/pages/SkillTemplateDetail.jsx` (신규)

CL-007.2-07과 동일 구조. **차이점**: `connectionTemplateId` 드롭다운 (nullable).

```jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpecBuilder from "@/components/SpecBuilder";
import SpecPreview from "@/components/SpecPreview";
import {
  getSkillTemplate,
  updateSkillTemplate,
  getCategories,
  getConnectionTemplates,
} from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function SkillTemplateDetail() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [categories, setCategories] = useState([]);
  const [connections, setConnections] = useState([]);
  const [form, setForm] = useState({
    name: "",
    skillType: "",
    version: "",
    categoryId: "",
    connectionTemplateId: "",
  });
  const [spec, setSpec] = useState({ jsonSchema: {}, uiSchema: {} });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.all([
      getSkillTemplate(id),
      getCategories(),
      getConnectionTemplates({ limit: 100 }),
    ])
      .then(([tmpl, cats, conns]) => {
        setTemplate(tmpl);
        setCategories(cats);
        setConnections(conns.data);
        setForm({
          name: tmpl.name,
          skillType: tmpl.skillType,
          version: tmpl.version,
          categoryId: tmpl.categoryId,
          connectionTemplateId: tmpl.connectionTemplateId || "",
        });
        setSpec(tmpl.spec || { jsonSchema: { type: "object", properties: {} }, uiSchema: {} });
      })
      .catch((e) => toast.error(e.message));
  }, [id]);

  function handleFormChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSpecChange(jsonSchema, uiSchema) {
    setSpec({ jsonSchema, uiSchema });
    setDirty(true);
  }

  async function handleSave() {
    try {
      const payload = {
        ...form,
        connectionTemplateId: form.connectionTemplateId || null,
        spec,
      };
      const updated = await updateSkillTemplate(id, payload);
      setTemplate(updated);
      setDirty(false);
      toast.success("Saved");
    } catch (e) {
      toast.error(e.message);
    }
  }

  function handleCancel() {
    if (!template) return;
    setForm({
      name: template.name,
      skillType: template.skillType,
      version: template.version,
      categoryId: template.categoryId,
      connectionTemplateId: template.connectionTemplateId || "",
    });
    setSpec(template.spec || { jsonSchema: { type: "object", properties: {} }, uiSchema: {} });
    setDirty(false);
  }

  if (!template) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/backoffice/skill-templates" className="text-sm text-muted-foreground hover:text-foreground">
          ← Skill Templates
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{template.name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!dirty} onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!dirty} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6 mt-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Skill Type</label>
                  <Input value={form.skillType} onChange={(e) => handleFormChange("skillType", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Version</label>
                  <Input value={form.version} onChange={(e) => handleFormChange("version", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.categoryId}
                    onChange={(e) => handleFormChange("categoryId", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Connection Template</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.connectionTemplateId}
                    onChange={(e) => handleFormChange("connectionTemplateId", e.target.value)}
                  >
                    <option value="">None (no connection required)</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.serviceType})</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ID: {template.id} | Created: {formatDate(template.createdAt)}
              </p>
            </CardContent>
          </Card>

          {/* Spec Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Spec Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <SpecBuilder
                jsonSchema={spec.jsonSchema}
                uiSchema={spec.uiSchema}
                onChange={handleSpecChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <SpecPreview jsonSchema={spec.jsonSchema} uiSchema={spec.uiSchema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### CL-007.2-07과의 차이점

| 항목 | Connection Template Detail | Skill Template Detail |
|------|---------------------------|----------------------|
| Basic Info 필드 | name, serviceType, version, categoryId | name, skillType, version, categoryId, **connectionTemplateId** |
| connectionTemplateId | 없음 | 드롭다운 (nullable, "None" 옵션) |
| 드롭다운 데이터 | categories만 | categories + connectionTemplates |
| 저장 시 | `{ ...form, spec }` | `{ ...form, connectionTemplateId: value \|\| null, spec }` |

---

## 변경 이력

| 버전 | 일시 | 변경 |
|------|------|------|
| v1.0.0 | 2026-03-28 13:17 KST | 최초 작성 |
