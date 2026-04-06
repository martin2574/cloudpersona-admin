import { useState, useRef } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema, WidgetProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import "@/styles/rjsf-styles.css";

export interface SpecPreviewProps {
  jsonSchema: RJSFSchema;
  uiSchema: Record<string, unknown>;
}

// Admin Preview용 placeholder — 미등록 커스텀 위젯을 대신 표시
function PlaceholderWidget({ schema, options }: WidgetProps) {
  const label = (options?.serviceType as string) || schema?.title || "custom";
  return (
    <div className="border border-dashed rounded-md p-3 text-sm text-muted-foreground bg-muted/20">
      Custom widget: <span className="font-mono">{label}</span>
      <p className="text-xs mt-1">Console에서 실제 위젯으로 렌더링됩니다.</p>
    </div>
  );
}

// uiSchema에서 사용된 커스텀 위젯 이름을 수집하여 placeholder로 매핑
function buildPlaceholderWidgets(
  uiSchema: Record<string, unknown> | undefined,
): Record<string, typeof PlaceholderWidget> {
  const builtIn = new Set([
    "text",
    "textarea",
    "password",
    "email",
    "uri",
    "color",
    "date",
    "datetime",
    "alt-date",
    "alt-datetime",
    "file",
    "select",
    "radio",
    "range",
    "hidden",
    "checkbox",
    "checkboxes",
    "updown",
  ]);
  const widgets: Record<string, typeof PlaceholderWidget> = {};
  for (const key of Object.keys(uiSchema || {})) {
    const entry = (uiSchema?.[key] ?? {}) as Record<string, unknown>;
    const widget = entry["ui:widget"];
    if (widget && typeof widget === "string" && !builtIn.has(widget)) {
      widgets[widget] = PlaceholderWidget;
    }
  }
  return widgets;
}

export default function SpecPreview({ jsonSchema, uiSchema }: SpecPreviewProps) {
  const [formData, setFormData] = useState<unknown>({});
  const [liveValidate, setLiveValidate] = useState(false);
  const formRef = useRef<Form>(null);

  const hasProperties =
    jsonSchema?.properties && Object.keys(jsonSchema.properties).length > 0;

  function handleValidate() {
    setLiveValidate(true);
    formRef.current?.submit();
  }

  function handleChange(e: { formData?: unknown }) {
    if (e.formData !== undefined) setFormData(e.formData);
  }

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Form Preview</h3>
          {hasProperties && (
            <Button variant="outline" size="sm" onClick={handleValidate}>
              Validate
            </Button>
          )}
        </div>
        {hasProperties ? (
          <div className="rjsf-wrapper">
            <Form
              ref={formRef}
              schema={jsonSchema}
              uiSchema={{ ...uiSchema, "ui:submitButtonOptions": { norender: true } }}
              formData={formData}
              validator={validator}
              widgets={buildPlaceholderWidgets(uiSchema)}
              onChange={handleChange}
              onError={() => {}}
              liveValidate={liveValidate}
              noHtml5Validate
              omitExtraData
              liveOmit
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No properties defined. Add fields in the Edit tab.
          </p>
        )}
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Result JSON</h3>
        <pre className="text-xs font-mono bg-muted/30 rounded-md p-3 overflow-auto max-h-96">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
