/**
 * Centralized Permission Constants
 *
 * Single source of truth for all permission strings.
 * Use these constants instead of hardcoded strings to ensure consistency.
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',

  // Lead
  LEAD_LIST: 'lead:list',
  LEAD_READ: 'lead:read',
  LEAD_CREATE: 'lead:create',
  LEAD_UPDATE: 'lead:update',
  LEAD_DELETE: 'lead:delete',
  LEAD_RESTORE: 'lead:restore',

  // Customer
  CUSTOMER_LIST: 'customer:list',
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',
  CUSTOMER_RESTORE: 'customer:restore',

  // Project
  PROJECT_LIST: 'project:list',
  PROJECT_READ: 'project:read',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_RESTORE: 'project:restore',

  // Item Master
  ITEM_MASTER_LIST: 'item-master:list',
  ITEM_MASTER_READ: 'item-master:read',
  ITEM_MASTER_CREATE: 'item-master:create',
  ITEM_MASTER_UPDATE: 'item-master:update',
  ITEM_MASTER_DELETE: 'item-master:delete',

  // Inventory
  INVENTORY_LIST: 'inventory:list',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_DELETE: 'inventory:delete',

  // Vendor
  VENDOR_LIST: 'vendor:list',
  VENDOR_READ: 'vendor:read',
  VENDOR_CREATE: 'vendor:create',
  VENDOR_UPDATE: 'vendor:update',
  VENDOR_DELETE: 'vendor:delete',

  // Purchase Order
  PURCHASE_ORDER_LIST: 'purchase-order:list',
  PURCHASE_ORDER_READ: 'purchase-order:read',
  PURCHASE_ORDER_CREATE: 'purchase-order:create',
  PURCHASE_ORDER_UPDATE: 'purchase-order:update',
  PURCHASE_ORDER_DELETE: 'purchase-order:delete',
  PURCHASE_ORDER_APPROVE: 'purchase-order:approve',

  // User
  USER_LIST: 'user:list',
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Role
  ROLE_LIST: 'role:list',
  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // Organization
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_UPDATE: 'organization:update',
  ORGANIZATION_LIST: 'organization:list',
  ORGANIZATION_CREATE: 'organization:create',
  ORGANIZATION_DELETE: 'organization:delete',

  // Tracking
  TRACKING_READ: 'tracking:read',
  TRACKING_UPDATE: 'tracking:update',

  // Document
  DOCUMENT_LIST: 'document:list',

  // Task
  TASK_LIST: 'task:list',
  TASK_READ: 'task:read',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',

  // System
  SYSTEM_READ: 'system:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
