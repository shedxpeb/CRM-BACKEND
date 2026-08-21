-- Migration: Add user_roles table
-- Created: 2026-08-21
-- Description: The UserRole join table (user ↔ role ↔ organization) was defined
-- in the Prisma schema but never created by any prior migration. This caused
-- "The table 'public.UserRole' does not exist" errors when the Super Admin
-- backend attempted CRM tenant provisioning.
--
-- The PostgreSQL enum type "UserRole" (created in the baseline migration) is
-- separate from this table and must remain untouched.
-- Prisma model: UserRoleAssignment @@map("user_roles")

CREATE TABLE IF NOT EXISTS "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "user_roles_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "user_roles_roleId_fkey"
        FOREIGN KEY ("roleId")
        REFERENCES "Role"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "user_roles_organizationId_fkey"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Unique constraint: one assignment per user+role+org
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_userId_roleId_organizationId_key"
    ON "user_roles"("userId", "roleId", "organizationId");

-- Performance indexes
CREATE INDEX IF NOT EXISTS "user_roles_userId_idx"
    ON "user_roles"("userId");

CREATE INDEX IF NOT EXISTS "user_roles_roleId_idx"
    ON "user_roles"("roleId");

CREATE INDEX IF NOT EXISTS "user_roles_organizationId_idx"
    ON "user_roles"("organizationId");
