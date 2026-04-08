import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// TC-007.5-02: Backoffice CRUD 라우터 제거 + BFF catch-all 유지 검증

const ROOT = join(import.meta.dirname, "..", "..", "..");

describe("TC-007.5-02: Backoffice CRUD 라우터 제거 + BFF 유지", () => {
  it("src/routes/backoffice/ 디렉토리가 존재하지 않는다", () => {
    expect(existsSync(join(ROOT, "src", "routes", "backoffice"))).toBe(false);
  });

  it("server.ts에 requireAdminSecret이 없다", () => {
    const content = readFileSync(join(ROOT, "server.ts"), "utf-8");
    expect(content).not.toContain("requireAdminSecret");
  });

  it("server.ts에 backoffice 라우터 import가 없다", () => {
    const content = readFileSync(join(ROOT, "server.ts"), "utf-8");
    expect(content).not.toContain("routes/backoffice");
  });

  it("server.ts에 BFF 프록시 catch-all이 존재한다", () => {
    const content = readFileSync(join(ROOT, "server.ts"), "utf-8");
    expect(content).toContain('/api/{*path}');
    expect(content).toContain("API_SERVER");
  });
});
