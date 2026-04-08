import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

// TC-007.5-01: Backoffice DB 아티팩트 제거 후 타입체크 성공

const ROOT = join(import.meta.dirname, "..", "..", "..");

describe("TC-007.5-01: Backoffice DB 아티팩트 제거 검증", () => {
  it("prisma/backoffice/ 디렉토리가 존재하지 않는다", () => {
    expect(existsSync(join(ROOT, "prisma", "backoffice"))).toBe(false);
  });

  it("package.json에 prisma 관련 의존성이 없다", async () => {
    const pkg = await import(join(ROOT, "package.json"), { with: { type: "json" } });
    const deps = pkg.default.dependencies ?? {};
    const devDeps = pkg.default.devDependencies ?? {};

    expect(deps).not.toHaveProperty("prisma");
    expect(devDeps).not.toHaveProperty("prisma");
  });

  it("package.json에 postinstall 스크립트가 없다", async () => {
    const pkg = await import(join(ROOT, "package.json"), { with: { type: "json" } });
    const scripts = pkg.default.scripts ?? {};

    expect(scripts).not.toHaveProperty("postinstall");
  });
});
