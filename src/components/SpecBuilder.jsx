import { useState, useCallback } from "react";
import { FormBuilder } from "@ginkgo-bioworks/react-json-schema-form-builder";
import { validateSpec } from "@/lib/schema-validator";

export default function SpecBuilder({ jsonSchema, uiSchema, onChange }) {
  // FormBuilder 내부용 (FormBuilder 자체 포맷 유지)
  const [fbSchema, setFbSchema] = useState(JSON.stringify(jsonSchema));
  const [fbUiSchema, setFbUiSchema] = useState(JSON.stringify(uiSchema));
  // Raw JSON textarea 표시용 (pretty-print)
  const [rawSchema, setRawSchema] = useState(JSON.stringify(jsonSchema, null, 2));
  const [rawUiSchema, setRawUiSchema] = useState(JSON.stringify(uiSchema, null, 2));
  const [errors, setErrors] = useState([]);

  const handleFormBuilderChange = useCallback(
    (newSchema, newUiSchema) => {
      setFbSchema(newSchema);
      setFbUiSchema(newUiSchema);
      try {
        const parsed = JSON.parse(newSchema);
        const parsedUi = JSON.parse(newUiSchema);
        setRawSchema(JSON.stringify(parsed, null, 2));
        setRawUiSchema(JSON.stringify(parsedUi, null, 2));
        const result = validateSpec({ jsonSchema: parsed, uiSchema: parsedUi });
        setErrors(result.errors);
        onChange(parsed, parsedUi);
      } catch {
        // FormBuilder 중간 상태일 수 있음
      }
    },
    [onChange],
  );

  function handleRawChange(field, value) {
    if (field === "jsonSchema") setRawSchema(value);
    else setRawUiSchema(value);

    try {
      const js = field === "jsonSchema" ? JSON.parse(value) : JSON.parse(rawSchema);
      const ui = field === "uiSchema" ? JSON.parse(value) : JSON.parse(rawUiSchema);
      setFbSchema(JSON.stringify(js));
      setFbUiSchema(JSON.stringify(ui));
      const result = validateSpec({ jsonSchema: js, uiSchema: ui });
      setErrors(result.errors);
      onChange(js, ui);
    } catch {
      setErrors([{ layer: 0, field, message: "Invalid JSON" }]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 border rounded-lg p-4">
          <FormBuilder
            schema={fbSchema}
            uischema={fbUiSchema}
            onChange={handleFormBuilderChange}
          />
        </div>

        <div className="col-span-1 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">JSON Schema</label>
            <textarea
              className="w-full h-64 font-mono text-xs border rounded-md p-2 bg-muted/30"
              value={rawSchema}
              onChange={(e) => handleRawChange("jsonSchema", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">UI Schema</label>
            <textarea
              className="w-full h-64 font-mono text-xs border rounded-md p-2 bg-muted/30"
              value={rawUiSchema}
              onChange={(e) => handleRawChange("uiSchema", e.target.value)}
            />
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive mb-1">Validation Errors</p>
          <ul className="text-xs text-destructive space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>Layer {e.layer}: [{e.field}] {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
