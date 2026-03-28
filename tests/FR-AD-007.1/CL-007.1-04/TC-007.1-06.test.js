// TC-007.1-06: Connection Template 생성 — spec 검증 통과
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, DELETE, VALID_SPEC } from "../helpers.js";

const CAT_ID = "tc06-cat";
const CONN_UUID = "550e8400-e29b-41d4-a716-446655440006";

describe("TC-007.1-06: Connection Template 생성 — spec 검증 통과", () => {
  beforeAll(async () => {
    await POST("/api/backoffice/categories", {
      id: CAT_ID,
      name: "Integration",
      icon: "plug.svg",
      sortOrder: 1,
    });
  });

  afterAll(async () => {
    await DELETE(`/api/backoffice/connection-templates/${CONN_UUID}`);
    await DELETE(`/api/backoffice/categories/${CAT_ID}`);
  });

  it("유효한 spec + 지정 UUID → 201 Created", async () => {
    const { status, body } = await POST("/api/backoffice/connection-templates", {
      id: CONN_UUID,
      serviceType: "custom_api",
      name: "Custom API",
      version: "1.0.0",
      categoryId: CAT_ID,
      spec: VALID_SPEC,
    });

    expect(status).toBe(201);
    expect(body.id).toBe(CONN_UUID);
    expect(body.serviceType).toBe("custom_api");
    expect(body.spec.jsonSchema).toEqual(VALID_SPEC.jsonSchema);
  });

  it("단건 조회 → category include", async () => {
    const { status, body } = await GET(`/api/backoffice/connection-templates/${CONN_UUID}`);

    expect(status).toBe(200);
    expect(body.category.id).toBe(CAT_ID);
  });
});
