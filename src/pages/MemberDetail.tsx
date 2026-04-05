import { useState, useEffect, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { Unlock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@yourq/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { getRecord, unlockMember } from "@/api";
import type { AdminRecord } from "@/types/admin";
import { shortId, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface MemberIdentity extends AdminRecord {
  provider?: string;
  providerEmail?: string;
  createdAt?: string;
}

interface MemberPermission extends AdminRecord {
  permission?: { code?: string; description?: string };
  createdAt?: string;
}

interface MemberData {
  id: string;
  email?: string;
  name?: string;
  isOwner?: boolean;
  emailVerified?: boolean;
  lockedUntil?: string | null;
  failedLoginAttempts?: number;
  account?: { id?: string; name?: string; slug?: string };
  memberIdentities?: MemberIdentity[];
  memberPermissions?: MemberPermission[];
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<MemberData | null>(null);

  function load() {
    if (!id) return;
    getRecord("members", id)
      .then((m) => setMember(m as MemberData))
      .catch((e: Error) => toast.error(e.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!member) return <p className="text-muted-foreground">Loading...</p>;

  const locked = Boolean(
    member.lockedUntil && new Date(member.lockedUntil) > new Date(),
  );

  async function handleUnlock() {
    if (!id) return;
    try {
      await unlockMember(id);
      toast.success("Member unlocked");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Member Detail</h2>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {member.name} ({member.email})
            {locked && <Badge variant="destructive">Locked</Badge>}
            {member.isOwner && <Badge variant="default">Owner</Badge>}
            {member.emailVerified ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="secondary">Unverified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{shortId(member.id)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Account</dt>
              <dd>
                <Link
                  to={`/accounts/${member.account?.id}`}
                  className="text-primary hover:underline"
                >
                  {member.account?.name || member.account?.slug}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Failed Logins</dt>
              <dd>{member.failedLoginAttempts}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Locked Until</dt>
              <dd>{member.lockedUntil ? formatDate(member.lockedUntil) : "—"}</dd>
            </div>
          </dl>
          {(locked || (member.failedLoginAttempts ?? 0) > 0) && (
            <Button variant="destructive" size="sm" onClick={handleUnlock}>
              <Unlock className="h-4 w-4 mr-2" /> Unlock Member
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="identities">
        <TabsList>
          <TabsTrigger value="identities">
            Identities ({member.memberIdentities?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="permissions">
            Permissions ({member.memberPermissions?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identities">
          <DataTable<MemberIdentity>
            columns={
              [
                {
                  key: "provider",
                  label: "Provider",
                  render: (v) => <Badge variant="outline">{v as ReactNode}</Badge>,
                },
                { key: "providerEmail", label: "Provider Email" },
                {
                  key: "createdAt",
                  label: "Created",
                  render: (v) => formatDate(v as string),
                },
              ] as DataTableColumn<MemberIdentity>[]
            }
            data={member.memberIdentities || []}
            total={member.memberIdentities?.length ?? 0}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <DataTable<MemberPermission>
            columns={
              [
                {
                  key: "permCode",
                  label: "Code",
                  render: (_, row) => (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {row.permission?.code}
                    </code>
                  ),
                },
                {
                  key: "permDesc",
                  label: "Description",
                  render: (_, row) => row.permission?.description || "—",
                  sortable: false,
                },
                {
                  key: "createdAt",
                  label: "Granted",
                  render: (v) => formatDate(v as string),
                },
              ] as DataTableColumn<MemberPermission>[]
            }
            data={member.memberPermissions || []}
            total={member.memberPermissions?.length ?? 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
