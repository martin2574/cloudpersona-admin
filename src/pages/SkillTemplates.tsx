import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import {
  getSkillTemplates,
  deleteSkillTemplate,
  getCategories,
  type TemplateListParams,
} from "@/backoffice-api";
import type { AdminRecord, BackofficePaginatedResponse } from "@/types/admin";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Category extends AdminRecord {
  name?: string;
}

const COLUMNS: DataTableColumn<AdminRecord>[] = [
  { key: "name", label: "Name" },
  {
    key: "skillType",
    label: "Skill Type",
    render: (v) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v as ReactNode}</code>
    ),
  },
  { key: "version", label: "Version" },
  {
    key: "category",
    label: "Category",
    render: (_, row) =>
      (row as { category?: { name?: string } }).category?.name ?? "—",
    sortable: false,
  },
  {
    key: "connectionTemplate",
    label: "Connection",
    render: (_, row) =>
      (row as { connectionTemplate?: { name?: string } }).connectionTemplate?.name ?? "—",
    sortable: false,
  },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v as string) },
];

export default function SkillTemplates() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories((cats ?? []) as Category[]))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    const params: TemplateListParams = { page, limit: 20 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    getSkillTemplates(params)
      .then((r) => {
        const response = r as BackofficePaginatedResponse;
        setData(response.data);
        setTotal(response.total);
      })
      .catch((e: Error) => toast.error(e.message));
  }, [page, search, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreate() {
    if (categories.length === 0) {
      toast.error("카테고리를 먼저 생성해주세요");
      return;
    }
    navigate("/backoffice/skill-templates/new");
  }

  async function handleDelete(row: AdminRecord) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteSkillTemplate(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Skill Templates</h2>
        <Button onClick={handleCreate}>+ New Template</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search name, skillType..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable<AdminRecord>
        columns={COLUMNS}
        data={data}
        onRowClick={(row) => navigate(`/backoffice/skill-templates/${row.id}`)}
        page={page}
        total={total}
        limit={20}
        onPageChange={setPage}
        actions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        )}
      />
    </div>
  );
}
