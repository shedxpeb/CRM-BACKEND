/**
 * Deploy-time schema sync without rewriting historical migrations.
 * Prefer migrate deploy when history is complete; fall back to db push so
 * production schema matches prisma/schema.prisma (env-driven hosts only).
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { stdio: 'inherit', shell: true });
}

const preferPush = process.env.PRISMA_DEPLOY_MODE === 'push';

if (preferPush) {
  const push = run('npx', ['prisma', 'db', 'push', '--skip-generate']);
  process.exit(push.status ?? 1);
}

const migrate = run('npx', ['prisma', 'migrate', 'deploy']);
if (migrate.status === 0) {
  process.exit(0);
}

console.warn(
  'prisma migrate deploy failed — schema migrations are behind the Prisma schema. ' +
    'Falling back to prisma db push. Set PRISMA_DEPLOY_MODE=push explicitly once validated, ' +
    'and create a baseline migration for long-term production.',
);

const push = run('npx', ['prisma', 'db', 'push', '--skip-generate']);
process.exit(push.status ?? 1);
