/**
 * Admin 전역 타입.
 */

export type AdminRecord = Record<string, unknown> & { id: string };

// eslint-disable-next-line no-restricted-syntax -- API Server 응답 스키마가 generic이라 수동 유지 (KB #161 §5.7)
export interface PaginatedResponse<T = AdminRecord> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
