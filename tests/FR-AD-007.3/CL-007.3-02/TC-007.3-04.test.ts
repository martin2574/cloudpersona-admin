import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@yourq/prisma-backoffice";

// TC-007.3-04: dry-run 정상 응답

// reconcile 서비스 mock
vi.mock("../../../src/services/reconcile.js", () => ({
  reconcile: vi.fn().mockResolvedValue({
    mode: "dry-run",
    diff: { categories: { create: [], update: [], skip: [] } },
    summary: { categories: { create: 0, update: 0, skip: 0 } },
  }),
}));

import reconcileRouter from "../../../src/routes/backoffice/reconcile.js";
import { reconcile } from "../../../src/services/reconcile.js";

function mockReqRes(body = {}) {
  const req = { body };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TC-007.3-04: dry-run 정상 응답", () => {
  it("mode=dry-run + env=test → 200 + reconcile 결과 반환", async () => {
    const envs = { test: "http://test:3057", prod: "http://prod:3057" };
    const router = reconcileRouter({} as unknown as PrismaClient, { envs, adminSecret: "s" });

    // Express router의 POST "/" 핸들러 추출
    const postRoute = (router.stack as any[]).find(
      (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
    );
    expect(postRoute).toBeDefined();

    const handler = postRoute!.route.stack[0].handle;
    const { req, res } = mockReqRes({ env: "test", mode: "dry-run" });

    await handler(req, res, () => {});

    expect(reconcile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ apiServerUrl: "http://test:3057", mode: "dry-run" })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "dry-run", env: "test" })
    );
  });
});
