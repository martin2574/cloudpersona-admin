import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcile } from "../../../src/services/reconcile.js";

// TC-007.3-11: dry-run delete diff 정확성

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TC-007.3-11: dry-run delete diff 정확성", () => {
  it("Target에만 있는 항목을 delete 배열에 포함한다", async () => {
    // Source(Backoffice): cat-1만 존재
    const mockDb = {
      category: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 },
        ]),
      },
      connectionTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      skillTemplate: { findMany: vi.fn().mockResolvedValue([]) },
    };

    // Target(API Server): cat-1 + cat-orphan (Source에 없음)
    const targetCategories = [
      { id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 },
      { id: "cat-orphan", name: "Orphan Category", icon: "x.svg", sortOrder: 99 },
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

    // delete diff 확인
    expect(result.summary.categories.delete).toBe(1);
    expect(result.diff.categories.delete).toHaveLength(1);
    expect(result.diff.categories.delete[0].id).toBe("cat-orphan");

    // 나머지 분류 확인
    expect(result.summary.categories.skip).toBe(1);    // cat-1
    expect(result.summary.categories.create).toBe(0);
    expect(result.summary.categories.update).toBe(0);
  });

  it("Source와 Target이 동일하면 delete는 0이다", async () => {
    const items = [
      { id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 },
    ];

    const mockDb = {
      category: { findMany: vi.fn().mockResolvedValue(items) },
      connectionTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      skillTemplate: { findMany: vi.fn().mockResolvedValue([]) },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(items),
    }));

    const result = await reconcile(mockDb, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "dry-run",
    });

    expect(result.summary.categories.delete).toBe(0);
    expect(result.diff.categories.delete).toHaveLength(0);
  });

  it("dry-run 시 DELETE 호출이 0건이다", async () => {
    const mockDb = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      connectionTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      skillTemplate: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: "cat-orphan", name: "Orphan", icon: "x.svg", sortOrder: 1 },
      ]),
    });
    vi.stubGlobal("fetch", fetchMock);

    await reconcile(mockDb, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "dry-run",
    });

    const deleteCalls = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "DELETE"
    );
    expect(deleteCalls).toHaveLength(0);
  });
});
