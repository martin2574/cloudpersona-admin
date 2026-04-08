import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// TC-007.5-05: 테스트 스위트 정리 + CI exclude 정합성

const ROOT = join(import.meta.dirname, "..", "..", "..");

describe("TC-007.5-05: 테스트 스위트 정리 + CI exclude 정합성", () => {
  it("tests/FR-AD-007.1/ 디렉토리가 존재하지 않는다", () => {
    expect(existsSync(join(ROOT, "tests", "FR-AD-007.1"))).toBe(false);
  });

  it("tests/FR-AD-007.3/ 디렉토리가 존재하지 않는다", () => {
    expect(existsSync(join(ROOT, "tests", "FR-AD-007.3"))).toBe(false);
  });

  it("CI quality-gate.yml에서 FR-AD-007.1 exclude가 제거되었다", () => {
    const content = readFileSync(
      join(ROOT, ".github", "workflows", "quality-gate.yml"),
      "utf-8",
    );
    expect(content).not.toContain("FR-AD-007.1");
  });

  it("CI quality-gate.yml에서 통합테스트 디렉토리가 exclude되어 있다", () => {
    const content = readFileSync(
      join(ROOT, ".github", "workflows", "quality-gate.yml"),
      "utf-8",
    );
    // FR-AD-007.4 (OAuth Provider 통합), FR-AD-007.5 TC-007.5-04 (BFF Template 통합)
    expect(content).toContain("FR-AD-007.4");
  });
});
