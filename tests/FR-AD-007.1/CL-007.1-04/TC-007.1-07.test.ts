// TC-007.1-07: Connection Template 생성 — spec 검증 실패 400
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, DELETE } from "../helpers.js";

const CAT_ID = "tc07-cat";

describe("TC-007.1-07: Connection Template 생성 — spec 검증 실패 400", () => {
  beforeAll(async () => {
    await POST("/api/backoffice/categories", {
      id: CAT_ID,
      name: "Broken",
      icon: "x.svg",
      sortOrder: 1,
    });
  });

  afterAll(async () => {
    await DELETE(`/api/backoffice/categories/${CAT_ID}`);
  });

  it("잘못된 spec → 400 + layer별 에러", async () => {
    const { status, body } = await POST("/api/backoffice/connection-templates", {
      serviceType: "broken_api",
      name: "Broken",
      version: "1.0.0",
      categoryId: CAT_ID,
      spec: {
        jsonSchema: { type: "invalid_type" },
        uiSchema: {},
      },
    });

    expect(status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThanOrEqual(1);
  });

  it("DB 미저장 확인 — 목록에 없음", async () => {
    const { body } = await GET(`/api/backoffice/connection-templates?categoryId=${CAT_ID}`);

    expect(body.data).toHaveLength(0);
  });
});
