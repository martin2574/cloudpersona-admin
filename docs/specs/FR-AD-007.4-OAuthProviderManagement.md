# FR-AD-007.4 — OAuth Provider 관리 + ConnectionTemplate OAuth 확장 구현 명세서

> Version: v1.0.0 | Updated: 2026-04-07 KST

## RTM 추적

| 항목 | 값 |
|------|-----|
| FR | FR-AD-007 (Backoffice 템플릿 관리) |
| Sub-FR | FR-AD-007.4 (OAuth Provider 관리 UI + ConnectionTemplate OAuth 확장) |
| CL | CL-007.4-01 ~ CL-007.4-05 |
| 브랜치 | `FR-AD-007.4` |
| 선행 | API Server oauth-providers CRUD API 완료 |
| Handoff | `2026-04-06-REQUEST-console-to-admin-oauth-provider-ui.md` (answered) |

---

## 0. 사전 준비

### 0.1 API 타입 재생성

API Server에 OAuth Provider API가 추가되었으므로 타입을 재생성한다.

```bash
# API Server 실행 확인
curl -sf http://localhost:3057/openapi.json > /dev/null

# 타입 재생성
npm run gen:api

# 변경 확인
git diff src/types/api-types.ts
```

재생성 후 `paths`에 `/api/internal/admin/oauth-providers` 관련 경로와 `components.schemas`에 OAuth Provider 스키마가 추가되어야 한다.

### 0.2 Prisma 마이그레이션

ConnectionTemplate에 OAuth 관련 필드를 추가한다.

```bash
npx prisma migrate dev --name add-oauth-fields-to-connection-template --schema prisma/backoffice/schema.prisma
```

---

## 1. CL-007.4-01: API 클라이언트 + Prisma 확장

### 1.1 Prisma 스키마 — `prisma/backoffice/schema.prisma`

ConnectionTemplate 모델에 2개 필드 추가:

```prisma
model ConnectionTemplate {
  id           String    @id @default(uuid()) @db.Uuid
  serviceType  String    @map("service_type") @db.VarChar
  name         String    @db.VarChar
  description  String    @default("")
  version      String    @default("1.0.0") @db.VarChar
  categoryId   String    @map("category_id") @db.VarChar
  icon         String?   @db.VarChar
  spec         Json      @default("{}")
  authMethod   String    @default("credential") @map("auth_method") @db.VarChar
  oauthProviderId String? @map("oauth_provider_id") @db.Uuid
  oauthScopes    String[] @default([]) @map("oauth_scopes")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  deprecatedAt DateTime? @map("deprecated_at") @db.Timestamptz

  category       Category        @relation(fields: [categoryId], references: [id])
  skillTemplates SkillTemplate[]

  @@unique([serviceType, version])
  @@map("connection_templates")
  @@schema("template")
}
```

**추가 필드**:
- `oauthProviderId`: OAuth Provider UUID (nullable — credential일 때 null)
- `oauthScopes`: 선택된 scope 배열 (PostgreSQL text[], 기본 빈 배열)

### 1.2 API 클라이언트 — `src/api.ts`

OAuth Provider CRUD 함수를 추가한다. BFF catch-all 프록시(`server.ts:82`)가 `/api/oauth-providers/*` → API Server `/api/internal/admin/oauth-providers/*`로 자동 포워딩하므로 전용 프록시 라우트는 불필요하다.

```typescript
// ── OAuth Providers (BFF 프록시 → API Server) ──

export function getOAuthProviders(): Promise<unknown> {
  return request("/oauth-providers");
}

export function getOAuthProvider(id: string): Promise<unknown> {
  return request(`/oauth-providers/${id}`);
}

export function createOAuthProvider(data: Record<string, unknown>): Promise<unknown> {
  return request("/oauth-providers", { method: "POST", body: JSON.stringify(data) });
}

export function updateOAuthProvider(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/oauth-providers/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteOAuthProvider(id: string): Promise<unknown> {
  return request(`/oauth-providers/${id}`, { method: "DELETE" });
}
```

**위치**: `api.ts` 하단, `getStats()` 위에 추가.

**데이터 소스**: API Server `oauth_providers` 테이블 (yourq DB). Backoffice DB(Prisma)와 무관. BFF 프록시 경유.

---

## 2. CL-007.4-02: 라우팅 + 사이드바

