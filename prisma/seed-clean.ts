/**
 * @deprecated Use `npm run seed:reset` — forwards to clean system-only reset.
 */
import { execSync } from 'node:child_process';

console.warn('seed:clean is deprecated — running seed:reset instead');
execSync('npx ts-node prisma/seed-reset.ts', { stdio: 'inherit', cwd: __dirname + '/..' });
