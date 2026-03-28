# FR-AD-000.2 Admin 디자인 시스템 마이그레이션 — 구현 명세서

> Version: v1.0.0 | Updated: 2026-03-28 09:39 KST
> RTM: FR-AD-000.2 (Id: 130) | 상위: FR-AD-000 (Id: 175)
> 레포: cloudpersona-admin | 브랜치: FR-AD-000.2

## 추적 경로

| 계층 | ID | RTM Id |
|------|-----|--------|
| FR | FR-AD-000 | 175 |
| Sub-FR | FR-AD-000.2 | 130 |
| CL | CL-000.2-01 | 447 |
| CL | CL-000.2-02 | 448 |
| CL | CL-000.2-03 | 449 |
| TC | TC-000.2-01 | 797 |
| TC | TC-000.2-02 | 798 |
| TC | TC-000.2-03 | 799 |

---

## CL-000.2-01: Tailwind 4 마이그레이션 + @yourq/tokens 적용

### 1. package.json

**devDependencies 제거:**

```
"tailwindcss": "^3.4.17"
"postcss": "^8.5.1"
"autoprefixer": "^10.4.20"
"@tailwindcss/forms": "^0.5.10"
```

**devDependencies 추가:**

```
"tailwindcss": "^4.0.0"
"@tailwindcss/vite": "^4.0.0"
```

**dependencies 추가:**

```
"@yourq/tokens": "file:../cloudpersona-ui/packages/tokens"
"tw-animate-css": "^1.2.0"
```

### 2. 파일 삭제

| 파일 | 이유 |
|------|------|
| `tailwind.config.js` | TW4는 CSS-first. @yourq/tokens의 @theme inline이 대체 |
| `postcss.config.js` | @tailwindcss/vite가 PostCSS 대체 |

### 3. vite.config.js

**변경 전:**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
```

**변경 후:**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
```

### 4. src/globals.css

**변경 전 (전체 파일):**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**변경 후 (전체 파일):**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@yourq/tokens/styles.css";

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

**설명:**

- @yourq/tokens/styles.css가 :root, .dark, @theme inline, @layer base 전부 포함
- HSL 분리값(`0 0% 100%`) → 완전값(`#FFFFFF`) 전환은 @yourq/tokens가 처리
- `--destructive-foreground`만 Admin 추가 (badge.jsx에서 사용, @yourq/tokens에 미포함)
- `tw-animate-css` = Dialog 애니메이션용 (animate-in/out, fade, zoom, slide)
  - 현재 Admin에 tailwindcss-animate 미설치 → 기존에도 애니메이션 미동작 → 오히려 개선

---

## CL-000.2-02: @yourq/ui 공유 컴포넌트 적용

### 1. package.json

**dependencies 추가:**

```
"@yourq/ui": "file:../cloudpersona-ui/packages/ui"
"@base-ui/react": "^1.2.0"
```

**dependencies 제거:**

```
"@radix-ui/react-slot": "^1.1.1"
"clsx": "^2.1.1"
"tailwind-merge": "^2.6.0"
```

**dependencies 버전 업데이트:**

```
"lucide-react": "^0.474.0" → "^0.577.0"
```

**dependencies 유지 (변경 없음):**

```
"class-variance-authority": "^0.7.1"   ← badge.jsx가 직접 import
```

**@base-ui/react 필요 이유:** @yourq/ui Button이 내부적으로 `@base-ui/react/button` 사용. tsup external로 빌드되어 런타임에 필요.

**@radix-ui/react-slot 제거 근거:** button.jsx(삭제 대상)에서만 사용. `asChild` 실사용처 0건 (button.jsx 정의만, 소비자 없음).

### 2. 파일 삭제

| 파일 | 이유 |
|------|------|
| `src/components/ui/button.jsx` | @yourq/ui Button으로 교체 |
| `src/components/ui/input.jsx` | @yourq/ui Input으로 교체 |

### 3. src/lib/utils.js

**변경 전:**

```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function shortId(id) {
```

**변경 후:**

```js
export { cn } from "@yourq/ui";

export function shortId(id) {
```

나머지 함수(shortId, formatDate, isExpired) 변경 없음.

### 4. 소비자 import 변경

| 파일 | 기존 import | 변경 후 |
|------|-----------|--------|
| `src/pages/Accounts.jsx` | `import { Button } from "@/components/ui/button"` + `import { Input } from "@/components/ui/input"` | `import { Button, Input } from "@yourq/ui"` |
| `src/pages/Members.jsx` | `import { Button } from "@/components/ui/button"` + `import { Input } from "@/components/ui/input"` | `import { Button, Input } from "@yourq/ui"` |
| `src/pages/AccountDetail.jsx` | `import { Button } from "@/components/ui/button"` | `import { Button } from "@yourq/ui"` |
| `src/pages/MemberDetail.jsx` | `import { Button } from "@/components/ui/button"` | `import { Button } from "@yourq/ui"` |
| `src/components/DataTable.jsx` | `import { Button } from "@/components/ui/button"` | `import { Button } from "@yourq/ui"` |
| `src/components/FormDialog.jsx` | `import { Button } from "@/components/ui/button"` + `import { Input } from "@/components/ui/input"` | `import { Button, Input } from "@yourq/ui"` |

