import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcile } from "../../../src/services/reconcile.js";

// TC-007.3-02: execute FK 순서 보장

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TC-007.3-02: execute FK 순서 보장", () => {
  it("categories → connection-templates → skill-templates 순서로 PUT 호출한다", async () => {
    const mockDb = {
      category: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 },
        ]),
      },
      connectionTemplate: {
        findMany: vi.fn().mockResolvedValue([
          { id: "conn-1", serviceType: "sip", name: "SIP", description: "", version: "1.0.0", categoryId: "cat-1", icon: null, spec: {}, deprecatedAt: null },
        ]),
      },
      skillTemplate: {
        findMany: vi.fn().mockResolvedValue([
          { id: "skill-1", skillType: "transfer", name: "Transfer", description: "", version: "1.0.0", categoryId: "cat-1", connectionTemplateId: "conn-1", icon: null, spec: {}, deprecatedAt: null },
        ]),
      },
    };

    const putOrder = [];
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        // URL에서 리소스 타입 추출
        const match = url.match(/\/admin\/([^/]+)\//);
        if (match) putOrder.push(match[1]);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),  // GET → 빈 배열 (전부 create)
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reconcile(mockDb, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "execute",
    });

    // FK 순서 확인
    expect(putOrder).toEqual(["categories", "connection-templates", "skill-templates"]);

    // 전체 3건 성공
    const totalSuccess =
      result.summary.categories.success +
      result.summary.connectionTemplates.success +
      result.summary.skillTemplates.success;
    expect(totalSuccess).toBe(3);
    expect(result.stopped).toBe(false);
  });
});
