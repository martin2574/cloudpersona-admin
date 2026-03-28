import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, CheckCircle2, XCircle, Minus } from "lucide-react";
import { getReconcileEnvs, reconcileDryRun, reconcileExecute } from "@/backoffice-api";

const ENV_LABELS = { test: "Test", prod: "Production" };
const ENV_COLORS = { test: "bg-blue-100 text-blue-800", prod: "bg-red-100 text-red-800" };

function SummaryCard({ label, create, update, skip, delete: del }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Badge variant="success">{create} create</Badge>
          <Badge variant="warning">{update} update</Badge>
          <Badge variant="secondary">{skip} skip</Badge>
          {del > 0 && <Badge variant="destructive">{del} delete</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function DiffDetail({ title, diff }) {
  if (!diff) return null;
  const hasCreate = diff.create?.length > 0;
  const hasUpdate = diff.update?.length > 0;
  const hasDelete = diff.delete?.length > 0;
  if (!hasCreate && !hasUpdate && !hasDelete) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium">Name</th>
            <th className="text-left py-2 px-3 font-medium">Action</th>
            <th className="text-left py-2 px-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {diff.create?.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2 px-3">{item.name}</td>
              <td className="py-2 px-3"><Badge variant="success">create</Badge></td>
              <td className="py-2 px-3 text-muted-foreground">New</td>
            </tr>
          ))}
          {diff.update?.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2 px-3">{item.name}</td>
              <td className="py-2 px-3"><Badge variant="warning">update</Badge></td>
              <td className="py-2 px-3">
                {(item._changedFields || []).map((f) => (
                  <Badge key={f} variant="outline" className="mr-1">{f}</Badge>
                ))}
              </td>
            </tr>
          ))}
          {diff.delete?.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2 px-3">{item.name}</td>
              <td className="py-2 px-3"><Badge variant="destructive">delete</Badge></td>
              <td className="py-2 px-3 text-muted-foreground">Target only</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExecuteResults({ data }) {
  if (!data) return null;

  const sections = [
    { key: "categories", title: "Categories" },
    { key: "connectionTemplates", title: "Connection Templates" },
    { key: "skillTemplates", title: "Skill Templates" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Results</h3>
      {sections.map(({ key, title }) => {
        const items = data.results[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Name</th>
                  <th className="text-left py-2 px-3 font-medium">Action</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2 px-3">{item.name}</td>
                    <td className="py-2 px-3">{item.action}</td>
                    <td className="py-2 px-3">
                      {item.success ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /> OK</span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" /> {item.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function Reconcile() {
  const [envs, setEnvs] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState("");
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [executeResult, setExecuteResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReconcileEnvs().then((list) => {
      setEnvs(list);
      if (list.length > 0) setSelectedEnv(list[0]);
    }).catch(console.error);
  }, []);

  const handleDryRun = async () => {
    setLoading(true);
    setError(null);
    setExecuteResult(null);
    try {
      const result = await reconcileDryRun(selectedEnv);
      setDryRunResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    const envLabel = ENV_LABELS[selectedEnv] || selectedEnv;
    if (!window.confirm(`Backoffice 데이터를 ${envLabel} 환경에 동기화합니다. 계속하시겠습니까?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reconcileExecute(selectedEnv);
      setExecuteResult(result);
      setDryRunResult(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = dryRunResult && Object.values(dryRunResult.summary).some(
    (s) => s.create > 0 || s.update > 0 || s.delete > 0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Reconcile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Backoffice 템플릿 데이터를 대상 환경에 동기화
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedEnv}
            onChange={(e) => { setSelectedEnv(e.target.value); setDryRunResult(null); setExecuteResult(null); }}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            {envs.map((env) => (
              <option key={env} value={env}>{ENV_LABELS[env] || env}</option>
            ))}
          </select>
          <button
            onClick={handleDryRun}
            disabled={loading || !selectedEnv}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Dry Run
          </button>
          {hasChanges && (
            <button
              onClick={handleExecute}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Execute
            </button>
          )}
        </div>
      </div>

      {dryRunResult && (
        <div className="mb-4">
          <Badge className={ENV_COLORS[selectedEnv] || ""}>
            {ENV_LABELS[selectedEnv] || selectedEnv}
          </Badge>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 mb-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {dryRunResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Categories" {...dryRunResult.summary.categories} />
            <SummaryCard label="Connection Templates" {...dryRunResult.summary.connectionTemplates} />
            <SummaryCard label="Skill Templates" {...dryRunResult.summary.skillTemplates} />
          </div>

          {hasChanges ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Changes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <DiffDetail title="Categories" diff={dryRunResult.diff.categories} />
                <DiffDetail title="Connection Templates" diff={dryRunResult.diff.connectionTemplates} />
                <DiffDetail title="Skill Templates" diff={dryRunResult.diff.skillTemplates} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Minus className="h-8 w-8 mx-auto mb-2" />
                No changes detected. Everything is in sync.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {executeResult && (
        <div className="space-y-4">
          <ExecuteResults data={executeResult} />
          {executeResult.stopped && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              동기화가 중간에 멈췄습니다. 실패 항목을 확인 후 다시 실행하세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
