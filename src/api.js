const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// 목록 조회 — API Server PaginatedResponse 반환
// { data: [...], pagination: { page, limit, total, totalPages } }
export function getList(table, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.accountId) qs.set("accountId", params.accountId);
  return request(`/${table}?${qs}`);
}

// 상세 조회
export function getRecord(table, id) {
  return request(`/${table}/${id}`);
}

// 상태 변경
export function updateRecord(table, id, data) {
  return request(`/${table}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// Member 잠금 해제
export function unlockMember(id) {
  return request(`/members/${id}/unlock`, { method: "PATCH" });
}

// Account Type 변경 (CL-001.1-04)
export function changeAccountType(id, type) {
  return request(`/accounts/${id}/type`, { method: "PATCH", body: JSON.stringify({ type }) });
}

// Account 삭제 (CL-001.1-04)
export function deleteAccount(id) {
  return request(`/accounts/${id}`, { method: "DELETE" });
}

// Dashboard 통계
export function getStats() {
  return request("/stats");
}
