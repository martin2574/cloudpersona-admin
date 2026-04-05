// TC-007.1-02: Layer 1 — 유효한 JSON Schema 통과
import { describe, it, expect } from "vitest";
import { validateSpec } from "../../../src/lib/schema-validator.js";

describe("TC-007.1-02: Layer 1 — 유효한 JSON Schema 통과", () => {
  it("유효한 JSON Schema Draft-07 + uiSchema → valid: true", () => {
    const result = validateSpec({
      jsonSchema: {
        type: "object",
        properties: {
          api_key: { type: "string", title: "API Key" },
          base_url: { type: "string", title: "Base URL", format: "uri" },
        },
        required: ["api_key"],
      },
      uiSchema: {
        api_key: { "ui:widget": "password" },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
