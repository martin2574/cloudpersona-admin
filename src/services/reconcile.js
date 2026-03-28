/**
 * Reconciliation 서비스
 *
 * Backoffice DB(source) ↔ API Server(target) 템플릿 동기화.
 * - dry-run: diff만 계산, API Server 변경 없음
 * - execute: diff 계산 후 FK 순서대로 PUT upsert
 */

// 비교 대상 필드 (timestamps 제외)
const COMPARE_FIELDS = {
  categories: ["name", "icon", "sortOrder"],
  connectionTemplates: [
    "serviceType", "name", "description", "version",
    "categoryId", "icon", "spec", "deprecatedAt",
  ],
  skillTemplates: [
    "skillType", "name", "description", "version",
    "categoryId", "connectionTemplateId", "icon", "spec", "deprecatedAt",
  ],
};

// PUT body 구성 필드 (id 제외 — URL path에 포함)
const UPSERT_FIELDS = {
  categories: ["name", "icon", "sortOrder"],
  connectionTemplates: [
    "serviceType", "name", "description", "version",
    "categoryId", "icon", "spec", "deprecatedAt",
  ],
  skillTemplates: [
    "skillType", "name", "description", "version",
    "categoryId", "connectionTemplateId", "icon", "spec", "deprecatedAt",
  ],
};

/**
 * 두 값의 동등성 비교.
 * - JSON(object): JSON.stringify 비교
 * - Date: ISO string 변환 후 비교
 * - null/undefined: 동일 취급
 */
function isEqual(a, b) {
  const na = a === undefined ? null : a;
  const nb = b === undefined ? null : b;

  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;

  // Date → ISO string
  const va = na instanceof Date ? na.toISOString() : na;
  const vb = nb instanceof Date ? nb.toISOString() : nb;

  // object → JSON string
  if (typeof va === "object" && typeof vb === "object") {
    return JSON.stringify(va) === JSON.stringify(vb);
  }

  return va === vb;
}

/**
 * 리소스 1종 diff 계산
 */
function diffResource(sourceItems, targetItems, fields) {
  const targetMap = new Map(targetItems.map((item) => [item.id, item]));
  const create = [];
  const update = [];
  const skip = [];

  for (const src of sourceItems) {
    const tgt = targetMap.get(src.id);
    if (!tgt) {
      create.push(src);
      continue;
    }

    const changedFields = fields.filter((f) => !isEqual(src[f], tgt[f]));
    if (changedFields.length > 0) {
      update.push({ ...src, _changedFields: changedFields });
    } else {
      skip.push({ id: src.id, name: src.name });
    }
  }

  // Target에만 있는 항목 = delete 대상
  const sourceIds = new Set(sourceItems.map((item) => item.id));
  const del = targetItems.filter((item) => !sourceIds.has(item.id));

  return { create, update, skip, delete: del };
}

/**
 * PUT body 구성 — Backoffice 레코드에서 upsert 필드만 추출
 */
function buildUpsertBody(item, fields) {
  const body = {};
  for (const f of fields) {
    let val = item[f];
    if (val instanceof Date) val = val.toISOString();
    if (val !== undefined) body[f] = val;
  }
  return body;
}

/**
 * API Server에서 리소스 목록 조회
 */
async function fetchTarget(apiServerUrl, adminSecret, resource) {
  const qs = resource !== "categories" ? "?includeDeprecated=true" : "";
  const url = `${apiServerUrl}/api/internal/admin/${resource}${qs}`;
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });
  if (!resp.ok) {
    throw new Error(`API Server GET /${resource} failed: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * API Server에 PUT upsert
 */
async function upsertTarget(apiServerUrl, adminSecret, resource, id, body) {
  const url = `${apiServerUrl}/api/internal/admin/${resource}/${id}`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PUT /${resource}/${id} failed: ${resp.status} — ${text}`);
  }
  return resp.json();
}

/**
 * API Server에서 리소스 삭제
 */
