import type { ReactNode } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@yourq/ui";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  page?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  actions?: (row: T) => ReactNode;
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  sortKey,
  sortOrder,
  onSort,
  onRowClick,
  page = 1,
  total = 0,
  limit = 50,
  onPageChange,
  actions,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit);

  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sortKey !== columnKey)
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "h-10 px-4 text-left font-medium text-muted-foreground",
                    col.sortable !== false &&
                      onSort &&
                      "cursor-pointer select-none hover:text-foreground",
                  )}
                  onClick={() => col.sortable !== false && onSort?.(col.key)}
                >
                  <span className="flex items-center">
                    {col.label}
                    {col.sortable !== false && onSort && <SortIcon columnKey={col.key} />}
                  </span>
                </th>
              ))}
              {actions && (
                <th className="h-10 px-4 text-right font-medium text-muted-foreground w-24">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key], row)
                        : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? "—"}
                    </td>
                  ))}
                  {actions && (
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            {total} results — Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
