import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import DataTable from "@/components/DataTable";
import {
  getConnectionTemplates,
  deleteConnectionTemplate,
  getCategories,
} from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "serviceType", label: "Service Type", render: (v) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
  { key: "version", label: "Version" },
  { key: "category", label: "Category", render: (_, row) => row.category?.name ?? "—", sortable: false },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

export default function ConnectionTemplates() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    getConnectionTemplates(params)
      .then((r) => { setData(r.data); setTotal(r.total); })
      .catch((e) => toast.error(e.message));
  }, [page, search, categoryId]);

  useEffect(() => { load(); }, [load]);

  function handleCreate() {
    if (categories.length === 0) {
      toast.error("카테고리를 먼저 생성해주세요");
      return;
    }
    navigate("/backoffice/connection-templates/new");
  }

  async function handleDelete(row) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteConnectionTemplate(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Connection Templates</h2>
        <Button onClick={handleCreate}>+ New Template</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search name, serviceType..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        onRowClick={(row) => navigate(`/backoffice/connection-templates/${row.id}`)}
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
