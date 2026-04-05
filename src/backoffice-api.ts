const BASE = "/api/backoffice";
const SECRET = import.meta.env.VITE_ADMIN_API_SECRET as string | undefined;

interface BackofficeError {
  error?: string;
  errors?: Array<{ message?: string }>;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": SECRET || "",
    },
    ...options,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as BackofficeError;
    throw new Error(err.error || err.errors?.[0]?.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export interface TemplateListParams {
  page?: number | string;
  limit?: number | string;
  categoryId?: string;
  search?: string;
}

// ── Categories ──

export function getCategories(): Promise<unknown> {
  return request("/categories");
}

export function getCategory(id: string): Promise<unknown> {
  return request(`/categories/${id}`);
}

export function createCategory(data: Record<string, unknown>): Promise<unknown> {
  return request("/categories", { method: "POST", body: JSON.stringify(data) });
}

export function updateCategory(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteCategory(id: string): Promise<unknown> {
  return request(`/categories/${id}`, { method: "DELETE" });
}

// ── Connection Templates ──

export function getConnectionTemplates(
  params: TemplateListParams = {},
): Promise<unknown> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.search) qs.set("search", params.search);
  return request(`/connection-templates?${qs}`);
}

export function getConnectionTemplate(id: string): Promise<unknown> {
  return request(`/connection-templates/${id}`);
}

export function createConnectionTemplate(
  data: Record<string, unknown>,
): Promise<unknown> {
  return request("/connection-templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateConnectionTemplate(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/connection-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteConnectionTemplate(id: string): Promise<unknown> {
  return request(`/connection-templates/${id}`, { method: "DELETE" });
}

// ── Skill Templates ──

export function getSkillTemplates(params: TemplateListParams = {}): Promise<unknown> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.search) qs.set("search", params.search);
  return request(`/skill-templates?${qs}`);
}

export function getSkillTemplate(id: string): Promise<unknown> {
  return request(`/skill-templates/${id}`);
}

export function createSkillTemplate(data: Record<string, unknown>): Promise<unknown> {
  return request("/skill-templates", { method: "POST", body: JSON.stringify(data) });
}

export function updateSkillTemplate(
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return request(`/skill-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteSkillTemplate(id: string): Promise<unknown> {
  return request(`/skill-templates/${id}`, { method: "DELETE" });
}

// ── Reconciliation ──

export function getReconcileEnvs(): Promise<unknown> {
  return request("/reconcile/envs");
}

export function reconcileDryRun(env: string): Promise<unknown> {
  return request("/reconcile", {
    method: "POST",
    body: JSON.stringify({ env, mode: "dry-run" }),
  });
}

export function reconcileExecute(env: string): Promise<unknown> {
  return request("/reconcile", {
    method: "POST",
    body: JSON.stringify({ env, mode: "execute" }),
  });
}
