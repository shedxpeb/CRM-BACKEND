import { describe, expect, it } from '@jest/globals';
import { buildMailTemplate } from './template.engine';

describe('template.engine', () => {
  const brand = {
    companyName: 'Test Co',
    primaryColor: '#0F766E',
    supportEmail: 'help@test.co',
    website: 'https://test.co',
    year: 2026,
  };

  it('always returns html and plain text for OTP', () => {
    const built = buildMailTemplate('register_otp', {
      ...brand,
      userName: 'Alex',
      otp: '123456',
      expiry: '10 minutes',
    });
    expect(built.text.trim().length).toBeGreaterThan(20);
    expect(built.html).toContain('123456');
    expect(built.subject).toContain('Test Co');
  });
});
