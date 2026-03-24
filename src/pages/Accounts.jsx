import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { getList, updateRecord } from "@/api";
import { shortId, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_VARIANT = { active: "success", deleted: "destructive" };

const COLUMNS = [
  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{shortId(v)}</span> },
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug", render: (v) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
  {
    key: "status",
    label: "Status",
    render: (v) => <Badge variant={STATUS_VARIANT[v] || "secondary"}>{v}</Badge>,
  },
  { key: "memberCount", label: "Members", render: (_, row) => row._count?.members ?? 0, sortable: false },
  { key: "workspaceCount", label: "Workspaces", render: (_, row) => row._count?.workspaces ?? 0, sortable: false },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

const STATUS_FIELDS = [
  { key: "status", label: "Status", type: "select", options: ["active", "deleted"] },
];

export default function Accounts() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialog, setDialog] = useState({ open: false, editing: null });

  const load = useCallback(() => {
    const params = { page, limit: 50 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    getList("accounts", params)
      .then((r) => { setData(r.data); setTotal(r.pagination.total); })
      .catch((e) => toast.error(e.message));
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(formData) {
    try {
      await updateRecord("accounts", dialog.editing.id, formData);
      toast.success("Account updated");
      setDialog({ open: false, editing: null });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Accounts</h2>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search name, slug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        onRowClick={(row) => navigate(`/accounts/${row.id}`)}
        page={page}
        total={total}
        onPageChange={setPage}
        actions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => setDialog({ open: true, editing: row })}>
            Change Status
          </Button>
        )}
      />

      <FormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, editing: dialog.editing })}
        title="Change Account Status"
        fields={STATUS_FIELDS}
        initialData={dialog.editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