### 2.1 사이드바 — `src/components/Layout.tsx`

`KeyRound` 아이콘 import 추가 + Backoffice 그룹에 OAuth Providers 메뉴 삽입 (Connections 바로 아래, Skills 위):

```typescript
import {
  Building2,
  Users,
  LayoutDashboard,
  Sun,
  Moon,
  Blocks,
  Cable,
  KeyRound,
  Wrench,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
```

NAV 배열 Backoffice 섹션:

```typescript
{
  section: "Backoffice",
  items: [
    { to: "/backoffice/categories", label: "Categories", icon: Blocks },
    { to: "/backoffice/connection-templates", label: "Connections", icon: Cable },
    { to: "/backoffice/oauth-providers", label: "OAuth Providers", icon: KeyRound },
    { to: "/backoffice/skill-templates", label: "Skills", icon: Wrench },
    { to: "/backoffice/reconcile", label: "Reconcile", icon: RefreshCw },
  ],
},
```

### 2.2 라우트 — `src/App.tsx`

2개 라우트 추가 + import:

```typescript
import OAuthProviders from "@/pages/OAuthProviders";
import OAuthProviderDetail from "@/pages/OAuthProviderDetail";
```

children 배열에 추가 (connection-templates 라우트 뒤, skill-templates 앞):

```typescript
{ path: "/backoffice/oauth-providers", element: <OAuthProviders /> },
{ path: "/backoffice/oauth-providers/:id", element: <OAuthProviderDetail /> },
```

---

## 3. CL-007.4-03: OAuth Providers 목록 페이지

### `src/pages/OAuthProviders.tsx` (신규)

ConnectionTemplates.tsx 패턴을 따르되 Backoffice API가 아닌 BFF API(`api.ts`)를 사용한다.

```tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { getOAuthProviders, deleteOAuthProvider } from "@/api";
import type { AdminRecord } from "@/types/admin";
import { toast } from "sonner";

interface OAuthProvider extends AdminRecord {
  provider: string;
  displayName: string;
  isActive: boolean;
}

const COLUMNS: DataTableColumn<AdminRecord>[] = [
  {
    key: "provider",
    label: "Provider",
    render: (v) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
        {v as string}
      </code>
    ),
  },
  { key: "displayName", label: "Display Name" },
  {
    key: "isActive",
    label: "Active",
    render: (v) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {v ? "Active" : "Inactive"}
      </span>
    ),
    sortable: false,
  },
];

export default function OAuthProviders() {
  const navigate = useNavigate();
  const [data, setData] = useState<OAuthProvider[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    getOAuthProviders()
      .then((r) => {
        const list = (Array.isArray(r) ? r : (r as { data?: unknown[] }).data ?? []) as OAuthProvider[];
        setData(list);
      })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search
    ? data.filter(
        (d) =>
          d.provider.toLowerCase().includes(search.toLowerCase()) ||
          d.displayName.toLowerCase().includes(search.toLowerCase()),
      )
    : data;

  async function handleDelete(row: AdminRecord) {
    const provider = row as OAuthProvider;
    if (!confirm(`Delete "${provider.displayName}"?`)) return;
    try {
      await deleteOAuthProvider(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">OAuth Providers</h2>
        <Button onClick={() => navigate("/backoffice/oauth-providers/new")}>
          + New Provider
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search provider, display name..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          className="max-w-xs"
        />
      </div>

      <DataTable<AdminRecord>
        columns={COLUMNS}
        data={filtered}
        onRowClick={(row) =>
          navigate(`/backoffice/oauth-providers/${row.id}`)
        }
        page={1}
        total={filtered.length}
        limit={filtered.length || 20}
        onPageChange={() => {}}
        actions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
          >
            Delete
          </Button>
        )}
      />
    </div>
  );
}
```

**참고**: OAuth Provider는 레퍼런스 데이터(수십 개 수준)이므로 서버 페이지네이션 없이 전체 로드 + 클라이언트 필터링. API 응답 형태(배열 vs `{ data: [] }`)에 따라 방어적 파싱.

---

## 4. CL-007.4-04: OAuth Provider 생성/편집 폼

### `src/pages/OAuthProviderDetail.tsx` (신규)

ConnectionTemplateDetail.tsx 패턴을 참고하되, Spec Builder/Preview 탭 없이 단일 폼으로 구성.

```tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getOAuthProvider,
  createOAuthProvider,
  updateOAuthProvider,
} from "@/api";
import { toast } from "sonner";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";
import TagInput from "@/components/TagInput";

interface OAuthProviderData {
  id: string;
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl: string;
  scopesAvailable: string[];
  redirectUriBase: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FormState {
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl: string;
  scopesAvailable: string[];
  redirectUriBase: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  provider: "",
  displayName: "",
  clientId: "",
  clientSecret: "",
  authUrl: "",
  tokenUrl: "",
  revokeUrl: "",
  scopesAvailable: [],
  redirectUriBase: "",
  isActive: true,
};

export default function OAuthProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [original, setOriginal] = useState<OAuthProviderData | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const unsavedDialog = useUnsavedChanges(dirty);

  useEffect(() => {
    if (!isNew && id) {
      getOAuthProvider(id)
        .then((r) => {
          const data = r as OAuthProviderData;
          setOriginal(data);
          setForm({
            provider: data.provider,
            displayName: data.displayName,
            clientId: data.clientId,
            clientSecret: "", // API가 마스킹 반환 — 편집 시 빈 값 = 기존값 유지
            authUrl: data.authUrl,
            tokenUrl: data.tokenUrl,
            revokeUrl: data.revokeUrl || "",
            scopesAvailable: data.scopesAvailable || [],
            redirectUriBase: data.redirectUriBase,
            isActive: data.isActive,
          });
          setLoading(false);
        })
        .catch((e: Error) => toast.error(e.message));
    }
  }, [id, isNew]);

  function handleChange(key: keyof FormState, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!form.provider.trim()) return toast.error("Provider is required");
    if (!form.displayName.trim()) return toast.error("Display Name is required");
    if (!form.clientId.trim()) return toast.error("Client ID is required");
    if (isNew && !form.clientSecret.trim())
      return toast.error("Client Secret is required");
    if (!form.authUrl.trim()) return toast.error("Auth URL is required");
    if (!form.tokenUrl.trim()) return toast.error("Token URL is required");
    if (form.scopesAvailable.length === 0)
      return toast.error("At least one scope is required");
    if (!form.redirectUriBase.trim())
      return toast.error("Redirect URI Base is required");

    const payload: Record<string, unknown> = { ...form };
    // 편집 시 clientSecret이 빈 값이면 전송하지 않음 (기존값 유지)
    if (!isNew && !form.clientSecret) {
      delete payload.clientSecret;
    }

    try {
      if (isNew) {
        const created = (await createOAuthProvider(payload)) as OAuthProviderData;
        setDirty(false);
        toast.success("Created");
        navigate(`/backoffice/oauth-providers/${created.id}`, { replace: true });
      } else if (id) {
        const updated = (await updateOAuthProvider(id, payload)) as OAuthProviderData;
        setOriginal(updated);
        setForm((prev) => ({ ...prev, clientSecret: "" }));
        setDirty(false);
        toast.success("Saved");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleCancel() {
    if (isNew) {
      navigate("/backoffice/oauth-providers");
      return;
    }
    if (!original) return;
    setForm({
      provider: original.provider,
      displayName: original.displayName,
      clientId: original.clientId,
      clientSecret: "",
      authUrl: original.authUrl,
      tokenUrl: original.tokenUrl,
      revokeUrl: original.revokeUrl || "",
      scopesAvailable: original.scopesAvailable || [],
      redirectUriBase: original.redirectUriBase,
      isActive: original.isActive,
    });
    setDirty(false);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      {unsavedDialog}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/backoffice/oauth-providers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← OAuth Providers
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {isNew ? "New OAuth Provider" : original?.displayName}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isNew ? false : !dirty}
            onClick={handleSave}
          >
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Provider</label>
              <Input
                value={form.provider}
                placeholder="google"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("provider", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                고유 코드 (영소문자, 예: google, slack)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={form.displayName}
                placeholder="Google"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("displayName", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client ID</label>
              <Input
                value={form.clientId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("clientId", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client Secret</label>
              <Input
                type="password"
                value={form.clientSecret}
                placeholder={isNew ? "" : "빈 값이면 기존값 유지"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("clientSecret", e.target.value)
                }
              />
              {!isNew && original?.clientSecret && (
                <p className="text-xs text-muted-foreground mt-1">
                  현재: {original.clientSecret}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Auth URL</label>
              <Input
                value={form.authUrl}
                placeholder="https://accounts.google.com/o/oauth2/v2/auth"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("authUrl", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Token URL</label>
              <Input
                value={form.tokenUrl}
                placeholder="https://oauth2.googleapis.com/token"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("tokenUrl", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Revoke URL</label>
              <Input
                value={form.revokeUrl}
                placeholder="https://oauth2.googleapis.com/revoke (선택)"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("revokeUrl", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Redirect URI Base</label>
              <Input
                value={form.redirectUriBase}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("redirectUriBase", e.target.value)
                }
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Scopes Available</label>
              <TagInput
                value={form.scopesAvailable}
                onChange={(tags) => handleChange("scopesAvailable", tags)}
                placeholder="scope 입력 후 Enter"
              />
              <p className="text-xs text-muted-foreground mt-1">
                이 Provider가 지원하는 scope 목록 (예: spreadsheets, calendar, drive)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Active</label>
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleChange("isActive", e.target.checked)
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>
            </div>
          </div>
          {!isNew && original && (
            <p className="text-xs text-muted-foreground mt-3">
              ID: {original.id}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### `src/components/TagInput.tsx` (신규)

Scopes 입력용 태그 컴포넌트. Enter/쉼표로 태그 추가, 백스페이스로 마지막 태그 삭제, X 버튼으로 개별 삭제.

```tsx
import { useState, type KeyboardEvent, type ChangeEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-10">
      {value.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
      />
    </div>
  );
}
```

**설계 결정 S1 반영**: Tag input 방식 (JSON editor 아닌). `crm.objects.contacts.read` 같은 scope도 처리 가능.

---

## 5. CL-007.4-05: ConnectionTemplate OAuth 조건부 필드

### `src/pages/ConnectionTemplateDetail.tsx` (수정)

`authMethod === "oauth2"` 선택 시 OAuth Provider 드롭다운 + Scopes 멀티셀렉트를 조건부 표시한다.

#### 5.1 import 추가

```typescript
import { getOAuthProviders } from "@/api";
```

#### 5.2 인터페이스 확장

`TemplateData`와 `FormState`에 OAuth 필드 추가:

```typescript
interface OAuthProviderOption {
  id: string;
  provider: string;
  displayName: string;
  scopesAvailable: string[];
  isActive: boolean;
}

