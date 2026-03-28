import Ajv from "ajv";

const ajv = new Ajv({ strict: false, allErrors: true });

/**
 * 템플릿 spec 검증 (Layer 1 + Layer 2)
 * @param {object} spec - { jsonSchema, uiSchema }
 * @returns {{ valid: boolean, errors: Array<{ layer: 1|2, field: string, message: string }> }}
 */
export function validateSpec(spec) {
  const errors = [];

  // Layer 2: 구조 검증 (Layer 1보다 먼저 — jsonSchema 없으면 Layer 1 불가)
  if (!spec || typeof spec !== "object") {
    errors.push({ layer: 2, field: "spec", message: "spec must be an object" });
    return { valid: false, errors };
  }

  if (!spec.jsonSchema || typeof spec.jsonSchema !== "object") {
    errors.push({ layer: 2, field: "jsonSchema", message: "jsonSchema is required and must be an object" });
  }

  if (!spec.uiSchema || typeof spec.uiSchema !== "object") {
    errors.push({ layer: 2, field: "uiSchema", message: "uiSchema is required and must be an object" });
  }

  // jsonSchema 없으면 Layer 1 스킵
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Layer 1: 메타스키마 검증 (JSON Schema Draft-07)
  const isValidSchema = ajv.validateSchema(spec.jsonSchema);
  if (!isValidSchema) {
    for (const err of ajv.errors || []) {
      errors.push({
        layer: 1,
        field: err.instancePath || "jsonSchema",
        message: err.message || "Invalid JSON Schema",
      });
    }
  }

  // Layer 2: 데이터 유효성
  if (spec.jsonSchema.type !== "object") {
    errors.push({ layer: 2, field: "jsonSchema.type", message: 'jsonSchema.type must be "object"' });
  }

  // uiSchema 필드가 jsonSchema.properties에 대응하는지 검증
  if (spec.jsonSchema.properties && typeof spec.jsonSchema.properties === "object") {
    const schemaProps = Object.keys(spec.jsonSchema.properties);
    for (const uiKey of Object.keys(spec.uiSchema)) {
      if (uiKey.startsWith("ui:")) continue; // ui:order 등 글로벌 옵션 스킵
      if (!schemaProps.includes(uiKey)) {
        errors.push({
          layer: 2,
          field: `uiSchema.${uiKey}`,
          message: `uiSchema field "${uiKey}" has no matching jsonSchema property`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
