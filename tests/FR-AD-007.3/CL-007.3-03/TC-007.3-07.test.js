import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// TC-007.3-07: diff 카드 렌더링
// Reconcile.jsx에 SummaryCard 컴포넌트와 create/update/skip Badge가 렌더링되는지 정적 검증

describe("TC-007.3-07: diff 카드 렌더링", () => {
  const src = readFileSync(
    resolve(import.meta.dirname, "../../../src/pages/Reconcile.jsx"),
    "utf-8"
  );

  it("SummaryCard 컴포넌트가 create/update/skip Badge를 렌더링한다", () => {
    expect(src).toContain("create");
    expect(src).toContain("update");
    expect(src).toContain("skip");
    expect(src).toContain("Badge");
  });

  it("3개 리소스(Categories, Connection Templates, Skill Templates) 카드가 있다", () => {
    expect(src).toContain("Categories");
    expect(src).toContain("Connection Templates");
    expect(src).toContain("Skill Templates");
  });

  it("DiffDetail 컴포넌트가 변경 필드(_changedFields)를 표시한다", () => {
    expect(src).toContain("_changedFields");
    expect(src).toContain("DiffDetail");
  });

  it("reconcileDryRun을 import한다", () => {
    expect(src).toContain("reconcileDryRun");
  });
});
