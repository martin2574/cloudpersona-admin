// TC-007.1-05: Category 삭제 — FK 참조 시 409
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, DELETE } from "../helpers.js";

const CAT_ID = "tc05-fk-cat";
let connId: string;

describe("TC-007.1-05: Category 삭제 — FK 참조 시 409", () => {
  beforeAll(async () => {
    await POST("/api/backoffice/categories", {
      id: CAT_ID,
      name: "FK Test",
      icon: "fk.svg",
      sortOrder: 1,
    });

    const { body } = await POST("/api/backoffice/connection-templates", {
      serviceType: "test",
      name: "FK Conn",
      version: "1.0",
      categoryId: CAT_ID,
      spec: {
        jsonSchema: { type: "object", properties: { k: { type: "string" } } },
        uiSchema: {},
      },
    });
    connId = body.id;
  });

  afterAll(async () => {
    if (connId) await DELETE(`/api/backoffice/connection-templates/${connId}`);
    await DELETE(`/api/backoffice/categories/${CAT_ID}`);
  });

  it("FK 참조 중인 category 삭제 → 409", async () => {
    const { status, body } = await DELETE(`/api/backoffice/categories/${CAT_ID}`);

    expect(status).toBe(409);
    expect(body.error).toContain("참조");
  });

  it("category 여전히 존재", async () => {
    const { status } = await GET(`/api/backoffice/categories/${CAT_ID}`);
    expect(status).toBe(200);
  });
});
