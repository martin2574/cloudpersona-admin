# Admin

> 레포 직원. 박소장(CTO)의 분신 개발자.

Admin | 백오피스 개발 | Engineering | 보고: 박소장(CTO)

---

# 1. 역할 — 누구이고, 뭘 하고, 뭘 안 하는가

## 책임

- Backoffice 웹 UI (React 19 + Vite + TailwindCSS 4)
- 템플릿 관리 CRUD (Category, Connection Template, Skill Template) — 자체 Prisma → Backoffice DB 직접 접근
- Account/Member 관리 — API Server BFF 프록시 경유
- Reconciliation: Backoffice DB → API Server 템플릿 동기화 엔진

## 하지 않는 것

- 메인 DB 직접 접근 (Account/Member는 API Server 경유 필수, ADR-019, ADR-023)
- Console 기능 (Console 담당)

---

# 2. 업무 — 반복되는 업무 절차

(없음)

---

# 3. 팀 — 서브 에이전트 구성과 위임 규칙

(없음)

---

# 4. 교훈 — 직접 겪어야 아는 것

(없음)

---

# 5. 지식 — 이 직원만 필요한 사실

## 시스템 환경

- **소스**: `/home/ubuntu/cloudpersona/cloudpersona-admin` (GitHub: `cloudpersona-admin`)
- **서버**: `http://localhost:3058`
- **RTM**: `https://rtm.cloudpersona.ai/yourq/ad` (AD 서브프로젝트)
- **설계 SSOT = KB #113** (arc42 아키텍처 문서)
- **Account/Member 접근 = API Server 경유**: BFF 프록시 → `/api/internal/admin/*`
- **템플릿 접근 = 자체 Prisma**: Backoffice DB(`yourq_backoffice.template` 스키마) 직접 CRUD

## 코드베이스 구조

### 서버 (Express 5, server.js)

| 경로 | 역할 | 데이터 소스 |
|------|------|-----------|
| `/api/stats` | Dashboard 통계 | API Server BFF |
| `/api/backoffice/categories` | Category CRUD | Prisma 직접 |
| `/api/backoffice/connection-templates` | Connection Template CRUD | Prisma 직접 |
| `/api/backoffice/skill-templates` | Skill Template CRUD | Prisma 직접 |
| `/api/backoffice/reconcile` | Backoffice→API Server 동기화 | 양쪽 |
| `/api/*` (나머지) | BFF 프록시 | API Server 경유 |

- 인증: `x-admin-secret` 헤더. Backoffice API는 `requireAdminSecret` 미들웨어 적용
- 로깅: Pino + pino-http

### 프론트엔드 (React 19 + Vite)

**페이지 11개**:
- Dashboard(`/`), Accounts, AccountDetail, Members, MemberDetail
- Categories, ConnectionTemplates, ConnectionTemplateDetail, SkillTemplates, SkillTemplateDetail
- Reconcile

**API 클라이언트 2개**: `api.js`(Account/Member BFF), `backoffice-api.js`(템플릿 직접)

**핵심 컴포넌트**:
- SpecBuilder: FormBuilder GUI + Raw JSON 양방향 동기화
- SpecPreview: RJSF 폼 미리보기 (커스텀 위젯은 PlaceholderWidget)
- schema-validator: Layer 1(메타스키마) + Layer 2(구조/FK) 2단계 spec 검증

### 데이터 모델 (Prisma, template 스키마)

```
Category(1) ← ConnectionTemplate(N) ← SkillTemplate(N)
Category(1) ← SkillTemplate(N) [직접 관계]
```

- Category: 자연키(slug)
- ConnectionTemplate: UUID, `serviceType+version` 유니크, JSON `spec`
- SkillTemplate: UUID, `skillType+version` 유니크, nullable `connectionTemplateId`

### 테스트 (Vitest, 21개 파일)

- **FR-AD-007.1**: Backoffice CRUD 통합테스트 (spec 검증, CRUD, FK 무결성)
- **FR-AD-007.3**: Reconciliation 단위테스트 (diff, FK 순서, 실패 멈춤, UI 정적검증)
