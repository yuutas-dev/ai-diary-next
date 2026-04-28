/**
 * API /api/customers/create 用 — 許可フィールドのみ（camelCase で API と契約／Supabase は API 側で snake にマップ）
 *
 * @param {{ userId: string, newName: string, newTags: unknown, businessType?: unknown }} raw
 */
export function buildCustomersCreatePayload(raw) {
  const userId = raw != null && typeof raw.userId === 'string' ? raw.userId.trim() : '';
  const newName = raw != null && typeof raw.newName === 'string' ? raw.newName.trim() : '';
  const bt = raw != null ? raw.businessType : undefined;
  return {
    userId,
    newName,
    newTags: raw != null ? raw.newTags : [],
    ...(bt !== undefined && bt !== null && String(bt).trim()
      ? { businessType: String(bt).trim() }
      : {}),
  };
}

/**
 * API /api/customers/update 用 — 許可フィールドのみ
 *
 * @param {{ userId: string, customerId: string, newName: string, newTags: unknown, businessType?: unknown }} raw
 */
export function buildCustomersUpdatePayload(raw) {
  const customerId =
    raw != null && typeof raw.customerId === 'string'
      ? raw.customerId.trim()
      : '';
  const payload = buildCustomersCreatePayload(raw);
  return {
    ...payload,
    customerId,
  };
}
