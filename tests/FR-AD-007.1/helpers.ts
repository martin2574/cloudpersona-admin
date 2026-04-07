// 통합 테스트 헬퍼 — Admin BFF (localhost:3058)에 HTTP 요청
const BASE = "http://localhost:3058";
const SECRET = process.env.ADMIN_API_SECRET || "PmuZMZ2INEj/tgfvwszods7y2zkc1iTGcXmxnkxEitM=";

const headers = {
  "Content-Type": "application/json",
  "x-admin-secret": SECRET,
};

export async function GET(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const status = res.status;
  if (status === 204) return { status, body: null };
  const body = await res.json();
  return { status, body };
}

export async function POST(path: string, data: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const status = res.status;
  const body = await res.json();
  return { status, body };
}

export async function PUT(path: string, data: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  const status = res.status;
  const body = await res.json();
  return { status, body };
}

export async function PATCH(path: string, data: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  const status = res.status;
  if (status === 204) return { status, body: null };
  const body = await res.json();
  return { status, body };
}

export async function DELETE(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers,
  });
  const status = res.status;
  if (status === 204) return { status, body: null };
  const body = await res.json();
  return { status, body };
}

// 유효한 spec (재사용)
export const VALID_SPEC = {
  jsonSchema: {
    type: "object",
    properties: {
      api_key: { type: "string", title: "API Key" },
      base_url: { type: "string", title: "Base URL" },
    },
    required: ["api_key"],
  },
  uiSchema: {
    api_key: { "ui:widget": "password" },
  },
};
