import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// TC-007.3-09: 라우트 등록 확인

describe("TC-007.3-09: 라우트 등록 확인", () => {
  it("App.tsx에 /backoffice/reconcile 라우트가 등록되어 있다", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../../../src/App.tsx"),
      "utf-8"
    );
    expect(src).toContain("/backoffice/reconcile");
    expect(src).toContain("Reconcile");
  });

  it("Layout.tsx 사이드바에 Reconcile 메뉴가 있다", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../../../src/components/Layout.tsx"),
      "utf-8"
    );
    expect(src).toContain("/backoffice/reconcile");
    expect(src).toContain('"Reconcile"');
    expect(src).toContain("RefreshCw");
  });

  it("server.ts에 /api/backoffice/reconcile 라우트가 등록되어 있다", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../../../server.ts"),
      "utf-8"
    );
    expect(src).toContain('"/api/backoffice/reconcile"');
    expect(src).toContain("reconcileRouter");
  });

  it("server.ts에 RECONCILE_ENVS 환경 맵이 정의되어 있다", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../../../server.ts"),
      "utf-8"
    );
    expect(src).toContain("RECONCILE_ENVS");
    expect(src).toContain("API_SERVER_TEST_URL");
    expect(src).toContain("API_SERVER_PROD_URL");
  });
});
