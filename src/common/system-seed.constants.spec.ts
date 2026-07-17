import { describe, expect, it } from '@jest/globals';
import {
  EVENT_RULES,
  LEAD_PIPELINE,
  PROJECT_PIPELINE,
  SYSTEM_ROLE_DEFS,
} from './system-seed.constants';

describe('system-seed.constants', () => {
  it('event rule target statuses exist in pipelines', () => {
    const leadStatuses = new Set(LEAD_PIPELINE.map((s) => s.status));
    const projectStatuses = new Set(PROJECT_PIPELINE.map((s) => s.status));

    for (const rule of EVENT_RULES.lead) {
      if (rule.fromStatus) expect(leadStatuses.has(rule.fromStatus)).toBe(true);
      expect(leadStatuses.has(rule.toStatus)).toBe(true);
    }
    for (const rule of EVENT_RULES.project) {
      if (rule.fromStatus) expect(projectStatuses.has(rule.fromStatus)).toBe(true);
      expect(projectStatuses.has(rule.toStatus)).toBe(true);
    }
  });

  it('admin role includes restore permissions', () => {
    const admin = SYSTEM_ROLE_DEFS.find((r) => r.name === 'Admin');
    expect(admin?.permissions).toEqual(
      expect.arrayContaining(['lead:restore', 'customer:restore', 'project:restore']),
    );
  });
});
