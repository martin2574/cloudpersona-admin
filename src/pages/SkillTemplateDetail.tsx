import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpecBuilder from "@/components/SpecBuilder";
import SpecPreview from "@/components/SpecPreview";
import {
  getSkillTemplate,
  upsertSkillTemplate,
  getCategories,
  getConnectionTemplates,
} from "@/backoffice-api";
import { validateSpec, type Spec } from "@/lib/schema-validator";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";
import type { AdminRecord, PaginatedResponse } from "@/types/admin";

interface Category extends AdminRecord {
  name?: string;
}

interface ConnectionTemplate extends AdminRecord {
  name?: string;
  serviceType?: string;
}

interface TemplateData extends AdminRecord {
  name: string;
  skillType: string;
  description?: string;
  version: string;
  categoryId: string;
  connectionTemplateId?: string | null;
  spec?: Spec;
  createdAt?: string;
}

interface FormState {
  name: string;
  skillType: string;
  description: string;
  version: string;
  categoryId: string;
  connectionTemplateId: string;
}

const EMPTY_SPEC: Spec = {
  jsonSchema: { type: "object", properties: {} },
  uiSchema: {},
};

export default function SkillTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [connections, setConnections] = useState<ConnectionTemplate[]>([]);
  const [form, setForm] = useState<FormState>({
    name: "",
    skillType: "",
    description: "",
    version: "0.1.0",
    categoryId: "",
    connectionTemplateId: "",
  });
  const [spec, setSpec] = useState<Spec>(EMPTY_SPEC);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [unsavedDialog, allowNavigation] = useUnsavedChanges(dirty);

  useEffect(() => {
    if (isNew) {
      // 신규: 카테고리 + 커넥션 목록만 로드
      Promise.all([getCategories(), getConnectionTemplates({ limit: 100 })])
        .then(([cats, conns]) => {
          const catsList = (cats ?? []) as Category[];
          setCategories(catsList);
          setConnections(Array.isArray(conns) ? conns as ConnectionTemplate[] : (conns as PaginatedResponse<ConnectionTemplate>).data);
          if (catsList.length > 0)
            setForm((prev) => ({ ...prev, categoryId: catsList[0].id }));
        })
        .catch((e: Error) => toast.error(e.message));
    } else if (id) {
      // 수정: 기존 템플릿 + 카테고리 + 커넥션 로드
      Promise.all([
        getSkillTemplate(id),
        getCategories(),
        getConnectionTemplates({ limit: 100 }),
      ])
        .then(([tmpl, cats, conns]) => {
          const t = tmpl as TemplateData;
          setTemplate(t);
          setCategories((cats ?? []) as Category[]);
          setConnections(Array.isArray(conns) ? conns as ConnectionTemplate[] : (conns as PaginatedResponse<ConnectionTemplate>).data);
          setForm({
            name: t.name,
            skillType: t.skillType,
            description: t.description || "",
            version: t.version,
            categoryId: t.categoryId,
            connectionTemplateId: t.connectionTemplateId || "",
          });
          setSpec(t.spec || EMPTY_SPEC);
          setLoading(false);
        })
        .catch((e: Error) => toast.error(e.message));
    }
  }, [id, isNew]);

  function handleFormChange(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

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
    if (!form.skillType.trim()) return toast.error("Skill Type is required");
    if (!form.version.trim()) return toast.error("Version is required");
    if (!form.categoryId) return toast.error("Category is required");

    // Spec 검증
    const validation = validateSpec(spec);
    if (!validation.valid) {
      return toast.error(`Spec validation failed: ${validation.errors[0].message}`);
    }

    try {
      const payload = {
        ...form,
        connectionTemplateId: form.connectionTemplateId || null,
        spec,
      };
      if (isNew) {
        const newId = crypto.randomUUID();
        const created = (await upsertSkillTemplate(newId, payload)) as TemplateData;
        setDirty(false);
        allowNavigation();
        toast.success("Created");
        navigate(`/backoffice/skill-templates/${created.id}`, { replace: true });
      } else if (id) {
        const updated = (await upsertSkillTemplate(id, payload)) as TemplateData;
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
      navigate("/backoffice/skill-templates");
      return;
    }
    if (!template) return;
    setForm({
      name: template.name,
      skillType: template.skillType,
      description: template.description || "",
      version: template.version,
      categoryId: template.categoryId,
      connectionTemplateId: template.connectionTemplateId || "",
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
          to="/backoffice/skill-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Skill Templates
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {isNew ? "New Skill Template" : template?.name}
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
                  <label className="text-sm font-medium">Skill Type</label>
                  <Input
                    value={form.skillType}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange("skillType", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={form.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange("description", e.target.value)}
                    placeholder="템플릿 설명"
                  />
                </div>
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
                <div className="col-span-2">
                  <label className="text-sm font-medium">Connection Template</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.connectionTemplateId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      handleFormChange("connectionTemplateId", e.target.value)
                    }
                  >
                    <option value="">None (no connection required)</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.serviceType})
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
