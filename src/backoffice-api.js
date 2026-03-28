const BASE = "/api/backoffice";
const SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": SECRET,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.errors?.[0]?.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Categories ──

export function getCategories() {
  return request("/categories");
}

export function getCategory(id) {
  return request(`/categories/${id}`);
}

export function createCategory(data) {
  return request("/categories", { method: "POST", body: JSON.stringify(data) });
}

export function updateCategory(id, data) {
  return request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: "DELETE" });
}

// ── Connection Templates ──

export function getConnectionTemplates(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.search) qs.set("search", params.search);
  return request(`/connection-templates?${qs}`);
}

export function getConnectionTemplate(id) {
  return request(`/connection-templates/${id}`);
}

export function createConnectionTemplate(data) {
  return request("/connection-templates", { method: "POST", body: JSON.stringify(data) });
}

export function updateConnectionTemplate(id, data) {
  return request(`/connection-templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteConnectionTemplate(id) {
  return request(`/connection-templates/${id}`, { method: "DELETE" });
}

// ── Skill Templates ──

export function getSkillTemplates(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.search) qs.set("search", params.search);
  return request(`/skill-templates?${qs}`);
}

export function getSkillTemplate(id) {
  return request(`/skill-templates/${id}`);
}

export function createSkillTemplate(data) {
  return request("/skill-templates", { method: "POST", body: JSON.stringify(data) });
}

export function updateSkillTemplate(id, data) {
  return request(`/skill-templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteSkillTemplate(id) {
  return request(`/skill-templates/${id}`, { method: "DELETE" });
}

// ── Reconciliation ──

export function getReconcileEnvs() {
  return request("/reconcile/envs");
}

export function reconcileDryRun(env) {
  return request("/reconcile", { method: "POST", body: JSON.stringify({ env, mode: "dry-run" }) });
}

export function reconcileExecute(env) {
  return request("/reconcile", { method: "POST", body: JSON.stringify({ env, mode: "execute" }) });
}