interface TemplateData extends AdminRecord {
  name: string;
  serviceType: string;
  version: string;
  categoryId: string;
  authMethod: string;
  oauthProviderId?: string;
  oauthScopes?: string[];
  spec?: Spec;
  createdAt?: string;
}

interface FormState {
  name: string;
  serviceType: string;
  version: string;
  categoryId: string;
  authMethod: string;
  oauthProviderId: string;
  oauthScopes: string[];
}
```

#### 5.3 상태 추가

```typescript
const [oauthProviders, setOAuthProviders] = useState<OAuthProviderOption[]>([]);
```

#### 5.4 useEffect 확장

OAuth Provider 목록을 로드한다. `authMethod === "oauth2"`일 때만 로드하면 초기 렌더링 시점 문제가 생기므로, 항상 로드하되 UI에서만 조건부 표시한다.

기존 useEffect 내 setForm 호출에 OAuth 필드 추가:

```typescript
useEffect(() => {
  // OAuth Providers 목록 로드
  getOAuthProviders()
    .then((r) => {
      const list = (Array.isArray(r) ? r : (r as { data?: unknown[] }).data ?? []) as OAuthProviderOption[];
      setOAuthProviders(list.filter((p) => p.isActive));
    })
    .catch(() => {}); // OAuth Provider 로드 실패해도 기존 폼에 영향 없음

  if (isNew) {
    getCategories()
      .then((cats) => {
        const catsList = (cats ?? []) as Category[];
        setCategories(catsList);
        if (catsList.length > 0)
          setForm((prev) => ({ ...prev, categoryId: catsList[0].id }));
      })
      .catch((e: Error) => toast.error(e.message));
  } else if (id) {
    Promise.all([getConnectionTemplate(id), getCategories()])
      .then(([tmpl, cats]) => {
        const t = tmpl as TemplateData;
        setTemplate(t);
        setCategories((cats ?? []) as Category[]);
        setForm({
          name: t.name,
          serviceType: t.serviceType,
          version: t.version,
          categoryId: t.categoryId,
          authMethod: t.authMethod || "credential",
          oauthProviderId: t.oauthProviderId || "",
          oauthScopes: t.oauthScopes || [],
        });
        setSpec(t.spec || EMPTY_SPEC);
        setLoading(false);
      })
      .catch((e: Error) => toast.error(e.message));
  }
}, [id, isNew]);
```

#### 5.5 authMethod 변경 시 OAuth 필드 초기화

```typescript
function handleFormChange(key: keyof FormState, value: string | string[]) {
  setForm((prev) => {
    const next = { ...prev, [key]: value };
    // authMethod가 credential로 변경되면 OAuth 필드 초기화
    if (key === "authMethod" && value !== "oauth2") {
      next.oauthProviderId = "";
      next.oauthScopes = [];
    }
    // OAuth Provider가 변경되면 scopes 초기화
    if (key === "oauthProviderId") {
      next.oauthScopes = [];
    }
    return next;
  });
  setDirty(true);
}
```

#### 5.6 선택된 Provider의 available scopes 계산

```typescript
const selectedProvider = oauthProviders.find(
  (p) => p.id === form.oauthProviderId,
);
const availableScopes = selectedProvider?.scopesAvailable ?? [];
```

#### 5.7 JSX — OAuth 조건부 필드

Auth Method 드롭다운 `<div>` 바로 아래에 조건부 렌더링 추가:

```tsx
{form.authMethod === "oauth2" && (
  <>
    <div>
      <label className="text-sm font-medium">OAuth Provider</label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={form.oauthProviderId}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          handleFormChange("oauthProviderId", e.target.value)
        }
      >
        <option value="">Select Provider...</option>
        {oauthProviders.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
    </div>
    {form.oauthProviderId && availableScopes.length > 0 && (
      <div className="col-span-2">
        <label className="text-sm font-medium">OAuth Scopes</label>
        <div className="flex flex-wrap gap-2 mt-2 p-3 rounded-md border border-input bg-background">
          {availableScopes.map((scope) => (
            <label
              key={scope}
              className="inline-flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={form.oauthScopes.includes(scope)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = e.target.checked
                    ? [...form.oauthScopes, scope]
                    : form.oauthScopes.filter((s) => s !== scope);
                  handleFormChange("oauthScopes", next);
                }}
                className="rounded border-input"
              />
              <span className="text-sm">{scope}</span>
            </label>
          ))}
        </div>
      </div>
    )}
  </>
)}
```

**위치**: Basic Info Card의 `grid grid-cols-2` 내부, Auth Method `<div>` 직후.

#### 5.8 handleSave 확장

저장 시 OAuth 필드를 payload에 포함:

```typescript
async function handleSave() {
  // ... 기존 검증 ...

  // OAuth2 선택 시 추가 검증
  if (form.authMethod === "oauth2") {
    if (!form.oauthProviderId)
      return toast.error("OAuth Provider is required");
    if (form.oauthScopes.length === 0)
      return toast.error("At least one OAuth Scope is required");
  }

  // payload 구성
  const payload = {
    ...form,
    spec,
    // credential일 때는 OAuth 필드 제외
    ...(form.authMethod !== "oauth2"
      ? { oauthProviderId: null, oauthScopes: [] }
      : {}),
  };

  // ... 기존 save 로직 ...
}
```

#### 5.9 handleCancel 확장

```typescript
function handleCancel() {
  if (isNew) {
    navigate("/backoffice/connection-templates");
    return;
  }
  if (!template) return;
  setForm({
    name: template.name,
    serviceType: template.serviceType,
    version: template.version,
    categoryId: template.categoryId,
    authMethod: template.authMethod || "credential",
    oauthProviderId: template.oauthProviderId || "",
    oauthScopes: template.oauthScopes || [],
  });
  setSpec(template.spec || EMPTY_SPEC);
  setDirty(false);
}
```

#### 5.10 초기 FormState 기본값

```typescript
const [form, setForm] = useState<FormState>({
  name: "",
  serviceType: "",
  version: "0.1.0",
  categoryId: "",
  authMethod: "credential",
  oauthProviderId: "",
  oauthScopes: [],
});
```

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1.0.0 | 2026-04-07 | 초기 작성 — CL-007.4-01 ~ 05 전체 |
