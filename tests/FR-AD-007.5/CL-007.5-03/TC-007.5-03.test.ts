import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// TC-007.5-03: Reconcile 코드 제거 + UI 메뉴 미존재 검증

const ROOT = join(import.meta.dirname, "..", "..", "..");

describe("TC-007.5-03: Reconcile 코드 제거 + UI 메뉴 미존재", () => {
  it("src/services/reconcile.ts가 존재하지 않는다", () => {
    expect(existsSync(join(ROOT, "src", "services", "reconcile.ts"))).toBe(false);
  });

  it("src/pages/Reconcile.tsx가 존재하지 않는다", () => {
    expect(existsSync(join(ROOT, "src", "pages", "Reconcile.tsx"))).toBe(false);
  });

  it("Layout.tsx에 Reconcile 메뉴가 없다", () => {
    const content = readFileSync(
      join(ROOT, "src", "components", "Layout.tsx"),
      "utf-8",
    );
    expect(content).not.toContain("Reconcile");
    expect(content).not.toContain("reconcile");
  });

  it("App.tsx에 Reconcile 라우트가 없다", () => {
    const content = readFileSync(join(ROOT, "src", "App.tsx"), "utf-8");
    expect(content).not.toContain("Reconcile");
    expect(content).not.toContain("reconcile");
  });

  it("backoffice-api.ts에 reconcile 함수가 없다", () => {
    const content = readFileSync(
      join(ROOT, "src", "backoffice-api.ts"),
      "utf-8",
    );
    expect(content).not.toContain("reconcile");
    expect(content).not.toContain("Reconcile");
  });
});
