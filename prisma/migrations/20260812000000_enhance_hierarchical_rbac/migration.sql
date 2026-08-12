-- Migration: Enhance Hierarchical RBAC System
-- Created: 2026-08-12
-- Description: Add support for hierarchical permissions, role inheritance, and enhanced module access control

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Update Permission Model
-- ============================================================================

-- Add action column to Permission table
ALTER TABLE "Permission" 
ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT 'view';

-- Create index on action column
CREATE INDEX IF NOT EXISTS "Permission_action_idx" ON "Permission"("action");

-- Update existing permissions to use structured action format
UPDATE "Permission" SET "action" = 
  CASE 
    WHEN "key" LIKE '%:read' THEN 'view'
    WHEN "key" LIKE '%:create' THEN 'create'
    WHEN "key" LIKE '%:update' THEN 'update'
    WHEN "key" LIKE '%:delete' THEN 'delete'
    WHEN "key" LIKE '%:list' THEN 'view'
    ELSE 'view'
  END
WHERE "action" = 'view';

-- ============================================================================
-- 2. Update Role Model for Hierarchy
-- ============================================================================

-- Add hierarchy support columns to Role table
ALTER TABLE "Role" 
ADD COLUMN IF NOT EXISTS "permissionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "inheritsFromId" TEXT,
ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 0;

-- Create index on inheritsFromId
CREATE INDEX IF NOT EXISTS "Role_inheritsFromId_idx" ON "Role"("inheritsFromId");

-- Add foreign key constraint for self-referencing hierarchy
ALTER TABLE "Role" 
ADD CONSTRAINT "Role_inheritsFromId_fkey" 
FOREIGN KEY ("inheritsFromId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 3. Create RolePermission Junction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

-- Create indexes for RolePermission
CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");
CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- Add foreign key constraints
ALTER TABLE "RolePermission" 
ADD CONSTRAINT "RolePermission_roleId_fkey" 
FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission" 
ADD CONSTRAINT "RolePermission_permissionId_fkey" 
FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- 4. Update User Model for Permission Caching
-- ============================================================================

-- Add permission tracking columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "permissionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "effectivePermissions" JSONB,
ADD COLUMN IF NOT EXISTS "lastPermissionCalculation" TIMESTAMP(3);

-- ============================================================================
-- 5. Create PermissionDelegation Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "PermissionDelegation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "delegatedBy" TEXT NOT NULL,
    "delegatedTo" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "reason" TEXT
);

-- Create indexes for PermissionDelegation
CREATE INDEX IF NOT EXISTS "PermissionDelegation_organizationId_idx" ON "PermissionDelegation"("organizationId");
CREATE INDEX IF NOT EXISTS "PermissionDelegation_delegatedBy_idx" ON "PermissionDelegation"("delegatedBy");
CREATE INDEX IF NOT EXISTS "PermissionDelegation_delegatedTo_idx" ON "PermissionDelegation"("delegatedTo");
CREATE INDEX IF NOT EXISTS "PermissionDelegation_permissionId_idx" ON "PermissionDelegation"("permissionId");

-- ============================================================================
-- 6. Update OrganizationModel for Permission Pool
-- ============================================================================

-- Add permission pool columns to Organization table
ALTER TABLE "Organization" 
ADD COLUMN IF NOT EXISTS "permissionPool" JSONB,
ADD COLUMN IF NOT EXISTS "roleHierarchyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "maxRoleDepth" INTEGER NOT NULL DEFAULT 5;

-- ============================================================================
-- 7. Update OrganizationModule for Enhanced Access Control
-- ============================================================================

-- Add access control columns to OrganizationModule table
ALTER TABLE "OrganizationModule" 
ADD COLUMN IF NOT EXISTS "grantedBy" TEXT,
ADD COLUMN IF NOT EXISTS "permissionSet" JSONB;

-- ============================================================================
-- 8. Create Default System Permissions
-- ============================================================================

