import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { getOAuthProviders, deleteOAuthProvider } from "@/api";
import type { AdminRecord } from "@/types/admin";
import { toast } from "sonner";

interface OAuthProvider extends AdminRecord {
  provider: string;
  displayName: string;
  isActive: boolean;
}

const COLUMNS: DataTableColumn<AdminRecord>[] = [
  {
    key: "provider",
    label: "Provider",
    render: (v) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
        {v as string}
      </code>
    ),
  },
  { key: "displayName", label: "Display Name" },
  {
    key: "isActive",
    label: "Active",
    render: (v) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {v ? "Active" : "Inactive"}
      </span>
    ),
    sortable: false,
  },
];

export default function OAuthProviders() {
  const navigate = useNavigate();
  const [data, setData] = useState<OAuthProvider[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    getOAuthProviders()
      .then((r) => {
        const list = (
          Array.isArray(r) ? r : ((r as { data?: unknown[] }).data ?? [])
        ) as OAuthProvider[];
        setData(list);
      })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search
    ? data.filter(
        (d) =>
          d.provider.toLowerCase().includes(search.toLowerCase()) ||
          d.displayName.toLowerCase().includes(search.toLowerCase()),
      )
    : data;

  async function handleDelete(row: AdminRecord) {
    const provider = row as OAuthProvider;
    if (!confirm(`Delete "${provider.displayName}"?`)) return;
    try {
      await deleteOAuthProvider(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">OAuth Providers</h2>
        <Button onClick={() => navigate("/backoffice/oauth-providers/new")}>
          + New Provider
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search provider, display name..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          className="max-w-xs"
        />
      </div>

      <DataTable<AdminRecord>
        columns={COLUMNS}
        data={filtered}
        onRowClick={(row) =>
          navigate(`/backoffice/oauth-providers/${row.id}`)
        }
        page={1}
        total={filtered.length}
        limit={filtered.length || 20}
        onPageChange={() => {}}
        actions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
          >
            Delete
          </Button>
        )}
      />
    </div>
  );
}
