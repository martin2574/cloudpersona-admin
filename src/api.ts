const BASE = "/api";

interface ApiError {
  error?: { message?: string };
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiError;
    throw new Error(err.error?.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export interface ListParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: string;
  accountId?: string;
}

// 목록 조회 — API Server PaginatedResponse 반환
// { data: [...], pagination: { page, limit, total, totalPages } }
export function getList(table: string, params: ListParams = {}): Promise<unknown> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.accountId) qs.set("accountId", params.accountId);
  return request(`/${table}?${qs}`);
}

// 상세 조회
export function getRecord(table: string, id: string): Promise<unknown> {
  return request(`/${table}/${id}`);
}

// 상태 변경
export function updateRecord(
  table: string,
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/${table}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// Member 잠금 해제
export function unlockMember(id: string): Promise<unknown> {
  return request(`/members/${id}/unlock`, { method: "PATCH" });
}

// Account Type 변경 (CL-001.1-04)
export function changeAccountType(id: string, type: string): Promise<unknown> {
  return request(`/accounts/${id}/type`, {
    method: "PATCH",
    body: JSON.stringify({ type }),
  });
}

// Account 삭제 (CL-001.1-04)
export function deleteAccount(id: string): Promise<unknown> {
  return request(`/accounts/${id}`, { method: "DELETE" });
}

// Dashboard 통계
export function getStats(): Promise<unknown> {
  return request("/stats");
}
