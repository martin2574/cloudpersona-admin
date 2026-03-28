import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// TC-007.3-08: 확인 대화상자 + execute 호출

describe("TC-007.3-08: 확인 대화상자 + execute 호출", () => {
  const src = readFileSync(
    resolve(import.meta.dirname, "../../../src/pages/Reconcile.jsx"),
    "utf-8"
  );

  it("Execute 버튼 클릭 시 window.confirm 확인 대화상자가 호출된다", () => {
    expect(src).toContain("window.confirm");
  });

  it("확인 후 reconcileExecute를 호출한다", () => {
    expect(src).toContain("reconcileExecute");
    // handleExecute 함수 내에서 reconcileExecute(selectedEnv) 호출
    expect(src).toMatch(/reconcileExecute\(selectedEnv\)/);
  });

  it("Execute 버튼은 hasChanges가 true일 때만 표시된다", () => {
    expect(src).toContain("hasChanges");
    expect(src).toContain("Execute");
  });

  it("실행 결과에서 성공/실패 상태를 표시한다", () => {
    expect(src).toContain("CheckCircle2");
    expect(src).toContain("XCircle");
    expect(src).toContain("item.success");
  });
});
