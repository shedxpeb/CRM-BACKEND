/**
 * Deploy-time schema sync using prisma migrate deploy for production safety.
 * This ensures only reviewed migrations are applied in production.
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { stdio: 'inherit', shell: true });
}

// Production should always use migrate deploy for safety
const migrate = run('npx', ['prisma', 'migrate', 'deploy']);
if (migrate.status === 0) {
  process.exit(0);
}

console.error(
  'prisma migrate deploy failed. This indicates a migration issue that must be resolved manually. ' +
    'Ensure all migrations are properly created and committed before deployment.',
);

process.exit(1);
