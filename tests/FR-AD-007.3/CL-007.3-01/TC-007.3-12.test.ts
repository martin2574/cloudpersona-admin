import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@yourq/prisma-backoffice";
import { reconcile } from "../../../src/services/reconcile.js";

// TC-007.3-12: execute delete FK 역순 보장

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TC-007.3-12: execute delete FK 역순 보장", () => {
  it("skill-templates → connection-templates → categories 순서로 DELETE 호출한다", async () => {
    // Source: 비어 있음 → Target의 모든 항목이 delete 대상
    const mockDb = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      connectionTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      skillTemplate: { findMany: vi.fn().mockResolvedValue([]) },
    };

    // Target: 3종 리소스 각 1건
    const targetData = {
      categories: [{ id: "cat-1", name: "Telephony", icon: "phone.svg", sortOrder: 1 }],
      "connection-templates": [{ id: "conn-1", serviceType: "sip", name: "SIP", description: "", version: "1.0.0", categoryId: "cat-1", icon: null, spec: {}, deprecatedAt: null }],
      "skill-templates": [{ id: "skill-1", skillType: "transfer", name: "Transfer", description: "", version: "1.0.0", categoryId: "cat-1", connectionTemplateId: "conn-1", icon: null, spec: {}, deprecatedAt: null }],
    };

    const deleteOrder: string[] = [];
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        // URL에서 리소스 타입 추출: /admin/{resource}/{id}
        const match = url.match(/\/admin\/([^/]+)\//);
        if (match) deleteOrder.push(match[1]);
        return Promise.resolve({ ok: true });
      }
      // GET 요청: URL에서 리소스 판별
      for (const [resource, data] of Object.entries(targetData)) {
        if (url.includes(`/admin/${resource}`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(data),
          });
        }
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reconcile(mockDb as unknown as PrismaClient, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "execute",
    });

    // FK 역순 확인: skill → connection → category
    expect(deleteOrder).toEqual(["skill-templates", "connection-templates", "categories"]);

    // 전체 3건 삭제 성공
    const s = result.summary as Record<string, { success: number; failed: number }>;
    expect(s.skillTemplates.success).toBe(1);
    expect(s.connectionTemplates.success).toBe(1);
    expect(s.categories.success).toBe(1);
    expect(result.stopped).toBe(false);
  });

  it("DELETE 실패 시 즉시 멈추고 stopped=true를 반환한다", async () => {
    const mockDb = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      connectionTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      skillTemplate: { findMany: vi.fn().mockResolvedValue([]) },
    };

    // Target: skill 2건 (첫 번째 삭제 실패 → 두 번째 스킵)
    const targetData = {
      categories: [],
      "connection-templates": [],
      "skill-templates": [
        { id: "skill-1", skillType: "a", name: "A", description: "", version: "1.0.0", categoryId: "c1", connectionTemplateId: null, icon: null, spec: {}, deprecatedAt: null },
        { id: "skill-2", skillType: "b", name: "B", description: "", version: "1.0.0", categoryId: "c1", connectionTemplateId: null, icon: null, spec: {}, deprecatedAt: null },
      ],
    };

    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        // 첫 번째 DELETE 실패
        return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve("FK constraint") });
      }
      for (const [resource, data] of Object.entries(targetData)) {
        if (url.includes(`/admin/${resource}`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(data),
          });
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reconcile(mockDb as unknown as PrismaClient, {
      apiServerUrl: "http://test:3057",
      adminSecret: "secret",
      mode: "execute",
    });

    expect(result.stopped).toBe(true);
    const s = result.summary as Record<string, { success: number; failed: number }>;
    expect(s.skillTemplates.failed).toBe(1);
    // skill-2는 스킵됨 (stopped)
    expect(result.results!.skillTemplates).toHaveLength(1);
  });
});
