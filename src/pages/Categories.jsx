import { useState, useEffect, useCallback } from "react";
import { Button } from "@yourq/ui";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/backoffice-api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS = [
  { key: "id", label: "ID", render: (v) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
  { key: "name", label: "Name" },
  { key: "icon", label: "Icon" },
  { key: "sortOrder", label: "Sort Order" },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v) },
];

const FIELDS = [
  { key: "id", label: "ID (slug)", placeholder: "e.g. telephony", required: true },
  { key: "name", label: "Name", required: true },
  { key: "icon", label: "Icon", placeholder: "e.g. phone.svg" },
  { key: "sortOrder", label: "Sort Order", placeholder: "0", type: "text" },
];

const EDIT_FIELDS = FIELDS.map((f) => (f.key === "id" ? { ...f, readOnly: true } : f));

export default function Categories() {
  const [data, setData] = useState([]);
  const [dialog, setDialog] = useState({ open: false, editing: null });

  const load = useCallback(() => {
    getCategories()
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(formData) {
    try {
      const payload = { ...formData, sortOrder: parseInt(formData.sortOrder) || 0 };
      if (dialog.editing) {
        await updateCategory(dialog.editing.id, payload);
        toast.success("Category updated");
      } else {
        await createCategory(payload);
        toast.success("Category created");
      }
      setDialog({ open: false, editing: null });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete category "${row.name}"?`)) return;
    try {
      await deleteCategory(row.id);
      toast.success("Category deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => setDialog({ open: true, editing: null })}>+ New Category</Button>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data}
        total={data.length}
        actions={(row) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDialog({ open: true, editing: row })}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
              Delete
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, editing: dialog.editing })}
        title={dialog.editing ? "Edit Category" : "New Category"}
        fields={dialog.editing ? EDIT_FIELDS : FIELDS}
        initialData={dialog.editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
