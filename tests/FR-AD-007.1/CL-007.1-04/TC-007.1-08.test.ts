// TC-007.1-08: Connection Template 삭제 — skill FK 참조 409
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, DELETE, VALID_SPEC } from "../helpers.js";

const CAT_ID = "tc08-cat";
let connId: string;
let skillId: string;

describe("TC-007.1-08: Connection Template 삭제 — skill FK 참조 409", () => {
  beforeAll(async () => {
    await POST("/api/backoffice/categories", {
      id: CAT_ID,
      name: "FK Test",
      icon: "fk.svg",
      sortOrder: 1,
    });

    const conn = await POST("/api/backoffice/connection-templates", {
      serviceType: "test",
      name: "FK Conn",
      version: "1.0",
      categoryId: CAT_ID,
      spec: VALID_SPEC,
    });
    connId = conn.body.id;

    const skill = await POST("/api/backoffice/skill-templates", {
      skillType: "api_request",
      name: "FK Skill",
      version: "1.0",
      categoryId: CAT_ID,
      connectionTemplateId: connId,
      spec: VALID_SPEC,
    });
    skillId = skill.body.id;
  });

  afterAll(async () => {
    if (skillId) await DELETE(`/api/backoffice/skill-templates/${skillId}`);
    if (connId) await DELETE(`/api/backoffice/connection-templates/${connId}`);
    await DELETE(`/api/backoffice/categories/${CAT_ID}`);
  });

  it("skill이 참조 중인 connection 삭제 → 409", async () => {
    const { status, body } = await DELETE(`/api/backoffice/connection-templates/${connId}`);

    expect(status).toBe(409);
    expect(body.error).toContain("Skill Template");
  });

  it("connection_template 보존 확인", async () => {
    const { status } = await GET(`/api/backoffice/connection-templates/${connId}`);
    expect(status).toBe(200);
  });
});
