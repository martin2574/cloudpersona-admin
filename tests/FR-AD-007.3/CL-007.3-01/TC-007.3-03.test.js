import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcile } from "../../../src/services/reconcile.js";

// TC-007.3-03: execute 실패 시 멈춤

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TC-007.3-03: execute 실패 시 멈춤", () => {
  it("connectionTemplate PUT 실패 시 stopped=true, skillTemplate 호출 안 됨", async () => {
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

    const putResources = [];
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        const match = url.match(/\/admin\/([^/]+)\//);
        if (match) putResources.push(match[1]);

        // connection-templates PUT만 실패
        if (url.includes("/connection-templates/")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            text: () => Promise.resolve("DB error"),
          });
        }
      }
      // GET + categories PUT → 성공
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reconcile(mockDb, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "execute",
    });

    // 멈춤 확인
    expect(result.stopped).toBe(true);

    // categories는 성공, connectionTemplates는 실패
    expect(result.summary.categories.success).toBe(1);
    expect(result.summary.connectionTemplates.failed).toBe(1);

    // skillTemplates PUT 호출 안 됨
    expect(putResources).not.toContain("skill-templates");
    expect(result.results.skillTemplates).toHaveLength(0);
  });
});