### 5. 호환성 참고 — 시각적 변화

**variant 호환 (이름 동일, 6종 모두 지원):**

| variant | Admin (기존) | @yourq/ui | 비고 |
|---------|-------------|-----------|------|
| default | `bg-primary text-primary-foreground hover:bg-primary/90` | `bg-primary text-primary-foreground hover:bg-primary/80` | 호버 투명도만 차이 |
| destructive | `bg-destructive text-destructive-foreground` (꽉 찬 빨간) | `bg-destructive/10 text-destructive` (연한 배경) | **스타일 변경** — Console 디자인 |
| outline | 유사 | 유사 + dark 모드 개선 | |
| secondary | 동일 패턴 | 동일 패턴 | |
| ghost | 유사 | 유사 + aria-expanded 지원 | |
| link | 동일 | 동일 | |

**size 차이 (의도적 — Console 기준 통일):**

| size | Admin (기존) | @yourq/ui | 변화 |
|------|------------|-----------|------|
| default | h-10 (40px) | h-8 (32px) | 작아짐 |
| sm | h-9 (36px) | h-7 (28px) | 작아짐 |
| lg | h-11 (44px) | h-9 (36px) | 작아짐 |
| icon | h-10 w-10 (40px) | size-8 (32px) | 작아짐 |

→ TC-000.2-03에서 수동 확인

---

## CL-000.2-03: Admin 전용 컴포넌트 TW4 호환성 업데이트

### 1. ring-offset 패턴 교체

TW4에서 `ring-offset-*` 유틸리티 제거됨. Console 방식으로 교체.

**dialog.jsx — DialogPrimitive.Close (L32):**

변경 전:

```
ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

변경 후:

```
transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
```

**tabs.jsx — TabsTrigger (L16~17):**

변경 전:

```
ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

변경 후:

```
transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
```

**tabs.jsx — TabsContent (L26):**

변경 전:

```
ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

변경 후:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
```

**badge.jsx — badgeVariants base (L4):**

변경 전:

```
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

변경 후:

```
focus:outline-none focus:ring-2 focus:ring-ring/50
```

### 2. 변경 없음 확인 — 호환 컴포넌트

| 파일 | 사용 클래스 | TW4 호환 |
|------|-----------|---------|
| `card.jsx` | bg-card, text-card-foreground, shadow-sm, rounded-lg | ✓ @theme inline 등록 |
| `Layout.jsx` | bg-card, bg-accent, text-muted-foreground, hover:bg-accent | ✓ @theme inline 등록 |
| `DataTable.jsx` | bg-muted/50, text-muted-foreground, hover:bg-muted/50 | ✓ 표준 유틸리티 |
| `FormDialog.jsx` | border-input, bg-background (인라인 select) | ✓ @theme inline 등록 |

### 3. dialog.jsx — 애니메이션

사용 클래스: `animate-in`, `animate-out`, `fade-in-0`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`, `slide-in-from-*`, `slide-out-to-*`

→ CL-000.2-01에서 `tw-animate-css` 추가로 동작. 현재 Admin에 tailwindcss-animate 미설치이므로 기존에도 미동작. 마이그레이션으로 개선.

### 4. badge.jsx — destructive-foreground

`text-destructive-foreground` 사용 → CL-000.2-01 globals.css에서 `--destructive-foreground` + @theme inline `--color-destructive-foreground` 추가로 해결.

---

## TC 검증 계획

### TC-000.2-01: TW4 빌드 + tokens 검증 (자동)

```bash
cd /home/ubuntu/cloudpersona/cloudpersona-admin
npm install
npm run build
# exit code 0 확인
# dist/assets/*.css에 --primary, --background 토큰 존재 확인
# dist/assets/*.css에 bg-primary, text-foreground 유틸리티 생성 확인
```

### TC-000.2-02: @yourq/ui 교체 검증 (자동)

```bash
cd /home/ubuntu/cloudpersona/cloudpersona-admin
npm run build                                         # exit code 0
ls src/components/ui/button.jsx 2>&1 | grep -c "No"   # 파일 미존재
ls src/components/ui/input.jsx 2>&1 | grep -c "No"    # 파일 미존재
grep -r 'from "@yourq/ui"' src/                       # import 존재
grep -c '@radix-ui/react-slot' package.json            # 0 (미사용)
```

### TC-000.2-03: Admin 전용 컴포넌트 렌더링 (수동)

대표님 수동 확인 항목:

| # | 검증 포인트 | 확인 방법 |
|---|-----------|----------|
| 1 | 빌드 성공 | `npm run build` exit code 0 |
| 2 | Dashboard Card | border/shadow 정상 |
| 3 | Accounts DataTable | 정렬/페이지네이션 동작 |
| 4 | 다크 모드 | 토글 시 light↔dark 정상 |
| 5 | Dialog | 열기/닫기 + 오버레이 + 애니메이션 |
| 6 | Button variant 6종 | default/destructive/outline/secondary/ghost/link 색상·호버·비활성 |
| 7 | Button size | default/sm/lg/icon 크기·패딩·정렬 |

---

## 변경 이력

| 버전 | 일시 | 변경 |
|------|------|------|
| v1.0.0 | 2026-03-28 09:39 KST | 초안 |
