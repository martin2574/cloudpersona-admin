import Ajv from "ajv";

const ajv = new Ajv({ strict: false, allErrors: true });

export interface ValidationError {
  layer: 1 | 2;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface Spec {
  jsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

/**
 * jsonSchema에서 모든 property 이름을 수집 (임의 깊이 dependencies/oneOf/anyOf/allOf 재귀)
 */
function collectAllPropertyNames(jsonSchema: unknown): Set<string> {
  const names = new Set<string>();
  walk(jsonSchema);
  return names;

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.properties && typeof n.properties === "object") {
      for (const [key, value] of Object.entries(n.properties as Record<string, unknown>)) {
        names.add(key);
        walk(value);
      }
    }
    if (n.dependencies && typeof n.dependencies === "object") {
      for (const dep of Object.values(n.dependencies as Record<string, unknown>)) {
        walk(dep);
      }
    }
    for (const keyword of ["oneOf", "anyOf", "allOf"] as const) {
      const arr = n[keyword];
      if (Array.isArray(arr)) {
        for (const branch of arr) walk(branch);
      }
    }
  }
}

/**
 * 템플릿 spec 검증 (Layer 1 + Layer 2)
 */
export function validateSpec(spec: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Layer 2: 구조 검증 (Layer 1보다 먼저 — jsonSchema 없으면 Layer 1 불가)
  if (!spec || typeof spec !== "object") {
    errors.push({ layer: 2, field: "spec", message: "spec must be an object" });
    return { valid: false, errors };
  }

  const s = spec as Record<string, unknown>;

  if (!s.jsonSchema || typeof s.jsonSchema !== "object") {
    errors.push({
      layer: 2,
      field: "jsonSchema",
      message: "jsonSchema is required and must be an object",
    });
  }

  if (!s.uiSchema || typeof s.uiSchema !== "object") {
    errors.push({
      layer: 2,
      field: "uiSchema",
      message: "uiSchema is required and must be an object",
    });
  }

  // jsonSchema 없으면 Layer 1 스킵
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const jsonSchema = s.jsonSchema as Record<string, unknown>;
  const uiSchema = s.uiSchema as Record<string, unknown>;

  // Layer 1: 메타스키마 검증 (JSON Schema Draft-07)
  const isValidSchema = ajv.validateSchema(jsonSchema);
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
  if (jsonSchema.type !== "object") {
    errors.push({
      layer: 2,
      field: "jsonSchema.type",
      message: 'jsonSchema.type must be "object"',
    });
  }

  // uiSchema 필드가 jsonSchema properties에 대응하는지 검증 (dependencies/oneOf 포함)
  const allProps = collectAllPropertyNames(jsonSchema);
  if (allProps.size > 0) {
    const RJSF_META_KEYS = new Set(["definitions", "dependencies"]);
    for (const uiKey of Object.keys(uiSchema)) {
      if (uiKey.startsWith("ui:")) continue; // ui:order 등 글로벌 옵션 스킵
      if (RJSF_META_KEYS.has(uiKey)) continue; // RJSF/FormBuilder 예약 키 스킵
      if (!allProps.has(uiKey)) {
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