-- Insert structured system permissions for each module
INSERT INTO "Permission" ("id", "organizationId", "key", "module", "action", "label", "description", "category", "isSystem", "createdAt", "updatedAt")
VALUES 
  -- Lead Module Permissions
  (gen_random_uuid(), NULL, 'leads.view', 'leads', 'view', 'View Leads', 'View and list leads', 'leads', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'leads.create', 'leads', 'create', 'Create Leads', 'Create new leads', 'leads', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'leads.update', 'leads', 'update', 'Update Leads', 'Update existing leads', 'leads', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'leads.delete', 'leads', 'delete', 'Delete Leads', 'Delete leads', 'leads', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'leads.export', 'leads', 'export', 'Export Leads', 'Export lead data', 'leads', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'leads.import', 'leads', 'import', 'Import Leads', 'Import lead data', 'leads', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Customer Module Permissions
  (gen_random_uuid(), NULL, 'customers.view', 'customers', 'view', 'View Customers', 'View and list customers', 'customers', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'customers.create', 'customers', 'create', 'Create Customers', 'Create new customers', 'customers', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'customers.update', 'customers', 'update', 'Update Customers', 'Update existing customers', 'customers', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'customers.delete', 'customers', 'delete', 'Delete Customers', 'Delete customers', 'customers', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'customers.export', 'customers', 'export', 'Export Customers', 'Export customer data', 'customers', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Project Module Permissions
  (gen_random_uuid(), NULL, 'projects.view', 'projects', 'view', 'View Projects', 'View and list projects', 'projects', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'projects.create', 'projects', 'create', 'Create Projects', 'Create new projects', 'projects', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'projects.update', 'projects', 'update', 'Update Projects', 'Update existing projects', 'projects', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'projects.delete', 'projects', 'delete', 'Delete Projects', 'Delete projects', 'projects', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'projects.manage', 'projects', 'manage', 'Manage Projects', 'Full project management access', 'projects', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Inventory Module Permissions
  (gen_random_uuid(), NULL, 'inventory.view', 'inventory', 'view', 'View Inventory', 'View inventory items', 'inventory', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'inventory.create', 'inventory', 'create', 'Create Inventory', 'Create inventory items', 'inventory', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'inventory.update', 'inventory', 'update', 'Update Inventory', 'Update inventory items', 'inventory', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'inventory.delete', 'inventory', 'delete', 'Delete Inventory', 'Delete inventory items', 'inventory', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'inventory.manage', 'inventory', 'manage', 'Manage Inventory', 'Full inventory management access', 'inventory', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Purchase Order Module Permissions
  (gen_random_uuid(), NULL, 'purchase_orders.view', 'purchase_orders', 'view', 'View Purchase Orders', 'View purchase orders', 'purchase_orders', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'purchase_orders.create', 'purchase_orders', 'create', 'Create Purchase Orders', 'Create purchase orders', 'purchase_orders', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'purchase_orders.update', 'purchase_orders', 'update', 'Update Purchase Orders', 'Update purchase orders', 'purchase_orders', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'purchase_orders.delete', 'purchase_orders', 'delete', 'Delete Purchase Orders', 'Delete purchase orders', 'purchase_orders', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'purchase_orders.approve', 'purchase_orders', 'approve', 'Approve Purchase Orders', 'Approve purchase orders', 'purchase_orders', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- User Management Permissions
  (gen_random_uuid(), NULL, 'users.view', 'users', 'view', 'View Users', 'View and list users', 'users', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'users.create', 'users', 'create', 'Create Users', 'Create new users', 'users', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'users.update', 'users', 'update', 'Update Users', 'Update existing users', 'users', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'users.delete', 'users', 'delete', 'Delete Users', 'Delete users', 'users', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'users.manage', 'users', 'manage', 'Manage Users', 'Full user management access', 'users', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Role Management Permissions
  (gen_random_uuid(), NULL, 'roles.view', 'roles', 'view', 'View Roles', 'View and list roles', 'roles', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'roles.create', 'roles', 'create', 'Create Roles', 'Create new roles', 'roles', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'roles.update', 'roles', 'update', 'Update Roles', 'Update existing roles', 'roles', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'roles.delete', 'roles', 'delete', 'Delete Roles', 'Delete roles', 'roles', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'roles.manage', 'roles', 'manage', 'Manage Roles', 'Full role management access', 'roles', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Organization Management Permissions
  (gen_random_uuid(), NULL, 'organization.view', 'organization', 'view', 'View Organization', 'View organization details', 'organization', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'organization.update', 'organization', 'update', 'Update Organization', 'Update organization details', 'organization', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'organization.manage', 'organization', 'manage', 'Manage Organization', 'Full organization management access', 'organization', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Task Management Permissions
  (gen_random_uuid(), NULL, 'tasks.view', 'tasks', 'view', 'View Tasks', 'View and list tasks', 'tasks', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'tasks.create', 'tasks', 'create', 'Create Tasks', 'Create new tasks', 'tasks', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'tasks.update', 'tasks', 'update', 'Update Tasks', 'Update existing tasks', 'tasks', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'tasks.delete', 'tasks', 'delete', 'Delete Tasks', 'Delete tasks', 'tasks', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'tasks.manage', 'tasks', 'manage', 'Manage Tasks', 'Full task management access', 'tasks', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Report and Analytics Permissions
  (gen_random_uuid(), NULL, 'reports.view', 'reports', 'view', 'View Reports', 'View reports and analytics', 'reports', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'reports.export', 'reports', 'export', 'Export Reports', 'Export report data', 'reports', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'reports.manage', 'reports', 'manage', 'Manage Reports', 'Full report management access', 'reports', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("organizationId", "key") DO NOTHING;

-- ============================================================================
-- 9. Migrate Existing Role Permissions to New Structure
-- ============================================================================

-- Create a mapping from old permission keys to new structured keys
-- This will be used to migrate existing role permissions
-- Note: This is a simplified migration - actual implementation may need adjustment

-- ============================================================================
-- 10. Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE "RolePermission" IS 'Junction table for explicit role-permission mapping with audit trail';
COMMENT ON TABLE "PermissionDelegation" IS 'Tracks permission delegation between users with expiration and revocation support';
COMMENT ON COLUMN "Role"."inheritsFromId" IS 'Parent role ID for hierarchical permission inheritance';
COMMENT ON COLUMN "Role"."level" IS 'Hierarchy level for role depth control';
COMMENT ON COLUMN "User"."permissionVersion" IS 'Version tracking for permission cache invalidation';
COMMENT ON COLUMN "User"."effectivePermissions" IS 'Cached calculated permissions for performance';
COMMENT ON COLUMN "Organization"."permissionPool" IS 'Pool of permissions delegated by Super Admin to Tenant Admin';
COMMENT ON COLUMN "Organization"."maxRoleDepth" IS 'Maximum allowed depth for role hierarchy';
COMMENT ON COLUMN "OrganizationModule"."grantedBy" IS 'Super Admin who granted this module access';
COMMENT ON COLUMN "OrganizationModule"."permissionSet" IS 'Specific permissions granted for this module';

-- ============================================================================
-- Migration Complete
-- ============================================================================