import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcile } from "../../../src/services/reconcile.js";

// TC-007.3-01: dry-run diff 계산 정확성

const mockDb = {
  category: {
    findMany: vi.fn().mockResolvedValue([
      { id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 },
      { id: "cat-2", name: "AI", icon: "ai.svg", sortOrder: 2 },
      { id: "cat-3", name: "Database", icon: "db.svg", sortOrder: 3 },
    ]),
  },
  connectionTemplate: { findMany: vi.fn().mockResolvedValue([]) },
  skillTemplate: { findMany: vi.fn().mockResolvedValue([]) },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TC-007.3-01: dry-run diff 계산 정확성", () => {
  it("create/update/skip을 정확하게 분류한다", async () => {
    // API Server(target): cat-1 동일, cat-2 name 변경, cat-3 없음
    const targetCategories = [
      { id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 },
      { id: "cat-2", name: "AI Old", icon: "ai.svg", sortOrder: 2 },
    ];

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(targetCategories),
    }));

    const result = await reconcile(mockDb, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "dry-run",
    });

    expect(result.mode).toBe("dry-run");
    expect(result.summary.categories.create).toBe(1);  // cat-3
    expect(result.summary.categories.update).toBe(1);  // cat-2
    expect(result.summary.categories.skip).toBe(1);    // cat-1

    // create 항목 확인
    expect(result.diff.categories.create[0].id).toBe("cat-3");

    // update 항목 + 변경 필드 확인
    expect(result.diff.categories.update[0].id).toBe("cat-2");
    expect(result.diff.categories.update[0]._changedFields).toContain("name");

    // skip 항목 확인
    expect(result.diff.categories.skip[0].id).toBe("cat-1");
  });

  it("dry-run 시 API Server PUT 호출이 0건이다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    await reconcile(mockDb, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "dry-run",
    });

    // GET 호출만 있고 PUT 호출은 없어야 함
    const putCalls = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "PUT"
    );
    expect(putCalls).toHaveLength(0);
  });
});
