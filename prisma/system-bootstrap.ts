/**
 * Idempotent system bootstrap for one organization:
 * roles, status pipelines, event rules.
 */
import { PrismaClient } from '@prisma/client';
import {
  CUSTOMER_PIPELINE,
  EVENT_RULES,
  LEAD_PIPELINE,
  PROJECT_PIPELINE,
  SYSTEM_ROLE_DEFS,
} from '../src/common/system-seed.constants';

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>;

export async function upsertSystemRoles(
  db: Tx,
  organizationId: string,
  createdById?: string | null,
) {
  for (const role of SYSTEM_ROLE_DEFS) {
    const existing = await db.role.findFirst({
      where: { organizationId, name: role.name },
    });
    if (existing) {
      await db.role.update({
        where: { id: existing.id },
        data: { permissions: [...role.permissions], isSystem: true },
      });
    } else {
      await db.role.create({
        data: {
          organizationId,
          name: role.name,
          permissions: [...role.permissions],
          isSystem: true,
          createdById: createdById || undefined,
        },
      });
    }
  }
}

export async function replacePipelines(db: Tx, organizationId: string) {
  await db.statusPipeline.deleteMany({ where: { organizationId } });
  const rows = [
    ...LEAD_PIPELINE.map((s) => ({ ...s, entityType: 'lead', organizationId })),
    ...CUSTOMER_PIPELINE.map((s) => ({ ...s, entityType: 'customer', organizationId })),
    ...PROJECT_PIPELINE.map((s) => ({ ...s, entityType: 'project', organizationId })),
  ];
  await db.statusPipeline.createMany({ data: rows });
  return rows.length;
}

export async function replaceEventRules(db: Tx, organizationId: string) {
  await db.eventRule.deleteMany({ where: { organizationId } });
  let total = 0;
  for (const [entityType, rules] of Object.entries(EVENT_RULES)) {
    for (const rule of rules) {
      await db.eventRule.create({
        data: {
          organizationId,
          entityType,
          eventType: rule.eventType,
          fromStatus: rule.fromStatus,
          toStatus: rule.toStatus,
          isActive: true,
        },
      });
      total++;
    }
  }
  return total;
}

export async function bootstrapOrganizationSystem(
  db: Tx,
  organizationId: string,
  createdById?: string | null,
) {
  await upsertSystemRoles(db, organizationId, createdById);
  const pipelineCount = await replacePipelines(db, organizationId);
  const ruleCount = await replaceEventRules(db, organizationId);
  return { pipelineCount, ruleCount };
}
