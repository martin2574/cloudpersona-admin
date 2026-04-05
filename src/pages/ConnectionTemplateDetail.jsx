import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@yourq/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpecBuilder from "@/components/SpecBuilder";
import SpecPreview from "@/components/SpecPreview";
import {
  getConnectionTemplate,
  createConnectionTemplate,
  updateConnectionTemplate,
  getCategories,
} from "@/backoffice-api";
import { validateSpec } from "@/lib/schema-validator";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";

const EMPTY_SPEC = { jsonSchema: { type: "object", properties: {} }, uiSchema: {} };

export default function ConnectionTemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [template, setTemplate] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    version: "0.1.0",
    categoryId: "",
  });
  const [spec, setSpec] = useState(EMPTY_SPEC);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const unsavedDialog = useUnsavedChanges(dirty);

  useEffect(() => {
    if (isNew) {
      // 신규: 카테고리만 로드하고 빈 폼 표시
      getCategories()
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) setForm((prev) => ({ ...prev, categoryId: cats[0].id }));
        })
        .catch((e) => toast.error(e.message));
    } else {
      // 수정: 기존 템플릿 + 카테고리 로드
      Promise.all([getConnectionTemplate(id), getCategories()])
        .then(([tmpl, cats]) => {
          setTemplate(tmpl);
          setCategories(cats);
          setForm({
            name: tmpl.name,
            serviceType: tmpl.serviceType,
            version: tmpl.version,
            categoryId: tmpl.categoryId,
          });
          setSpec(tmpl.spec || EMPTY_SPEC);
          setLoading(false);
        })
        .catch((e) => toast.error(e.message));
    }
  }, [id, isNew]);

  function handleFormChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSpecChange(jsonSchema, uiSchema) {
    setSpec((prev) => ({ ...prev, jsonSchema, uiSchema }));
    setDirty(true);
  }

  async function handleSave() {
    // 필수 입력 검증
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.serviceType.trim()) return toast.error("Service Type is required");
    if (!form.version.trim()) return toast.error("Version is required");
    if (!form.categoryId) return toast.error("Category is required");

    // Spec 검증
    const validation = validateSpec(spec);
    if (!validation.valid) {
      return toast.error(`Spec validation failed: ${validation.errors[0].message}`);
    }

    try {
      if (isNew) {
        const created = await createConnectionTemplate({ ...form, spec });
        setDirty(false);
        toast.success("Created");
        navigate(`/backoffice/connection-templates/${created.id}`, { replace: true });
      } else {
        const updated = await updateConnectionTemplate(id, { ...form, spec });
        setTemplate(updated);
        setDirty(false);
        toast.success("Saved");
      }
    } catch (e) {
      toast.error(e.message);
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
      version: template.version,
      categoryId: template.categoryId,
    });
    setSpec(template.spec || EMPTY_SPEC);
    setDirty(false);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      {unsavedDialog}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/backoffice/connection-templates" className="text-sm text-muted-foreground hover:text-foreground">
          ← Connection Templates
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{isNew ? "New Connection Template" : template.name}</h2>
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
                  <label className="text-sm font-medium">Service Type</label>
                  <Input value={form.serviceType} onChange={(e) => handleFormChange("serviceType", e.target.value)} />
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
              </div>
              {!isNew && (
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

        <TabsContent value="preview" forceMount className="mt-4 data-[state=inactive]:hidden">
          <SpecPreview jsonSchema={spec.jsonSchema} uiSchema={spec.uiSchema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
