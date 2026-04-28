/** Allowed values for public.customers.business_type (TEXT or enum-aligned). */

/**
 * @param {unknown} input
 * @returns {'cabaret'|'fuzoku'|'garuba'|null}
 */
export function normalizeBusinessTypeForDb(input) {
  const v = input === undefined || input === null ? '' : String(input).trim();
  if (v === 'cabaret' || v === 'fuzoku' || v === 'garuba') return v;
  return null;
}
