/**
 * Module key normalization.
 *
 * Canonical module keys are SINGULAR to match the permission prefix format
 * used across the codebase (`customer` <-> `customer:list`). Legacy
 * provisioning (org bootstrap, SUPER-ADMIN tenant sync) historically wrote
 * PLURAL keys (`customers`, `leads`, ...) into `OrganizationModule.moduleKey`.
 *
 * `normalizeModuleKey()` canonicalizes any stored key to its singular form so
 * guard lookups and permission filtering work regardless of what format a row
 * was written in.
 */

const MODULE_KEY_ALIASES: Record<string, string[]> = {
  dashboard: [],
  lead: ['leads'],
  customer: ['customers'],
  project: ['projects'],
  'item-master': ['item-masters'],
  inventory: ['inventories'],
  vendor: ['vendors'],
  'purchase-order': ['purchase-orders', 'purchases'],
  task: ['tasks'],
  user: ['users'],
  role: ['roles'],
  organization: ['organizations'],
  tracking: [],
  document: ['documents'],
  report: ['reports'],
  warehouse: ['warehouses'],
  system: ['systems'],
};

/** Canonical (singular) module key for a stored key, tolerating legacy plural forms. */
export function normalizeModuleKey(key: string): string {
  const k = (key || '').toLowerCase().trim();
  if (!k) return key;
  for (const [canonical, aliases] of Object.entries(MODULE_KEY_ALIASES)) {
    if (k === canonical || aliases.includes(k)) return canonical;
  }
  return k;
}

/** Legacy plural aliases for a canonical (singular) module key. */
export function getModuleKeyAliases(canonical: string): string[] {
  return MODULE_KEY_ALIASES[normalizeModuleKey(canonical)] || [];
}
