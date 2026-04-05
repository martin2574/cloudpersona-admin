// TC-007.1-10: Skill Template 목록 — 필터/검색/페이지네이션
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, DELETE, VALID_SPEC } from "../helpers.js";

const CAT_A = "tc10-telephony";
const CAT_B = "tc10-messaging";
const skillIds: string[] = [];

describe("TC-007.1-10: Skill Template 목록 — 필터/검색/페이지네이션", () => {
  beforeAll(async () => {
    await POST("/api/backoffice/categories", { id: CAT_A, name: "Telephony", icon: "phone.svg", sortOrder: 1 });
    await POST("/api/backoffice/categories", { id: CAT_B, name: "Messaging", icon: "msg.svg", sortOrder: 2 });

    const skills = [
      { skillType: "end", name: "End Call", categoryId: CAT_A },
      { skillType: "transfer", name: "Call Transfer", categoryId: CAT_A },
      { skillType: "sms_send", name: "SMS Send", categoryId: CAT_B },
    ];

    for (const s of skills) {
      const { body } = await POST("/api/backoffice/skill-templates", {
        ...s,
        version: "1.0",
        spec: VALID_SPEC,
      });
      skillIds.push(body.id);
    }
  });

  afterAll(async () => {
    for (const id of skillIds) {
      await DELETE(`/api/backoffice/skill-templates/${id}`);
    }
    await DELETE(`/api/backoffice/categories/${CAT_A}`);
    await DELETE(`/api/backoffice/categories/${CAT_B}`);
  });

  it("1. 전체 목록 → 3개 이상", async () => {
    const { status, body } = await GET("/api/backoffice/skill-templates");

    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    expect(body.total).toBeGreaterThanOrEqual(3);
  });

  it("2. category 필터 → telephony만", async () => {
    const { body } = await GET(`/api/backoffice/skill-templates?categoryId=${CAT_A}`);

    expect(body.data.length).toBe(2);
    expect(body.data.every((s: { categoryId: string }) => s.categoryId === CAT_A)).toBe(true);
  });

  it("3. 검색 → 'end' 매칭", async () => {
    const { body } = await GET("/api/backoffice/skill-templates?search=end");

    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((s: { name: string; skillType: string }) => s.name.toLowerCase().includes("end") || s.skillType.includes("end"))).toBe(true);
  });

  it("4. 페이지네이션 → limit=2", async () => {
    const { body } = await GET("/api/backoffice/skill-templates?page=1&limit=2");

    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
  });
});
