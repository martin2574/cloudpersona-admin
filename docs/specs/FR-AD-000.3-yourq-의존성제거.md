# FR-AD-000.3 @yourq/* 의존성 제거 — 구현 명세서

> Version: v1.0.0 | Updated: 2026-04-06 KST
> RTM: FR-AD-000.3 (Id: 156) | 상위: FR-AD-000 (Id: 175)
> 레포: cloudpersona-admin | 브랜치: FR-AD-000.3

## 추적 경로

| 계층 | ID | RTM Id |
|------|-----|--------|
| FR | FR-AD-000 | 175 |
| Sub-FR | FR-AD-000.3 | 156 |
| CL | CL-000.3-01 | 535 |
| CL | CL-000.3-02 | 536 |
| CL | CL-000.3-03 | 537 |
| TC | TC-000.3-01 | 875 |
| TC | TC-000.3-02 | 876 |
| TC | TC-000.3-03 | 877 |

---

## 실행 순서

CL-000.3-01 → CL-000.3-02 → CL-000.3-03 (순차 필수)

CL-03은 CL-01/02 완료 후에만 실행 가능. @yourq/* import가 남아있는 상태에서 패키지를 제거하면 빌드 실패.

---

## CL-000.3-01: Button, Input, cn 로컬 컴포넌트 생성 + import 전환

### 1. 신규 파일 — src/components/ui/button.tsx

cloudpersona-ui/packages/ui/src/button.tsx 복사. import 경로만 변경:
- `from './utils'` → `from '@/lib/utils'`

### 2. 신규 파일 — src/components/ui/input.tsx

cloudpersona-ui/packages/ui/src/input.tsx 복사. import 경로만 변경:
- `from './utils'` → `from '@/lib/utils'`

### 3. 수정 — src/lib/utils.ts

```typescript
// 변경 전
export { cn } from "@yourq/ui";

// 변경 후
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 4. 삭제 — src/types/yourq-ui.d.ts

전체 삭제. Button/Input 타입이 로컬 소스에 직접 존재.

### 5. import 경로 전환 — 14개 파일

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| hooks/useUnsavedChanges.tsx | `{ Button } from "@yourq/ui"` | `{ Button } from "@/components/ui/button"` |
| components/DataTable.tsx | `{ Button } from "@yourq/ui"` | `{ Button } from "@/components/ui/button"` |
| components/SpecPreview.tsx | `{ Button } from "@yourq/ui"` | `{ Button } from "@/components/ui/button"` |
| pages/AccountDetail.tsx | `{ Button } from "@yourq/ui"` | `{ Button } from "@/components/ui/button"` |
| pages/Categories.tsx | `{ Button } from "@yourq/ui"` | `{ Button } from "@/components/ui/button"` |
| pages/MemberDetail.tsx | `{ Button } from "@yourq/ui"` | `{ Button } from "@/components/ui/button"` |
| components/FormDialog.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |
| pages/Accounts.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |
| pages/ConnectionTemplateDetail.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |
| pages/ConnectionTemplates.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |
| pages/Members.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |
| pages/SkillTemplateDetail.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |
| pages/SkillTemplates.tsx | `{ Button, Input } from "@yourq/ui"` | 2개 import로 분리 |

**분리 패턴:**
```typescript
// 변경 전
import { Button, Input } from "@yourq/ui";

// 변경 후
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

### 검증: TC-000.3-01

```bash
npx tsc --noEmit  # → 0 errors
```

---

## CL-000.3-02: CSS 토큰 인라인 + RJSF 스타일 로컬 복사

### 1. 수정 — src/globals.css

```css
/* 변경 전 */
@import "tailwindcss";
@import "tw-animate-css";
@import "@yourq/tokens/styles.css";

@source "../../cloudpersona-ui/packages/ui/src";
/* Admin 전용 토큰 — @yourq/tokens에 없는 것만 추가 */
:root {
  --destructive-foreground: #FFFFFF;
}
.dark {
  --destructive-foreground: #FFFFFF;
}
@theme inline {
  --color-destructive-foreground: var(--destructive-foreground);
}
```

```css
/* 변경 후 */
@import "tailwindcss";
@import "tw-animate-css";

/* === 디자인 토큰 (기존 @yourq/tokens/styles.css 인라인) === */

/* cloudpersona-ui/packages/tokens/src/globals.css 전체 내용 복사 */
/* :root, .dark, @theme inline, @layer base 포함 */

/* Admin 전용 토큰 */
:root {
  --destructive-foreground: #FFFFFF;
}
.dark {
  --destructive-foreground: #FFFFFF;
}
@theme inline {
  --color-destructive-foreground: var(--destructive-foreground);
}
```

제거 항목:
- `@import "@yourq/tokens/styles.css"` → 인라인으로 대체
- `@source "../../cloudpersona-ui/packages/ui/src"` → 로컬 컴포넌트는 Vite가 자동 스캔

### 2. 신규 파일 — src/styles/rjsf-styles.css

cloudpersona-ui/packages/rjsf-theme/src/rjsf-styles.css 복사 (95줄).

### 3. 수정 — src/components/SpecPreview.tsx

```typescript
// 변경 전
import "@yourq/rjsf-theme/styles.css";

// 변경 후
import "@/styles/rjsf-styles.css";
```

### 검증: TC-000.3-02

```bash
npm run build  # → 성공
npm run start  # → http://localhost:3058 시각적 확인 (수동)
```

---

## CL-000.3-03: package.json @yourq/* 제거 + CI 스텁 제거

### 1. 수정 — package.json

**제거:**
```json
"@yourq/rjsf-theme": "file:../cloudpersona-ui/packages/rjsf-theme",
"@yourq/tokens": "file:../cloudpersona-ui/packages/tokens",
"@yourq/ui": "file:../cloudpersona-ui/packages/ui",
```

**추가:**
```json
"clsx": "^2.1.1",
"tailwind-merge": "^3.5.0",
```

**유지 (변경 없음):**
- `@base-ui/react` — Button/Input 기반
- `class-variance-authority` — Button variant 관리
- `lucide-react` — 아이콘

### 2. 수정 — .github/workflows/quality-gate.yml

"로컬 패키지 스텁" 단계 전체 삭제:

```yaml
# 삭제할 단계
- name: 로컬 패키지 스텁 (@yourq/* = file: 참조라 CI에서 없음)
  run: |
    for pkg in tokens ui rjsf-theme; do
      ...
    done
    printf '...' > node_modules/@yourq/ui/index.js
```

### 3. --legacy-peer-deps 확인

@yourq/* 제거 후 `npm ci` (플래그 없이) 시도. 성공하면 quality-gate.yml에서도 플래그 제거.

### 검증: TC-000.3-03

```bash
rm -rf node_modules && npm ci
npm run lint && npx tsc --noEmit && npx vitest run --exclude '**/FR-AD-007.1/**' && npm run build
# → 전부 성공
# PR push 후 CI quality-gate 4단계 green 확인
```

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0.0 | 2026-04-06 | 초판 |
