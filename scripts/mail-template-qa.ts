/**
 * Quick sanity checks for deliverability rules (no SMTP send).
 * Run: node --experimental-strip-types is not needed — use ts-node or compile.
 * Invoked via: npx ts-node -r tsconfig-paths/register scripts/mail-template-qa.ts
 */
import { buildMailTemplate, MailTemplateId, minifyHtml } from '../src/mail/template.engine';
import { buildMailHeaders, buildMessageId } from '../src/mail/mail.headers';

const brand = {
  companyName: 'Acme Steel',
  companyLogo: '',
  primaryColor: '#0F766E',
  supportEmail: 'help@acme.example',
  website: 'https://acme.example',
  address: '12 Industrial Road',
  phone: '+91 90000 00000',
  year: 2026,
};

const samples: Array<{ id: MailTemplateId; vars: Record<string, string> }> = [
  { id: 'register_otp', vars: { userName: 'Alex', otp: '482913', expiry: '10 minutes' } },
  { id: 'forgot_password_otp', vars: { userName: 'Alex', otp: '119922', expiry: '10 minutes' } },
  { id: 'welcome', vars: { userName: 'Alex', loginLink: 'https://acme.example/login' } },
  { id: 'reset_password_success', vars: { userName: 'Alex' } },
  { id: 'password_changed', vars: { userName: 'Alex' } },
  { id: 'email_verification', vars: { userName: 'Alex', otp: '334455', expiry: '10 minutes' } },
  { id: 'invitation', vars: { userName: 'Alex', inviteLink: 'https://acme.example/invite' } },
  { id: 'organization_invitation', vars: { userName: 'Alex', inviteLink: 'https://acme.example/invite' } },
  { id: 'magic_login', vars: { userName: 'Alex', magicLink: 'https://acme.example/magic', expiry: '15 minutes' } },
  { id: 'account_locked', vars: { userName: 'Alex', resetLink: 'https://acme.example/reset' } },
  { id: 'account_unlocked', vars: { userName: 'Alex' } },
  { id: 'session_alert', vars: { userName: 'Alex', alertMessage: 'A new device signed in.', device: 'Chrome', ipAddress: '1.2.3.4', timestamp: '2026-07-16' } },
  { id: 'security_alert', vars: { userName: 'Alex', alertMessage: 'A new device signed in.', device: 'Chrome', ipAddress: '1.2.3.4', timestamp: '2026-07-16' } },
];

let failed = 0;
for (const sample of samples) {
  const built = buildMailTemplate(sample.id, { ...brand, ...sample.vars });
  const checks: string[] = [];
  if (!built.text?.trim()) checks.push('missing plain text');
  if (!built.html?.trim()) checks.push('missing html');
  if (!built.subject?.trim()) checks.push('missing subject');
  if (/!!!|URGENT|FREE MONEY|ACT NOW/i.test(built.subject + built.text)) checks.push('spammy phrasing');
  if (/<script/i.test(built.html)) checks.push('script tag');
  if (/@import|googleapis|fonts\./i.test(built.html)) checks.push('external font');
  if (built.html.includes('PEB CRM') && brand.companyName !== 'PEB CRM') checks.push('hardcoded brand');
  const min = minifyHtml(built.html);
  if (min.length > 12000) checks.push(`html too large (${min.length})`);
  if (!built.html.includes('multipart') && !built.text) checks.push('no text part source');

  if (checks.length) {
    failed++;
    console.error(`FAIL ${sample.id}: ${checks.join(', ')}`);
  } else {
    console.log(`OK   ${sample.id} — subject="${built.subject}" html=${min.length}b text=${built.text.length}b`);
  }
}

const mid = buildMessageId('noreply@acme.example');
const headers = buildMailHeaders({
  fromName: 'Acme Steel',
  fromEmail: 'noreply@acme.example',
  to: 'user@example.com',
  replyTo: 'help@acme.example',
  subject: 'Test',
  appName: 'Acme Steel',
});
if (!mid.includes('@acme.example') || !headers['Message-ID'] || !headers['Reply-To']) {
  failed++;
  console.error('FAIL headers');
} else {
  console.log('OK   headers Message-ID + Reply-To');
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nMail template QA passed');
