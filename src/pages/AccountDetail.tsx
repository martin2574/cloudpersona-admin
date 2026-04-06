import { useState, useEffect, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import FormDialog, { type FormDialogField } from "@/components/FormDialog";
import {
  getRecord,
  getList,
  updateRecord,
  changeAccountType,
  deleteAccount,
} from "@/api";
import type { AdminRecord, PaginatedResponse } from "@/types/admin";
import { shortId, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type BadgeVariant =
  | "success"
  | "destructive"
  | "secondary"
  | "default"
  | "outline"
  | "warning";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  deleted: "destructive",
};
const STATUS_FIELDS: FormDialogField[] = [
  { key: "status", label: "Status", type: "select", options: ["active", "deleted"] },
];
const TYPE_FIELDS: FormDialogField[] = [
  { key: "type", label: "Type", type: "select", options: ["LIVE", "TEST"] },
];

interface AccountData {
  id: string;
  name?: string;
  slug?: string;
  status?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: { members?: number; workspaces?: number };
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [dialog, setDialog] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  function load() {
    if (!id) return;
    getRecord("accounts", id)
      .then((a) => setAccount(a as AccountData))
      .catch((e: Error) => toast.error(e.message));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleStatusChange(formData: Record<string, unknown>) {
    if (!id) return;
    try {
      await updateRecord("accounts", id, formData);
      toast.success("Status updated");
      setDialog(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleTypeChange(formData: Record<string, unknown>) {
    if (!id) return;
    try {
      await changeAccountType(id, formData.type as string);
      toast.success("Type updated");
      setTypeDialog(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteAccount(id);
      toast.success("Account deleted");
      navigate("/accounts");
    } catch (e) {
      toast.error((e as Error).message);
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
            <Badge variant={STATUS_VARIANT[account.status ?? ""] || "secondary"}>
              {account.status}
            </Badge>
            <Badge variant={account.type === "TEST" ? "warning" : "secondary"}>
              {account.type}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setDialog(true)}>
              Change Status
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTypeDialog(true)}>
              Change Type
            </Button>
            {account.type === "TEST" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialog(true)}
              >
                Delete
              </Button>
            )}
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
              <dd>
                <code>{account.slug}</code>
              </dd>
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
          <TabsTrigger value="members">
            Members ({account._count?.members ?? 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersTab accountId={id!} />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Change Account Status"
        fields={STATUS_FIELDS}
        initialData={account as unknown as Record<string, unknown>}
        onSubmit={handleStatusChange}
      />

      <FormDialog
        open={typeDialog}
        onOpenChange={setTypeDialog}
        title="Change Account Type"
        fields={TYPE_FIELDS}
        initialData={account as unknown as Record<string, unknown>}
        onSubmit={handleTypeChange}
      />

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Account <strong>{account.name || account.slug}</strong>와 관련된 모든
              데이터(Members, Workspaces, Sessions 등)가 영구 삭제됩니다. 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AccountMember extends AdminRecord {
  email?: string;
  name?: string;
  isOwner?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
}

function MembersTab({ accountId }: { accountId: string }) {
  const [data, setData] = useState<AccountMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getList("members", { accountId, page, limit: 50 })
      .then((r) => {
        const response = r as PaginatedResponse<AccountMember>;
        setData(response.data);
        setTotal(response.pagination.total);
      })
      .catch((e: Error) => toast.error(e.message));
  }, [accountId, page]);

  const columns: DataTableColumn<AccountMember>[] = [
    {
      key: "id",
      label: "ID",
      render: (v) => <span className="font-mono text-xs">{shortId(v as string)}</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (v, row) => (
        <Link to={`/members/${row.id}`} className="text-primary hover:underline">
          {v as ReactNode}
        </Link>
      ),
    },
    { key: "name", label: "Name" },
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
    { key: "createdAt", label: "Created", render: (v) => formatDate(v as string) },
  ];

  return (
    <DataTable<AccountMember>
      columns={columns}
      data={data}
      total={total}
      page={page}
      onPageChange={setPage}
    />
  );
}
