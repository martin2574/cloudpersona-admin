import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/DataTable";
import { getList, unlockMember } from "@/api";
import { shortId, formatDate } from "@/lib/utils";
import { toast } from "sonner";

function isLocked(row) {
  return row.lockedUntil && new Date(row.lockedUntil) > new Date();
}

const COLUMNS = [
  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{shortId(v)}</span> },
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  {
    key: "account",
    label: "Account",
    render: (v) =>
      v ? (
        <Link to={`/accounts/${v.id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {v.name || v.slug}
        </Link>
      ) : "—",
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
    render: (v) => (v ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>),
  },
  {
    key: "lockedUntil",
    label: "Lock",
    render: (v, row) =>
      isLocked(row) ? (
        <Badge variant="destructive">Locked</Badge>
      ) : row.failedLoginAttempts > 0 ? (
        <Badge variant="warning">{row.failedLoginAttempts} fails</Badge>
      ) : null,
  },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

export default function Members() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    const params = { page, limit: 50 };
    if (search) params.search = search;
    getList("members", params)
      .then((r) => { setData(r.data); setTotal(r.pagination.total); })
      .catch((e) => toast.error(e.message));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleUnlock(row) {
    if (!confirm(`Unlock member "${row.email}"?`)) return;
    try {
      await unlockMember(row.id);
      toast.success("Member unlocked");
      load();
    } catch (e) {
      toast.error(e.message);
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
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      <DataTable
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
