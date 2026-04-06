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

## RJSF + dependencies/oneOf 템플릿 작성 [2026-04-04]

조건부 필드가 있는 Skill/Connection 템플릿 작성 시 반드시 지킬 3가지:

- **조건부 필드는 `dependencies.oneOf[].properties`에 둔다**: top-level `properties`에 두면 분기와 무관하게 항상 표시됨. 숨기려면 dependency 내부로 이동
- **`dependencies.{key}`에 `properties`+`oneOf` 동시 사용 금지**: RJSF가 트리거 필드의 enum을 교집합으로 좁혀서 라디오에 현재 활성 브랜치 값만 남음(다른 옵션 사라짐). 공통 필드는 각 oneOf 분기에 복제 — `custom_api.md`가 정답 패턴
- **oneOf 분기 트리거 필드는 `default` 필수**: 없으면 초기 렌더링 시 어느 분기도 활성 안 돼서 조건부 필드 안 보임

정답 패턴: `templates/connection/custom_api.md`. 적용 사례: `templates/skill/call_transfer.md`.

---

# 5. 지식 — 이 직원만 필요한 사실

## 시스템 환경

- **소스**: `/home/ubuntu/cloudpersona/cloudpersona-admin` (GitHub: `cloudpersona-admin`)
- **서버**: `http://localhost:3058`
- **RTM**: `https://rtm.cloudpersona.ai/yourq/ad` (AD 서브프로젝트)
- **설계 SSOT = KB #113** (arc42 아키텍처 문서)
- **Account/Member 접근 = API Server 경유**: BFF 프록시 → `/api/internal/admin/*`
- **템플릿 접근 = 자체 Prisma**: Backoffice DB(`yourq_backoffice.template` 스키마) 직접 CRUD
- **API 타입 SSOT = `src/types/api-types.ts`** [KB #161, 2026-04-06]: API 호출 타입은 반드시 api-types.ts에서 import. 수동 `interface`/`type` 선언 금지. 재생성: `npm run gen:api`.

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

## Connection Template과 authType [대표님 2026-04-04]

- **authType = 라우팅 키**: Admin은 저장만. Console(UI 분기)과 FC(런타임 인증)가 소비
- **custom_api**: `api_key`, `bearer`, `basic` 3개. oauth2는 HTTP Request에서 안 씀
- **oauth2**: 전용 Connection Template에서만 사용 (google_calendar, google_sheets 등). 서비스 1개 = Template 1개. 사용자는 scope을 모르므로 템플릿에 미리 설정
- **`none`은 authType이 아님** — 스킬에서 Connection을 안 고르면 그게 none
- **name 필드는 jsonSchema(spec) 내에 포함** — Connection Instance 식별용, 스킬에서 이름으로 선택
- **Admin은 맥락 불필요**: 폼 구조(jsonSchema/uiSchema)만 정의. 인증 플로우 등 맥락은 Console이 알아야 함
- **serviceType 용도 재검토 예정** — 전체 연동 후 결정
- **카테고리는 용도 기반**: 벤더명(Google, Microsoft) 아닌 업계 표준 분류 — Productivity, CRM, Telephony, Custom 등
- **템플릿 파일**: `templates/connection/`, `templates/skill/`. md 파일로 jsonSchema+uiSchema 관리

### 테스트 (Vitest, 21개 파일)

- **FR-AD-007.1**: Backoffice CRUD 통합테스트 (spec 검증, CRUD, FK 무결성)
- **FR-AD-007.3**: Reconciliation 단위테스트 (diff, FK 순서, 실패 멈춤, UI 정적검증)
