# FR-AD-001.1: Account 도메인을 관리한다 — 구현 스펙

Version: v1.0.0 | Updated: 2026-03-24 12:00 KST

## 개요

기존 Prisma 직접 접근 → API Server 내부 API 경유(BFF) 전환.
FR-CS-014.1 Admin API가 이미 구현되어 있으므로, server.js를 BFF로 교체하고 프론트엔드를 응답 포맷에 맞게 조정.

---

## CL-001.1-01: BFF 공통 인프라

### 삭제 파일

| 파일 | 이유 |
|------|------|
| `prisma/schema.prisma` | Admin에서 Prisma 제거 |
| `prisma.config.ts` | Admin에서 Prisma 제거 |
| `generated/` | Prisma 생성 파일 |

### `server.js` — 전면 재작성

기존: Prisma + TABLE_META 제네릭 CRUD
변경: API Server 프록시 BFF

```javascript
import "dotenv/config";
import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3058;
const API_SERVER = process.env.API_SERVER_URL || "http://localhost:3057";
const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

app.use(express.json());

// BFF 프록시: /api/* → API Server /api/internal/admin/*
app.all("/api/{*path}", async (req, res) => {
  const url = `${API_SERVER}/api/internal/admin/${req.params.path}${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`;
  try {
    const resp = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      ...(["POST", "PUT", "PATCH"].includes(req.method) && { body: JSON.stringify(req.body) }),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "API Server 연결 실패" });
  }
});

// SPA 정적 파일
app.use(express.static(join(__dirname, "dist")));
app.get("{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log(`YourQ Admin running on port ${PORT}`));
```

### `src/api.js` — 응답 포맷 대응

기존 api.js의 인터페이스는 유지하되, API Server PaginatedResponse 포맷에 맞게 조정.

```javascript
const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }
  return res.json();
}

// 목록 조회 — API Server PaginatedResponse 반환
// { data: [...], pagination: { page, limit, total, totalPages } }
export function getList(table, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.accountId) qs.set("accountId", params.accountId);
  return request(`/${table}?${qs}`);
}

// 상세 조회
export function getRecord(table, id) {
  return request(`/${table}/${id}`);
}

// 상태 변경
export function updateRecord(table, id, data) {
  return request(`/${table}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// Member 잠금 해제
export function unlockMember(id) {
  return request(`/members/${id}/unlock`, { method: "PATCH" });
}

// Dashboard 통계
export function getStats() {
  return request("/stats");
}
```

**변경점 요약:**
- `getList` 반환: `{ data, total, page, limit }` → `{ data, pagination: { page, limit, total, totalPages } }`
- `createRecord`, `deleteRecord`, `getEnums`, `getRelations` 제거 (FR-CS-014.1 범위 외)
- `updateRecord` → `PATCH` (기존 `PUT`)

### `src/components/DataTable.jsx`

변경 없음. 기존 props (data, page, total, onPageChange) 그대로 사용.
호출부에서 `pagination.total` → `total` prop으로 매핑.

### `src/components/FormDialog.jsx`

유지. Account 상태 변경 다이얼로그에서 사용.

### `src/components/Layout.jsx`

사이드바 메뉴 축소:
- Overview: Dashboard
- Account: Accounts, Members
- ~~Auth: Auth Tokens~~ (FR-AD-001.2로 이동)
- ~~Workspaces~~ (FR-AD-001.2로 이동)

### `.env` 변경

```
PORT=3058
API_SERVER_URL=http://localhost:3057
ADMIN_API_SECRET={API Server와 동일한 값}
```

`DATABASE_URL` 제거.

### `systemd` 환경변수 변경

```ini
Environment=PORT=3058
Environment=API_SERVER_URL=http://localhost:3057
Environment=ADMIN_API_SECRET={값}
Environment=NODE_ENV=production
```

`DATABASE_URL` 제거.

### `package.json` 의존성 정리

제거:
- `pg`
- `@prisma/client`
- `@prisma/adapter-pg`
- `dotenv` (server.js에서 직접 import 불필요, systemd 환경변수 사용)

---

## CL-001.1-02: Account 페이지

### API Server 응답 포맷

**GET /admin/accounts** (목록):
```json
{
  "data": [{ "id", "name", "slug", "status", "createdAt", "updatedAt", "_count": { "members", "workspaces" } }],
  "pagination": { "page", "limit", "total", "totalPages" }
}
```

**GET /admin/accounts/:id** (상세):
```json
{ "id", "name", "slug", "status", "createdAt", "updatedAt", "_count": { "members", "workspaces" } }
```

**PATCH /admin/accounts/:id** (상태 변경):
```json
요청: { "status": "active" | "suspended" | "deleted" }
응답: { "id", "name", "slug", "status", "createdAt", "updatedAt" }
```

### `src/pages/Dashboard.jsx`

**변경:**
API Server에 `/admin/stats` 엔드포인트 없음 (확인됨). BFF에서 조합.

BFF `server.js`에 stats 전용 라우트 추가:
```javascript
app.get("/api/stats", async (req, res) => {
  const headers = { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET };
  const [accounts, members] = await Promise.all([
    fetch(`${API_SERVER}/api/internal/admin/accounts?limit=1`, { headers }).then(r => r.json()),
    fetch(`${API_SERVER}/api/internal/admin/members?limit=1`, { headers }).then(r => r.json()),
  ]);
  res.json({
    accounts: accounts.pagination.total,
    members: members.pagination.total,
  });
});
```

Dashboard는 이 2개 카운트만 표시. 기존 7개 카드에서 축소 (activeAccounts, suspendedAccounts, lockedMembers 등은 API Server에서 제공하지 않음).

### `src/pages/Accounts.jsx`

**변경:**
- `getList("accounts", { page, limit, status, search })` 호출
- 응답 매핑: `r.data` → 테이블 데이터, `r.pagination.total` → total prop
- `_count.members`, `_count.workspaces` 컬럼 추가
- `createRecord`, `deleteRecord` 호출 제거 (FR-CS-014.1에 생성/삭제 없음)
- 기존 `sort` 파라미터 제거 (API Server는 createdAt desc 고정)

### `src/pages/AccountDetail.jsx`

**변경:**
- `getRecord("accounts", id)` → 상세 조회
- 상태 변경: `updateRecord("accounts", id, { status })` (PATCH)
- Members 탭: `getList("members", { accountId: id })` 로 해당 Account의 Member 조회
- Workspaces 탭 제거 (FR-AD-001.2로 이동)

---

## CL-001.1-03: Member 페이지

### API Server 응답 포맷

**GET /admin/members** (목록):
```json
{
  "data": [{ "id", "email", "name", "emailVerified", "failedLoginAttempts", "lockedUntil", "isOwner", "createdAt", "updatedAt", "account": { "id", "name", "slug" } }],
  "pagination": { "page", "limit", "total", "totalPages" }
}
```

**GET /admin/members/:id** (상세):
```json
{ "id", "email", "name", "emailVerified", "failedLoginAttempts", "lockedUntil", "isOwner", "createdAt", "updatedAt",
  "account": { "id", "name", "slug", "status" },
  "memberIdentities": [{ "id", "provider", "providerEmail", "createdAt" }],
  "memberPermissions": [{ "permission": { "id", "code", "description" } }]
}
```

**PATCH /admin/members/:id/unlock**:
```json
{ "id", "email", "name", "failedLoginAttempts": 0, "lockedUntil": null, "updatedAt" }
```

### `src/pages/Members.jsx`

**변경:**
- `getList("members", { page, limit, search, accountId })` 호출
- 응답 매핑: `r.data`, `r.pagination.total`
- `account.name` 컬럼 (Account 링크)
- 잠금 상태 뱃지: `lockedUntil && new Date(lockedUntil) > new Date()`
- 잠금 해제: `unlockMember(id)` → 목록 새로고침
- 기존 `sort` 파라미터 제거

### `src/pages/MemberDetail.jsx`

**변경:**
- `getRecord("members", id)` → 상세 조회
- 기본 정보 카드: email, name, emailVerified, isOwner, account, 잠금 상태
- 잠금 해제 버튼: `unlockMember(id)`
- Identities 탭: `memberIdentities` 배열 직접 표시 (별도 API 호출 불필요)
- Permissions 탭: `memberPermissions[].permission` 배열 직접 표시
- Auth Tokens 탭 제거 (FR-AD-001.2로 이동)

---

## 라우팅 변경 (App.jsx)

```
/             → Dashboard
/accounts     → Accounts
/accounts/:id → AccountDetail
/members      → Members
/members/:id  → MemberDetail
```

제거:
- ~~/workspaces~~ (FR-AD-001.2)
- ~~/auth-tokens~~ (FR-AD-001.2)

---

## 빌드 + 배포

1. `npm run build` (Vite → dist/)
2. systemd 환경변수 변경 (DATABASE_URL → API_SERVER_URL + ADMIN_API_SECRET)
3. `sudo systemctl restart yourq-admin`
4. 검증: `curl -s localhost:3058/api/accounts` → API Server 경유 응답 확인
