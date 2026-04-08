// TC-007.4-01: BFF 프록시 OAuth Provider CRUD + oauth 필드 검증
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST, PUT, PATCH, DELETE, VALID_SPEC } from "../../helpers.js";

const CAT_ID = "tc-074-cat";
const CONN_UUID = "550e8400-e29b-41d4-a716-446655440074";

describe("TC-007.4-01: BFF 프록시 + 검증", () => {
  // ── 사전 준비: 카테고리 생성 (ConnectionTemplate 테스트용) ──
  beforeAll(async () => {
    await PUT(`/api/categories/${CAT_ID}`, {
      id: CAT_ID,
      name: "TC-074 OAuth",
      icon: "key.svg",
      sortOrder: 99,
    });
  });

  afterAll(async () => {
    // 정리: ConnectionTemplate → Category 순서
    await DELETE(`/api/connection-templates/${CONN_UUID}`);
    await DELETE(`/api/categories/${CAT_ID}`);
  });

  // ── 검증 1~3: OAuth Provider CRUD (BFF 프록시 → API Server) ──

  let createdProviderId: string;

  it("검증 1: GET /api/oauth-providers → 목록 반환", async () => {
    const { status, body } = await GET("/api/oauth-providers");

    expect(status).toBe(200);
    expect(Array.isArray(body) || Array.isArray(body?.data)).toBe(true);
  });

  it("검증 2: POST /api/oauth-providers → Provider 생성", async () => {
    const { status, body } = await POST("/api/oauth-providers", {
      provider: "tc074_test",
      displayName: "TC-074 Test Provider",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      authUrl: "https://example.com/auth",
      tokenUrl: "https://example.com/token",
      scopesAvailable: ["read", "write"],
      redirectUriBase: "https://example.com/callback",
      isActive: true,
    });

    expect(status).toBe(201);
    expect(body.provider).toBe("tc074_test");
    expect(body.displayName).toBe("TC-074 Test Provider");
    expect(body.id).toBeDefined();
    createdProviderId = body.id;
  });

  it("검증 3: PATCH /api/oauth-providers/:id → Provider 수정", async () => {
    const { status, body } = await PATCH(`/api/oauth-providers/${createdProviderId}`, {
      displayName: "TC-074 Updated",
    });

    expect(status).toBe(200);
    expect(body.displayName).toBe("TC-074 Updated");
  });

  // ── 검증 5~6: oauthProviderId/oauthScopes 필드 (Provider 삭제 전에 실행) ──

  it("검증 5-6: ConnectionTemplate에 oauthProviderId + oauthScopes 저장/조회", async () => {
    // createdProviderId: 검증 2에서 생성한 실제 Provider ID (FK 제약 충족)
    const { status: createStatus, body: created } = await PUT(
      `/api/connection-templates/${CONN_UUID}`,
      {
        id: CONN_UUID,
        serviceType: "tc074_oauth_test",
        name: "TC-074 OAuth Test",
        description: "TC-007.4-01 OAuth 통합테스트용",
        version: "1.0.0",
        categoryId: CAT_ID,
        authMethod: "oauth2",
        oauthProviderId: createdProviderId,
        oauthScopes: ["spreadsheets", "calendar"],
        spec: VALID_SPEC,
      },
    );

    expect(createStatus === 200 || createStatus === 201).toBe(true);
    expect(created.oauthProviderId).toBe(createdProviderId);
    expect(created.oauthScopes).toEqual(["spreadsheets", "calendar"]);

    // 단건 조회로 재확인
    const { status: getStatus, body: fetched } = await GET(
      `/api/connection-templates/${CONN_UUID}`,
    );

    expect(getStatus).toBe(200);
    expect(fetched.oauthProviderId).toBe(createdProviderId);
    expect(fetched.oauthScopes).toEqual(["spreadsheets", "calendar"]);

    // CT 정리 (Provider 삭제 전에 FK 해제)
    await DELETE(`/api/connection-templates/${CONN_UUID}`);
  });

  // ── 검증 4: Provider 삭제 (CT 정리 후) ──

  it("검증 4: DELETE /api/oauth-providers/:id → Provider 삭제", async () => {
    const { status } = await DELETE(`/api/oauth-providers/${createdProviderId}`);

    expect(status === 200 || status === 204).toBe(true);

    // 재조회 시 404
    const { status: getStatus } = await GET(`/api/oauth-providers/${createdProviderId}`);
    expect(getStatus).toBe(404);
  });
});
