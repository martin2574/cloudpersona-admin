// TC-007.5-04: BFF 프록시 경유 Template CRUD 통합테스트
import { describe, it, expect, afterAll } from "vitest";
import { GET, PUT, DELETE, VALID_SPEC } from "../../helpers.js";

const CAT_ID = "tc-075-cat";
const CONN_UUID = "550e8400-e29b-41d4-a716-446655440075";
const SKILL_UUID = "660e8400-e29b-41d4-a716-446655440075";

describe("TC-007.5-04: BFF 프록시 경유 Template CRUD", () => {
  afterAll(async () => {
    // 정리: Skill → Connection → Category 순서 (FK 역순)
    await DELETE(`/api/skill-templates/${SKILL_UUID}`);
    await DELETE(`/api/connection-templates/${CONN_UUID}`);
    await DELETE(`/api/categories/${CAT_ID}`);
  });

  // ── 검증 1: Category PUT upsert ──
  it("검증 1: PUT /api/categories/:id → Category upsert", async () => {
    const { status, body } = await PUT(`/api/categories/${CAT_ID}`, {
      id: CAT_ID,
      name: "TC-075 BFF Test",
      icon: "test.svg",
      sortOrder: 99,
    });

    expect(status === 200 || status === 201).toBe(true);
    expect(body.id).toBe(CAT_ID);
    expect(body.name).toBe("TC-075 BFF Test");
  });

  // ── 검증 2: ConnectionTemplate PUT upsert ──
  it("검증 2: PUT /api/connection-templates/:id → CT upsert", async () => {
    const { status, body } = await PUT(`/api/connection-templates/${CONN_UUID}`, {
      id: CONN_UUID,
      serviceType: "tc075_bff_test",
      name: "TC-075 BFF CT",
      description: "TC-007.5-04 통합테스트용",
      version: "1.0.0",
      categoryId: CAT_ID,
      authMethod: "credential",
      spec: VALID_SPEC,
    });

    expect(status === 200 || status === 201).toBe(true);
    expect(body.id).toBe(CONN_UUID);
    expect(body.serviceType).toBe("tc075_bff_test");
  });

  // ── 검증 3: SkillTemplate PUT upsert ──
  it("검증 3: PUT /api/skill-templates/:id → ST upsert", async () => {
    const { status, body } = await PUT(`/api/skill-templates/${SKILL_UUID}`, {
      id: SKILL_UUID,
      skillType: "tc075_bff_skill",
      name: "TC-075 BFF Skill",
      description: "TC-007.5-04 통합테스트용",
      version: "1.0.0",
      categoryId: CAT_ID,
      connectionTemplateId: CONN_UUID,
      spec: VALID_SPEC,
    });

    expect(status === 200 || status === 201).toBe(true);
    expect(body.id).toBe(SKILL_UUID);
    expect(body.skillType).toBe("tc075_bff_skill");
  });

  // ── 검증 4: 목록 조회 (페이지네이션) ──
  it("검증 4: GET /api/categories → 목록 반환", async () => {
    const { status, body } = await GET("/api/categories");

    expect(status).toBe(200);
    // API Server가 배열 또는 paginated response 반환
    const data = Array.isArray(body) ? body : body?.data;
    expect(Array.isArray(data)).toBe(true);
  });

  // ── 검증 5: 단건 조회 ──
  it("검증 5: GET /api/connection-templates/:id → 단건 조회", async () => {
    const { status, body } = await GET(`/api/connection-templates/${CONN_UUID}`);

    expect(status).toBe(200);
    expect(body.id).toBe(CONN_UUID);
    expect(body.categoryId).toBe(CAT_ID);
  });

  // ── 검증 6: 삭제 ──
  it("검증 6: DELETE /api/skill-templates/:id → 삭제 후 404", async () => {
    const { status } = await DELETE(`/api/skill-templates/${SKILL_UUID}`);
    expect(status === 200 || status === 204).toBe(true);

    const { status: getStatus } = await GET(`/api/skill-templates/${SKILL_UUID}`);
    expect(getStatus).toBe(404);
  });
});
