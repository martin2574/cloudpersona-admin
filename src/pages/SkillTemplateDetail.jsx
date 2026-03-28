import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpecBuilder from "@/components/SpecBuilder";
import SpecPreview from "@/components/SpecPreview";
import {
  getSkillTemplate,
  updateSkillTemplate,
  getCategories,
  getConnectionTemplates,
} from "@/backoffice-api";
import { validateSpec } from "@/lib/schema-validator";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";

export default function SkillTemplateDetail() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [categories, setCategories] = useState([]);
  const [connections, setConnections] = useState([]);
  const [form, setForm] = useState({
    name: "",
    skillType: "",
    version: "",
    categoryId: "",
    connectionTemplateId: "",
  });
  const [spec, setSpec] = useState({ jsonSchema: {}, uiSchema: {} });
  const [dirty, setDirty] = useState(false);
  const unsavedDialog = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([
      getSkillTemplate(id),
      getCategories(),
      getConnectionTemplates({ limit: 100 }),
    ])
      .then(([tmpl, cats, conns]) => {
        setTemplate(tmpl);
        setCategories(cats);
        setConnections(conns.data);
        setForm({
          name: tmpl.name,
          skillType: tmpl.skillType,
          version: tmpl.version,
          categoryId: tmpl.categoryId,
          connectionTemplateId: tmpl.connectionTemplateId || "",
        });
        setSpec(tmpl.spec || { jsonSchema: { type: "object", properties: {} }, uiSchema: {} });
      })
      .catch((e) => toast.error(e.message));
  }, [id]);

  function handleFormChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSpecChange(jsonSchema, uiSchema) {
    setSpec({ jsonSchema, uiSchema });
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
      const updated = await updateSkillTemplate(id, payload);
      setTemplate(updated);
      setDirty(false);
      toast.success("Saved");
    } catch (e) {
      toast.error(e.message);
    }
  }

  function handleCancel() {
    if (!template) return;
    setForm({
      name: template.name,
      skillType: template.skillType,
      version: template.version,
      categoryId: template.categoryId,
      connectionTemplateId: template.connectionTemplateId || "",
    });
    setSpec(template.spec || { jsonSchema: { type: "object", properties: {} }, uiSchema: {} });
    setDirty(false);
  }

  if (!template) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      {unsavedDialog}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/backoffice/skill-templates" className="text-sm text-muted-foreground hover:text-foreground">
          ← Skill Templates
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{template.name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!dirty} onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!dirty} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" forceMount className="space-y-6 mt-4 data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Skill Type</label>
                  <Input value={form.skillType} onChange={(e) => handleFormChange("skillType", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Version</label>
                  <Input value={form.version} onChange={(e) => handleFormChange("version", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.categoryId}
                    onChange={(e) => handleFormChange("categoryId", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Connection Template</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.connectionTemplateId}
                    onChange={(e) => handleFormChange("connectionTemplateId", e.target.value)}
                  >
                    <option value="">None (no connection required)</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.serviceType})</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ID: {template.id} | Created: {formatDate(template.createdAt)}
              </p>
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

        <TabsContent value="preview" forceMount className="mt-4 data-[state=inactive]:hidden">
          <SpecPreview jsonSchema={spec.jsonSchema} uiSchema={spec.uiSchema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
