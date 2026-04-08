const BASE = "/api";
const SECRET = import.meta.env.VITE_ADMIN_API_SECRET as string | undefined;

interface ApiError {
  error?: string | { code?: string; message?: string };
  errors?: Array<{ message?: string }>;
}

function extractErrorMessage(err: ApiError, fallback: string): string {
  if (typeof err.error === "string") return err.error;
  if (typeof err.error === "object" && err.error?.message) return err.error.message;
  if (err.errors?.[0]?.message) return err.errors[0].message;
  return fallback;
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
    const err = (await res.json().catch(() => ({}))) as ApiError;
    throw new Error(extractErrorMessage(err, res.statusText));
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

export function upsertCategory(
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

export function upsertConnectionTemplate(
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

export function upsertSkillTemplate(
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
