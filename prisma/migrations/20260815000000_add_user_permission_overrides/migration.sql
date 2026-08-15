-- Migration: Add user-level permission override system
-- Description: UserPermission (granted/denied overrides) + UserModuleAccess
-- (user-level module narrowing) on top of role-based permissions.
-- Effective = role perms + granted user perms - denied user perms.

-- UserPermission: per-user grant/deny override
CREATE TABLE IF NOT EXISTS "UserPermission" (
    "id"             TEXT      NOT NULL,
    "userId"         TEXT      NOT NULL,
    "permissionKey"  TEXT      NOT NULL,
    "granted"        BOOLEAN   NOT NULL DEFAULT true,
    "organizationId" TEXT      NOT NULL,
    "createdById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_userId_permissionKey_organizationId_key"
    ON "UserPermission"("userId", "permissionKey", "organizationId");

CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");
CREATE INDEX IF NOT EXISTS "UserPermission_permissionKey_idx" ON "UserPermission"("permissionKey");
CREATE INDEX IF NOT EXISTS "UserPermission_organizationId_idx" ON "UserPermission"("organizationId");

ALTER TABLE "UserPermission"
    ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserModuleAccess: per-user module narrowing/widening
CREATE TABLE IF NOT EXISTS "UserModuleAccess" (
    "id"             TEXT      NOT NULL,
    "userId"         TEXT      NOT NULL,
    "moduleKey"      TEXT      NOT NULL,
    "allowed"        BOOLEAN   NOT NULL DEFAULT true,
    "organizationId" TEXT      NOT NULL,
    "createdById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModuleAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserModuleAccess_userId_moduleKey_organizationId_key"
    ON "UserModuleAccess"("userId", "moduleKey", "organizationId");

CREATE INDEX IF NOT EXISTS "UserModuleAccess_userId_idx" ON "UserModuleAccess"("userId");
CREATE INDEX IF NOT EXISTS "UserModuleAccess_moduleKey_idx" ON "UserModuleAccess"("moduleKey");
CREATE INDEX IF NOT EXISTS "UserModuleAccess_organizationId_idx" ON "UserModuleAccess"("organizationId");

ALTER TABLE "UserModuleAccess"
    ADD CONSTRAINT "UserModuleAccess_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
