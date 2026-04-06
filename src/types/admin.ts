/**
 * Admin 전역 타입 — Phase 3에서 openapi-typescript 도입 전 임시 타입.
 * 현재는 API 응답을 느슨하게 정의.
 */

export type AdminRecord = Record<string, unknown> & { id: string };

// eslint-disable-next-line no-restricted-syntax -- API Server 응답 스키마가 generic이라 수동 유지 (KB #161 §5.7)
export interface PaginatedResponse<T = AdminRecord> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// eslint-disable-next-line no-restricted-syntax -- Backoffice 자체 응답 포맷, API Server 소비 타입 아님
export interface BackofficePaginatedResponse<T = AdminRecord> {
  data: T[];
  total: number;
}

export interface ReconcileDiffItem {
  id: string;
  name: string;
  _changedFields?: string[];
}

export interface ReconcileDiff {
  create?: ReconcileDiffItem[];
  update?: ReconcileDiffItem[];
  delete?: ReconcileDiffItem[];
}

export interface ReconcileSummary {
  create: number;
  update: number;
  skip: number;
  delete: number;
}

export interface ReconcileDryRunResult {
  summary: {
    categories: ReconcileSummary;
    connectionTemplates: ReconcileSummary;
    skillTemplates: ReconcileSummary;
  };
  diff: {
    categories: ReconcileDiff;
    connectionTemplates: ReconcileDiff;
    skillTemplates: ReconcileDiff;
  };
}

export interface ReconcileExecuteItem {
  id: string;
  name: string;
  action: string;
  success: boolean;
  error?: string;
}

export interface ReconcileExecuteResult {
  stopped?: boolean;
  results: {
    categories: ReconcileExecuteItem[];
    connectionTemplates: ReconcileExecuteItem[];
    skillTemplates: ReconcileExecuteItem[];
  };
}
