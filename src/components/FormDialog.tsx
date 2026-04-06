import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FormDialogFieldOption {
  value: string;
  label: string;
}

export interface FormDialogField {
  key: string;
  label: string;
  type?: "text" | "number" | "password" | "email" | "select" | "boolean";
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<string | FormDialogFieldOption>;
}

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormDialogField[];
  initialData?: Record<string, unknown> | null;
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialData,
  onSubmit,
}: FormDialogProps) {
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, unknown> = {};
      for (const f of fields) {
        init[f.key] = initialData?.[f.key] ?? f.defaultValue ?? "";
      }
      setForm(init);
    }
  }, [open, initialData, fields]);

  function handleChange(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data: Record<string, unknown> = { ...form };
    // boolean 변환
    for (const f of fields) {
      if (f.type === "boolean") {
        data[f.key] = data[f.key] === "true" || data[f.key] === true;
      }
    }
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium mb-1 block">{f.label}</label>
              {f.type === "select" || f.type === "boolean" ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(form[f.key] as string) ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange(f.key, e.target.value)}
                  required={f.required}
                  disabled={f.readOnly}
                >
                  {f.type === "boolean" ? (
                    <>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </>
                  ) : (
                    <>
                      <option value="">Select...</option>
                      {(f.options || []).map((opt) => (
                        <option
                          key={typeof opt === "object" ? opt.value : opt}
                          value={typeof opt === "object" ? opt.value : opt}
                        >
                          {typeof opt === "object" ? opt.label : opt}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              ) : (
                <Input
                  type={f.type || "text"}
                  value={(form[f.key] as string) ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(f.key, e.target.value)}
                  required={f.required}
                  disabled={f.readOnly}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
