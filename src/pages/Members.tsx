import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Unlock } from "lucide-react";
import { Button, Input } from "@yourq/ui";
import { Badge } from "@/components/ui/badge";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { getList, unlockMember, type ListParams } from "@/api";
import type { AdminRecord, PaginatedResponse } from "@/types/admin";
import { shortId, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface MemberRow extends AdminRecord {
  lockedUntil?: string | null;
  failedLoginAttempts?: number;
  email?: string;
}

function isLocked(row: MemberRow): boolean {
  return Boolean(row.lockedUntil && new Date(row.lockedUntil) > new Date());
}

const COLUMNS: DataTableColumn<MemberRow>[] = [
  {
    key: "id",
    label: "ID",
    render: (v) => <span className="font-mono text-xs">{shortId(v as string)}</span>,
  },
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  {
    key: "account",
    label: "Account",
    render: (v) => {
      const account = v as { id?: string; name?: string; slug?: string } | null;
      return account ? (
        <Link
          to={`/accounts/${account.id}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {account.name || account.slug}
        </Link>
      ) : (
        "—"
      );
    },
    sortable: false,
  },
  {
    key: "isOwner",
    label: "Owner",
    render: (v) => (v ? <Badge variant="default">Owner</Badge> : null),
  },
  {
    key: "emailVerified",
    label: "Verified",
    render: (v) =>
      v ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>,
  },
  {
    key: "lockedUntil",
    label: "Lock",
    render: (_, row): ReactNode =>
      isLocked(row) ? (
        <Badge variant="destructive">Locked</Badge>
      ) : (row.failedLoginAttempts ?? 0) > 0 ? (
        <Badge variant="warning">{row.failedLoginAttempts} fails</Badge>
      ) : null,
  },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v as string) },
];

export default function Members() {
  const navigate = useNavigate();
  const [data, setData] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    const params: ListParams = { page, limit: 50 };
    if (search) params.search = search;
    getList("members", params)
      .then((r) => {
        const response = r as PaginatedResponse<MemberRow>;
        setData(response.data);
        setTotal(response.pagination.total);
      })
      .catch((e: Error) => toast.error(e.message));
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUnlock(row: MemberRow) {
    if (!confirm(`Unlock member "${row.email}"?`)) return;
    try {
      await unlockMember(row.id);
      toast.success("Member unlocked");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Members</h2>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search email, name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
      </div>

      <DataTable<MemberRow>
        columns={COLUMNS}
        data={data}
        onRowClick={(row) => navigate(`/members/${row.id}`)}
        page={page}
        total={total}
        onPageChange={setPage}
        actions={(row) =>
          isLocked(row) ? (
            <Button variant="ghost" size="sm" onClick={() => handleUnlock(row)}>
              <Unlock className="h-4 w-4 mr-1" /> Unlock
            </Button>
          ) : null
        }
      />
    </div>
  );
}
