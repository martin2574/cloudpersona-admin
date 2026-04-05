import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@yourq/prisma-backoffice";
import reconcileRouter from "../../../src/routes/backoffice/reconcile.js";

// TC-007.3-05: 잘못된 파라미터 400

function mockReqRes(body = {}) {
  const req = { body };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("TC-007.3-05: 잘못된 파라미터 400", () => {
  const envs = { test: "http://test:3057", prod: "http://prod:3057" };

  function getPostHandler() {
    const router = reconcileRouter({} as unknown as PrismaClient, { envs, adminSecret: "s" });
    const postRoute = (router.stack as any[]).find(
      (layer: any) => layer.route?.path === "/" && layer.route?.methods?.post
    );
    return postRoute!.route.stack[0].handle;
  }

  it("mode=invalid → 400 에러", async () => {
    const handler = getPostHandler();
    const { req, res } = mockReqRes({ env: "test", mode: "invalid" });
    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it("mode 누락 → 400 에러", async () => {
    const handler = getPostHandler();
    const { req, res } = mockReqRes({ env: "test" });
    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("env 누락 → 400 에러", async () => {
    const handler = getPostHandler();
    const { req, res } = mockReqRes({ mode: "dry-run" });
    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("env=invalid → 400 에러", async () => {
    const handler = getPostHandler();
    const { req, res } = mockReqRes({ env: "staging", mode: "dry-run" });
    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
