import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import FormDialog, { type FormDialogField } from "@/components/FormDialog";
import {
  getCategories,
  upsertCategory,
  deleteCategory,
} from "@/backoffice-api";
import type { AdminRecord } from "@/types/admin";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS: DataTableColumn<AdminRecord>[] = [
  {
    key: "id",
    label: "ID",
    render: (v) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v as ReactNode}</code>
    ),
  },
  { key: "name", label: "Name" },
  { key: "icon", label: "Icon" },
  { key: "sortOrder", label: "Sort Order" },
  { key: "createdAt", label: "Created", render: (v) => formatDate(v as string) },
];

const FIELDS: FormDialogField[] = [
  { key: "id", label: "ID (slug)", placeholder: "e.g. telephony", required: true },
  { key: "name", label: "Name", required: true },
  { key: "icon", label: "Icon", placeholder: "e.g. phone.svg" },
  { key: "sortOrder", label: "Sort Order", placeholder: "0", type: "text" },
];

const EDIT_FIELDS: FormDialogField[] = FIELDS.map((f) =>
  f.key === "id" ? { ...f, readOnly: true } : f,
);

interface DialogState {
  open: boolean;
  editing: AdminRecord | null;
}

export default function Categories() {
  const [data, setData] = useState<AdminRecord[]>([]);
  const [dialog, setDialog] = useState<DialogState>({ open: false, editing: null });

  const load = useCallback(() => {
    getCategories()
      .then((cats) => setData((cats ?? []) as AdminRecord[]))
      .catch((e: Error) => toast.error(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(formData: Record<string, unknown>) {
    try {
      const payload = {
        ...formData,
        sortOrder: parseInt(String(formData.sortOrder)) || 0,
      };
      const id = dialog.editing ? dialog.editing.id : (formData.id as string);
      await upsertCategory(id, payload);
      toast.success(dialog.editing ? "Category updated" : "Category created");
      setDialog({ open: false, editing: null });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(row: AdminRecord) {
    if (!confirm(`Delete category "${row.name}"?`)) return;
    try {
      await deleteCategory(row.id);
      toast.success("Category deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => setDialog({ open: true, editing: null })}>
          + New Category
        </Button>
      </div>

      <DataTable<AdminRecord>
        columns={COLUMNS}
        data={data}
        total={data.length}
        actions={(row) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialog({ open: true, editing: row })}
            >
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
