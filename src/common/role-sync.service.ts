import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { upsertSystemRoles } from './system-bootstrap';

/**
 * Role Sync Service
 *
 * Keeps every organization's system roles (Owner / Admin / Employee) aligned
 * with SYSTEM_ROLE_DEFS on every application start. This prevents permission
 * drift when the canonical role definitions are updated (e.g. a new module or
 * permission is added) but existing organizations were provisioned earlier.
 *
 * Custom (non-system) roles created by tenants are left untouched — only the
 * well-known system role names are created/updated.
 */
@Injectable()
export class RoleSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const organizations = await this.prisma.organization.findMany({
        where: { isDeleted: false },
        select: { id: true, name: true },
      });

      let changed = false;
      for (const org of organizations) {
        changed = (await upsertSystemRoles(this.prisma, org.id)) || changed;
      }

      if (changed) {
        // Role permissions changed: drop the per-user effective-permission cache
        // (PermissionInheritanceService caches for 5 minutes) so the next request
        // recomputes from the freshly synced role rows instead of serving stale data.
        await this.prisma.user.updateMany({
          where: {},
          data: { lastPermissionCalculation: null, effectivePermissions: null as any },
        });
      }

      this.logger.log(
        `System role sync complete for ${organizations.length} organization(s)` +
          (changed ? ' (permissions changed; user permission cache cleared)' : ' (no drift)'),
      );
    } catch (error) {
      // Never take the application down because a sync failed; log and continue.
      // The next restart (or a manual seed-system run) will retry the sync.
      this.logger.error(
        `System role sync failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
