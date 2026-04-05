// TC-007.1-03: Layer 1/2 — 잘못된 스키마 거부 + 에러 상세
import { describe, it, expect } from "vitest";
import { validateSpec } from "../../../src/lib/schema-validator.js";

describe("TC-007.1-03: Layer 1/2 — 잘못된 스키마 거부 + 에러 상세", () => {
  it("Case 1: Layer 1 실패 — 잘못된 JSON Schema (invalid type)", () => {
    const r1 = validateSpec({
      jsonSchema: { type: "invalid_type", properties: {} },
      uiSchema: {},
    });

    expect(r1.valid).toBe(false);
    expect(r1.errors.length).toBeGreaterThanOrEqual(1);
    expect(r1.errors.some((e) => e.layer === 1 || e.layer === 2)).toBe(true);
  });

  it("Case 2: Layer 2 실패 — jsonSchema 누락", () => {
    const r2 = validateSpec({ uiSchema: {} });

    expect(r2.valid).toBe(false);
    expect(r2.errors[0].layer).toBe(2);
    expect(r2.errors[0].field).toBe("jsonSchema");
  });

  it("Case 3: Layer 2 실패 — type !== 'object'", () => {
    const r3 = validateSpec({
      jsonSchema: { type: "string" },
      uiSchema: {},
    });

    expect(r3.valid).toBe(false);
    expect(r3.errors.some((e) => e.field === "jsonSchema.type")).toBe(true);
  });

  it("Case 4: Layer 2 실패 — uiSchema 필드가 jsonSchema에 없음", () => {
    const r4 = validateSpec({
      jsonSchema: {
        type: "object",
        properties: { name: { type: "string" } },
      },
      uiSchema: {
        ghost_field: { "ui:widget": "text" },
      },
    });

    expect(r4.valid).toBe(false);
    expect(r4.errors.some((e) => e.field === "uiSchema.ghost_field")).toBe(true);
  });
});
