import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { getRecord, getList, updateRecord } from "@/api";
import { shortId, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_VARIANT = { active: "success", suspended: "warning", deleted: "destructive" };
const STATUS_FIELDS = [
  { key: "status", label: "Status", type: "select", options: ["active", "suspended", "deleted"] },
];

export default function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [dialog, setDialog] = useState(false);

  function load() {
    getRecord("accounts", id).then(setAccount).catch((e) => toast.error(e.message));
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(formData) {
    try {
      await updateRecord("accounts", id, formData);
      toast.success("Status updated");
      setDialog(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!account) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Account Detail</h2>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {account.name || account.slug}
            <Badge variant={STATUS_VARIANT[account.status]}>{account.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => setDialog(true)}>
              Change Status
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{account.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slug</dt>
              <dd><code>{account.slug}</code></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Members</dt>
              <dd>{account._count?.members ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Workspaces</dt>
              <dd>{account._count?.workspaces ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(account.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDate(account.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({account._count?.members ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersTab accountId={id} />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Change Account Status"
        fields={STATUS_FIELDS}
        initialData={account}
        onSubmit={handleStatusChange}
      />
    </div>
  );
}

function MembersTab({ accountId }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getList("members", { accountId, page, limit: 50 })
      .then((r) => { setData(r.data); setTotal(r.pagination.total); })
      .catch((e) => toast.error(e.message));
  }, [accountId, page]);

  const columns = [
    { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{shortId(v)}</span> },
    {
      key: "email",
      label: "Email",
      render: (v, row) => <Link to={`/members/${row.id}`} className="text-primary hover:underline">{v}</Link>,
    },
    { key: "name", label: "Name" },
    { key: "isOwner", label: "Owner", render: (v) => (v ? <Badge variant="default">Owner</Badge> : null) },
    {
      key: "emailVerified",
      label: "Verified",
      render: (v) => (v ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>),
    },
    { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
  ];

  return <DataTable columns={columns} data={data} total={total} page={page} onPageChange={setPage} />;
}