async function deleteTarget(apiServerUrl, adminSecret, resource, id) {
  const url = `${apiServerUrl}/api/internal/admin/${resource}/${id}`;
  const resp = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DELETE /${resource}/${id} failed: ${resp.status} — ${text}`);
  }
}

/**
 * Reconciliation 메인 함수
 *
 * @param {import("@yourq/prisma-backoffice").PrismaClient} db - Backoffice Prisma
 * @param {{ apiServerUrl: string, adminSecret: string, mode: "dry-run"|"execute" }} opts
 */
export async function reconcile(db, { apiServerUrl, adminSecret, mode }) {
  // 1. Backoffice 데이터 조회 (source)
  const [srcCategories, srcConnections, srcSkills] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.connectionTemplate.findMany({ orderBy: { name: "asc" } }),
    db.skillTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  // 2. API Server 데이터 조회 (target)
  const [tgtCategories, tgtConnections, tgtSkills] = await Promise.all([
    fetchTarget(apiServerUrl, adminSecret, "categories"),
    fetchTarget(apiServerUrl, adminSecret, "connection-templates"),
    fetchTarget(apiServerUrl, adminSecret, "skill-templates"),
  ]);

  // 3. Diff 계산
  const diff = {
    categories: diffResource(srcCategories, tgtCategories, COMPARE_FIELDS.categories),
    connectionTemplates: diffResource(srcConnections, tgtConnections, COMPARE_FIELDS.connectionTemplates),
    skillTemplates: diffResource(srcSkills, tgtSkills, COMPARE_FIELDS.skillTemplates),
  };

  const summary = {};
  for (const [key, d] of Object.entries(diff)) {
    summary[key] = { create: d.create.length, update: d.update.length, skip: d.skip.length, delete: d.delete.length };
  }

  // dry-run: diff만 반환
  if (mode === "dry-run") {
    return { mode: "dry-run", diff, summary };
  }

  // 4. Execute: FK 순서대로 upsert (categories → connectionTemplates → skillTemplates)
  const RESOURCE_ORDER = [
    { key: "categories", resource: "categories", fields: UPSERT_FIELDS.categories },
    { key: "connectionTemplates", resource: "connection-templates", fields: UPSERT_FIELDS.connectionTemplates },
    { key: "skillTemplates", resource: "skill-templates", fields: UPSERT_FIELDS.skillTemplates },
  ];

  const results = { categories: [], connectionTemplates: [], skillTemplates: [] };
  let stopped = false;

  for (const { key, resource, fields } of RESOURCE_ORDER) {
    if (stopped) break;

    const toSync = [...diff[key].create, ...diff[key].update];
    for (const item of toSync) {
      try {
        const body = buildUpsertBody(item, fields);
        await upsertTarget(apiServerUrl, adminSecret, resource, item.id, body);
        results[key].push({
          id: item.id,
          name: item.name,
          action: diff[key].create.includes(item) ? "create" : "update",
          success: true,
        });
      } catch (err) {
        results[key].push({
          id: item.id,
          name: item.name,
          action: "failed",
          success: false,
          error: err.message,
        });
        stopped = true;
        break;
      }
    }
  }

  // 5. Delete: FK 역순 (skillTemplates → connectionTemplates → categories)
  const DELETE_ORDER = [
    { key: "skillTemplates", resource: "skill-templates" },
    { key: "connectionTemplates", resource: "connection-templates" },
    { key: "categories", resource: "categories" },
  ];

  for (const { key, resource } of DELETE_ORDER) {
    if (stopped) break;
    for (const item of diff[key].delete) {
      try {
        await deleteTarget(apiServerUrl, adminSecret, resource, item.id);
        results[key].push({ id: item.id, name: item.name, action: "delete", success: true });
      } catch (err) {
        results[key].push({ id: item.id, name: item.name, action: "delete", success: false, error: err.message });
        stopped = true;
        break;
      }
    }
  }

  const executeSummary = {};
  for (const [key, items] of Object.entries(results)) {
    executeSummary[key] = {
      success: items.filter((i) => i.success).length,
      failed: items.filter((i) => !i.success).length,
    };
  }

  return { mode: "execute", results, summary: executeSummary, stopped };
}
