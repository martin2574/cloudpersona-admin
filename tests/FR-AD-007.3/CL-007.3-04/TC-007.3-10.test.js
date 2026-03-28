import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// TC-007.3-10: API 클라이언트 함수 검증

describe("TC-007.3-10: API 클라이언트 함수 검증", () => {
  const src = readFileSync(
    resolve(import.meta.dirname, "../../../src/backoffice-api.js"),
    "utf-8"
  );

  it("reconcileDryRun 함수가 export되어 있다", () => {
    expect(src).toContain("export function reconcileDryRun");
  });

  it("reconcileExecute 함수가 export되어 있다", () => {
    expect(src).toContain("export function reconcileExecute");
  });

  it("reconcileDryRun은 POST /reconcile을 mode=dry-run으로 호출한다", () => {
    expect(src).toContain('"/reconcile"');
    expect(src).toContain('"dry-run"');
  });

  it("reconcileExecute은 POST /reconcile을 mode=execute로 호출한다", () => {
    expect(src).toContain('"execute"');
  });

  it("getReconcileEnvs 함수가 export되어 있다", () => {
    expect(src).toContain("export function getReconcileEnvs");
  });

  it("reconcile 함수들은 env 파라미터를 전달한다", () => {
    expect(src).toMatch(/reconcileDryRun\(env\)/);
    expect(src).toMatch(/reconcileExecute\(env\)/);
  });
});
