import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FormDialog({ open, onOpenChange, title, fields, initialData, onSubmit }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      for (const f of fields) {
        init[f.key] = initialData?.[f.key] ?? f.defaultValue ?? "";
      }
      setForm(init);
    }
  }, [open, initialData, fields]);

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = { ...form };
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
                  value={form[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
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
                        <option key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt}>
                          {typeof opt === "object" ? opt.label : opt}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              ) : (
                <Input
                  type={f.type || "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
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
