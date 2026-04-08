import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpecBuilder from "@/components/SpecBuilder";
import SpecPreview from "@/components/SpecPreview";
import {
  getConnectionTemplate,
  upsertConnectionTemplate,
  getCategories,
} from "@/backoffice-api";
import { validateSpec, type Spec } from "@/lib/schema-validator";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";
import type { AdminRecord } from "@/types/admin";
import { getOAuthProviders } from "@/api";

interface Category extends AdminRecord {
  name?: string;
}

interface OAuthProviderOption {
  id: string;
  provider: string;
  displayName: string;
  scopesAvailable: string[];
  isActive: boolean;
}

interface TemplateData extends AdminRecord {
  name: string;
  serviceType: string;
  description?: string;
  version: string;
  categoryId: string;
  authMethod: string;
  oauthProviderId?: string;
  oauthScopes?: string[];
  spec?: Spec;
  createdAt?: string;
}

interface FormState {
  name: string;
  serviceType: string;
  description: string;
  version: string;
  categoryId: string;
  authMethod: string;
  oauthProviderId: string;
  oauthScopes: string[];
}

const EMPTY_SPEC: Spec = {
  jsonSchema: { type: "object", properties: {} },
  uiSchema: {},
};

export default function ConnectionTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [oauthProviders, setOAuthProviders] = useState<OAuthProviderOption[]>([]);
  const [form, setForm] = useState<FormState>({
    name: "",
    serviceType: "",
    description: "",
    version: "0.1.0",
    categoryId: "",
    authMethod: "credential",
    oauthProviderId: "",
    oauthScopes: [],
  });
  const [spec, setSpec] = useState<Spec>(EMPTY_SPEC);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [unsavedDialog, allowNavigation] = useUnsavedChanges(dirty);

  useEffect(() => {
    // OAuth Providers 목록 로드
    getOAuthProviders()
      .then((r) => {
        const list = (Array.isArray(r) ? r : ((r as { data?: unknown[] }).data ?? [])) as OAuthProviderOption[];
        setOAuthProviders(list.filter((p) => p.isActive));
      })
      .catch(() => {}); // OAuth Provider 로드 실패해도 기존 폼에 영향 없음

    if (isNew) {
      // 신규: 카테고리만 로드하고 빈 폼 표시
      getCategories()
        .then((cats) => {
          const catsList = (cats ?? []) as Category[];
          setCategories(catsList);
          if (catsList.length > 0)
            setForm((prev) => ({ ...prev, categoryId: catsList[0].id }));
        })
        .catch((e: Error) => toast.error(e.message));
    } else if (id) {
      // 수정: 기존 템플릿 + 카테고리 로드
      Promise.all([getConnectionTemplate(id), getCategories()])
        .then(([tmpl, cats]) => {
          const t = tmpl as TemplateData;
          setTemplate(t);
          setCategories((cats ?? []) as Category[]);
          setForm({
            name: t.name,
            serviceType: t.serviceType,
            description: t.description || "",
            version: t.version,
            categoryId: t.categoryId,
            authMethod: t.authMethod || "credential",
            oauthProviderId: t.oauthProviderId || "",
            oauthScopes: t.oauthScopes || [],
          });
          setSpec(t.spec || EMPTY_SPEC);
          setLoading(false);
        })
        .catch((e: Error) => toast.error(e.message));
    }
  }, [id, isNew]);

  function handleFormChange(key: keyof FormState, value: string | string[]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // authMethod가 credential로 변경되면 OAuth 필드 초기화
      if (key === "authMethod" && value !== "oauth2") {
        next.oauthProviderId = "";
        next.oauthScopes = [];
      }
      // OAuth Provider가 변경되면 scopes 초기화
      if (key === "oauthProviderId") {
        next.oauthScopes = [];
      }
      return next;
    });
    setDirty(true);
  }

  const selectedProvider = oauthProviders.find(
    (p) => p.id === form.oauthProviderId,
  );
  const availableScopes = selectedProvider?.scopesAvailable ?? [];

  function handleSpecChange(
    jsonSchema: Record<string, unknown>,
    uiSchema: Record<string, unknown>,
  ) {
    setSpec((prev) => ({ ...prev, jsonSchema, uiSchema }));
    setDirty(true);
  }

  async function handleSave() {
    // 필수 입력 검증
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.serviceType.trim()) return toast.error("Service Type is required");
    if (!form.version.trim()) return toast.error("Version is required");
    if (!form.categoryId) return toast.error("Category is required");

    // OAuth2 선택 시 추가 검증
    if (form.authMethod === "oauth2") {
      if (!form.oauthProviderId)
        return toast.error("OAuth Provider is required");
      if (form.oauthScopes.length === 0)
        return toast.error("At least one OAuth Scope is required");
    }

    // Spec 검증
    const validation = validateSpec(spec);
    if (!validation.valid) {
      return toast.error(`Spec validation failed: ${validation.errors[0].message}`);
    }

    // payload 구성 — credential일 때는 OAuth 필드 null/빈 배열
    const payload = {
      ...form,
      spec,
      ...(form.authMethod !== "oauth2"
        ? { oauthProviderId: null, oauthScopes: [] }
        : {}),
    };

    try {
      if (isNew) {
        const newId = crypto.randomUUID();
        const created = (await upsertConnectionTemplate(newId, payload)) as TemplateData;
        setDirty(false);
        allowNavigation();
        toast.success("Created");
        navigate(`/backoffice/connection-templates/${created.id}`, { replace: true });
      } else if (id) {
        const updated = (await upsertConnectionTemplate(id, payload)) as TemplateData;
        setTemplate(updated);
        setDirty(false);
        toast.success("Saved");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleCancel() {
    if (isNew) {
      navigate("/backoffice/connection-templates");
      return;
    }
    if (!template) return;
    setForm({
      name: template.name,
      serviceType: template.serviceType,
      description: template.description || "",
      version: template.version,
      categoryId: template.categoryId,
      authMethod: template.authMethod || "credential",
      oauthProviderId: template.oauthProviderId || "",
      oauthScopes: template.oauthScopes || [],
    });
    setSpec(template.spec || EMPTY_SPEC);
    setDirty(false);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      {unsavedDialog}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/backoffice/connection-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Connection Templates
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {isNew ? "New Connection Template" : template?.name}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={isNew ? false : !dirty} onClick={handleSave}>
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent
          value="edit"
          forceMount
          className="space-y-6 mt-4 data-[state=inactive]:hidden"
        >
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Service Type</label>
                  <Input
                    value={form.serviceType}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange("serviceType", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Auth Method</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.authMethod}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange("authMethod", e.target.value)}
                  >
                    <option value="credential">credential</option>
                    <option value="oauth2">oauth2</option>
                  </select>
                </div>
                {form.authMethod === "oauth2" && (
                  <>
                    <div>
                      <label className="text-sm font-medium">OAuth Provider</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={form.oauthProviderId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleFormChange("oauthProviderId", e.target.value)
                        }
                      >
                        <option value="">Select Provider...</option>
                        {oauthProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.oauthProviderId && availableScopes.length > 0 && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium">OAuth Scopes</label>
                        <div className="flex flex-wrap gap-2 mt-2 p-3 rounded-md border border-input bg-background">
                          {availableScopes.map((scope) => (
                            <label
                              key={scope}
                              className="inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={form.oauthScopes.includes(scope)}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const next = e.target.checked
                                    ? [...form.oauthScopes, scope]
                                    : form.oauthScopes.filter((s) => s !== scope);
                                  handleFormChange("oauthScopes", next);
                                }}
                                className="rounded border-input"
                              />
                              <span className="text-sm">{scope}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="text-sm font-medium">Version</label>
                  <Input
                    value={form.version}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange("version", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.categoryId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange("categoryId", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!isNew && template && (
                <p className="text-xs text-muted-foreground mt-3">
                  ID: {template.id} | Created: {formatDate(template.createdAt)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spec Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <SpecBuilder
                jsonSchema={spec.jsonSchema}
                uiSchema={spec.uiSchema}
                onChange={handleSpecChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="preview"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <SpecPreview jsonSchema={spec.jsonSchema} uiSchema={spec.uiSchema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
