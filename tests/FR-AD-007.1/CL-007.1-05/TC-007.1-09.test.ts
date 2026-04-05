// TC-007.1-09: Skill Template 생성 — nullable connection_template_id
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, DELETE } from "../helpers.js";

const CAT_ID = "tc09-cat";
let skillId: string;

describe("TC-007.1-09: Skill Template 생성 — nullable connection_template_id", () => {
  beforeAll(async () => {
    await POST("/api/backoffice/categories", {
      id: CAT_ID,
      name: "Telephony",
      icon: "phone.svg",
      sortOrder: 1,
    });
  });

  afterAll(async () => {
    if (skillId) await DELETE(`/api/backoffice/skill-templates/${skillId}`);
    await DELETE(`/api/backoffice/categories/${CAT_ID}`);
  });

  it("connectionTemplateId = null → 201 Created", async () => {
    const { status, body } = await POST("/api/backoffice/skill-templates", {
      skillType: "end",
      name: "End Call",
      version: "1.0.0",
      categoryId: CAT_ID,
      spec: {
        jsonSchema: {
          type: "object",
          properties: {
            message: { type: "string", title: "End Message" },
          },
        },
        uiSchema: {},
      },
    });

    expect(status).toBe(201);
    expect(body.connectionTemplateId).toBeNull();
    expect(body.skillType).toBe("end");
    skillId = body.id;
  });

  it("단건 조회 → connection_template = null", async () => {
    const { status, body } = await GET(`/api/backoffice/skill-templates/${skillId}`);

    expect(status).toBe(200);
    expect(body.connectionTemplate).toBeNull();
  });
});
