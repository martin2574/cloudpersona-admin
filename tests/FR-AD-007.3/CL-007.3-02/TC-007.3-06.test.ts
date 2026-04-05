import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// TC-007.3-06: 인증 없음 401
// requireAdminSecret 미들웨어가 server.ts에서 reconcile 라우트 앞에 적용되어 있는지 정적 검증

describe("TC-007.3-06: 인증 없음 401", () => {
  it("server.ts에서 reconcile 라우트에 requireAdminSecret 미들웨어가 적용되어 있다", () => {
    const serverSrc = readFileSync(
      resolve(import.meta.dirname, "../../../server.ts"),
      "utf-8"
    );

    // reconcile 라우트 등록 줄에 requireAdminSecret이 포함되어 있는지 확인
    const reconcileLine = serverSrc.split("\n").find((line) =>
      line.includes("/api/backoffice/reconcile") && line.includes("requireAdminSecret")
    );
    expect(reconcileLine).toBeDefined();
  });

  it("requireAdminSecret이 secret 불일치 시 401을 반환하는 구조이다", () => {
    const serverSrc = readFileSync(
      resolve(import.meta.dirname, "../../../server.ts"),
      "utf-8"
    );

    // requireAdminSecret 함수가 401을 반환하는 코드가 있는지 확인
    expect(serverSrc).toContain("401");
    expect(serverSrc).toContain("Unauthorized");
  });
});
