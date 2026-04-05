// TC-007.1-04: Category CRUD 기본
import { describe, it, expect, afterAll } from "vitest";
import { GET, POST, PUT, DELETE } from "../helpers.js";

const CAT_ID = "tc04-cat";

describe("TC-007.1-04: Category CRUD 기본", () => {
  afterAll(async () => {
    await DELETE(`/api/backoffice/categories/${CAT_ID}`);
  });

  it("1. 생성 → 201 + 자연키 보존", async () => {
    const { status, body } = await POST("/api/backoffice/categories", {
      id: CAT_ID,
      name: "Test Category",
      icon: "test.svg",
      sortOrder: 99,
    });

    expect(status).toBe(201);
    expect(body.id).toBe(CAT_ID);
    expect(body.name).toBe("Test Category");
  });

  it("2. 목록 조회 → 생성된 항목 포함", async () => {
    const { status, body } = await GET("/api/backoffice/categories");

    expect(status).toBe(200);
    expect(body.some((c: { id: string }) => c.id === CAT_ID)).toBe(true);
  });

  it("3. 단건 조회 → 200 + 필드 일치", async () => {
    const { status, body } = await GET(`/api/backoffice/categories/${CAT_ID}`);

    expect(status).toBe(200);
    expect(body.name).toBe("Test Category");
    expect(body.icon).toBe("test.svg");
  });

  it("4. 수정 → name 변경", async () => {
    const { status, body } = await PUT(`/api/backoffice/categories/${CAT_ID}`, {
      name: "Updated Category",
    });

    expect(status).toBe(200);
    expect(body.name).toBe("Updated Category");
  });

  it("5. 삭제 → 204 + 재조회 404", async () => {
    const del = await DELETE(`/api/backoffice/categories/${CAT_ID}`);
    expect(del.status).toBe(204);

    const get = await GET(`/api/backoffice/categories/${CAT_ID}`);
    expect(get.status).toBe(404);
  });
});
